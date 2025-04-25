import React, { useEffect, useState } from "react";
import Web3 from "web3";
import JobBoard from "./contract/JobBoard.json";
import "./App.css";

const CONTRACT_ADDRESS = "0x6B42fb9D0F43259FDD76c7c63E15274949eF8966";

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobBudget, setNewJobBudget] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [escrowAmount, setEscrowAmount] = useState("");
  const [error, setError] = useState("");

  // Connect Wallet with Web3
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3Instance = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        
        const chainId = await web3Instance.eth.getChainId();
        const chainIdNumber = Number(chainId);
        console.log("Chain ID:", chainIdNumber);
        
        if (chainIdNumber !== 1337) {
          alert('Please connect to localhost:8545 (chainId 1337)');
          return;
        }
        
        const accounts = await web3Instance.eth.getAccounts();
        setAccount(accounts[0]);
        setWeb3(web3Instance);
  
        if (!JobBoard.abi) {
          throw new Error("ABI not loaded correctly");
        }
        
        const contractInstance = new web3Instance.eth.Contract(
          JobBoard.abi,
          CONTRACT_ADDRESS
        );
        setContract(contractInstance);
        
        try {
          const testCount = await contractInstance.methods.getJobCount().call();
          console.log("Contract connection test successful. Job count:", testCount);
        } catch (testError) {
          console.error("Contract test failed:", testError);
          throw new Error(Contract test failed: ${testError.message});
        }
        
        window.ethereum.on('accountsChanged', (newAccounts) => {
          setAccount(newAccounts[0] || null);
        });
        
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      } catch (error) {
        console.error("Error connecting wallet:", error);
        setError(Connection error: ${error.message});
      }
    } else {
      setError("Please install MetaMask or another Web3 provider!");
    }
  };
  useEffect(() => {
    const loadJobs = async () => {
      if (!contract || !web3) return;
      
      setLoading(true);
      setError("");
      
      try {
        const count = Number(await contract.methods.getJobCount().call());
        const jobsArray = [];
        
        for (let i = 0; i < count; i++) {
          try {
            const job = await contract.methods.getJob(i).call();
            const escrowed = await contract.methods.getEscrowed(i).call();
            
            jobsArray.push({
              id: i,
              title: job.title,
              budget: web3.utils.fromWei(job.budget.toString(), 'ether'),
              employer: job.employer,
              freelancer: job.freelancer,
              status: job.status.toString(), // Convert enum to string
              escrowed: web3.utils.fromWei(escrowed.toString(), 'ether')
            });
          } catch (jobError) {
            console.error(Error loading job ${i}:, jobError);
            continue;
          }
        }
        
        setJobs(jobsArray);
      } catch (error) {
        console.error("Error loading jobs:", error);
        setError(Error loading jobs: ${error.message});
      } finally {
        setLoading(false);
      }
    };
    
    loadJobs();
  }, [web3, contract]);

  // Post Job - Fixed with proper BigInt handling
  const postJob = async () => {
    if (!contract || !newJobTitle || !newJobBudget) {
      setError("Please fill all fields and ensure contract is loaded");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      // Convert budget to wei and ensure it's a string
      const budgetInWei = web3.utils.toWei(newJobBudget, 'ether');
      
      // Send transaction
      const receipt = await contract.methods
        .postJob(newJobTitle, budgetInWei)
        .send({ 
          from: account,
          gas: 500000
        });
      
      if (receipt.status) {
        // Refresh jobs list
        const count = Number(await contract.methods.getJobCount().call());
        const newJob = await contract.methods.getJob(count - 1).call();
        const escrowed = await contract.methods.getEscrowed(count - 1).call();
        
        setJobs(prevJobs => [...prevJobs, {
          id: count - 1,
          title: newJob.title,
          budget: newJobBudget,
          employer: newJob.employer,
          freelancer: newJob.freelancer,
          status: newJob.status.toString(),
          escrowed: web3.utils.fromWei(escrowed.toString(), 'ether')
        }]);
        
        setNewJobTitle("");
        setNewJobBudget("");
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error("Error posting job:", error);
      setError(Failed to post job: ${error.message});
    } finally {
      setLoading(false);
    }
  };

  // Apply for Job - Updated
  const applyForJob = async (jobId) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      await contract.methods.applyForJob(jobId).send({ from: account });
      
      // Optimistic update
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === jobId ? {
          ...job,
          freelancer: account,
          status: "1" // Assigned
        } : job
      ));
    } catch (error) {
      console.error("Error applying for job:", error);
      setError("Failed to apply for job");
    } finally {
      setLoading(false);
    }
  };

  // Escrow Funds - Updated
  const escrowFunds = async () => {
    if (!contract || !selectedJobId || !escrowAmount) return;
    
    try {
      setLoading(true);
      const amountInWei = web3.utils.toWei(escrowAmount, 'ether');
      
      await contract.methods.escrowFunds(selectedJobId).send({
        from: account,
        value: amountInWei
      });
      
      // Optimistic update
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === Number(selectedJobId) ? {
          ...job,
          escrowed: escrowAmount
        } : job
      ));
      
      setSelectedJobId("");
      setEscrowAmount("");
    } catch (error) {
      console.error("Error escrowing funds:", error);
      setError("Failed to escrow funds");
    } finally {
      setLoading(false);
    }
  };

  // Release Payment - Updated
  const releasePayment = async (jobId) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      await contract.methods.releasePayment(jobId).send({ from: account });
      
      // Optimistic update
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === jobId ? {
          ...job,
          status: "2", // Completed
          escrowed: "0"
        } : job
      ));
    } catch (error) {
      console.error("Error releasing payment:", error);
      setError("Failed to release payment");
    } finally {
      setLoading(false);
    }
  };

  // Refund Employer - Updated
  const refundEmployer = async (jobId) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      await contract.methods.refundEmployer(jobId).send({ from: account });
      
      // Optimistic update
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === jobId ? {
          ...job,
          status: "0", // Open
          escrowed: "0"
        } : job
      ));
    } catch (error) {
      console.error("Error refunding employer:", error);
      setError("Failed to refund employer");
    } finally {
      setLoading(false);
    }
  };

  // Status text mapping
  const getStatusText = (status) => {
    switch (status) {
      case "0": return "Open";
      case "1": return "Assigned";
      case "2": return "Completed";
      default: return "Unknown";
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Decentralized Job Board</h1>
        <button onClick={connectWallet} className="connect-wallet">
          {account ? Connected: ${account.substring(0, 6)}...${account.substring(38)} : "Connect Wallet"}
        </button>
      </div>

      {loading && <div className="loading-overlay">Processing transaction...</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="grid-container">
        <div className="job-form">
          <h2>Post a New Job</h2>
          <div className="form-group">
            <input
              type="text"
              placeholder="Job Title"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
              className="form-control"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <input
              type="number"
              placeholder="Budget in ETH"
              value={newJobBudget}
              onChange={(e) => setNewJobBudget(e.target.value)}
              className="form-control"
              disabled={loading}
              min="0"
              step="0.01"
            />
          </div>
          <button 
            onClick={postJob} 
            className="btn" 
            disabled={loading || !newJobTitle || !newJobBudget}
          >
            {loading ? "Posting..." : "Post Job"}
          </button>

          <h2>Manage Jobs</h2>
          <div className="form-group">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="select-job"
              disabled={loading || jobs.length === 0}
            >
              <option value="">Select a Job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} (ID: {job.id})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <input
              type="number"
              placeholder="Amount to escrow in ETH"
              value={escrowAmount}
              onChange={(e) => setEscrowAmount(e.target.value)}
              className="form-control"
              disabled={loading || !selectedJobId}
              min="0"
              step="0.01"
            />
          </div>
          <button 
            onClick={escrowFunds} 
            className="btn" 
            disabled={loading || !selectedJobId || !escrowAmount}
          >
            {loading ? "Processing..." : "Escrow Funds"}
          </button>
        </div>

        <div className="job-listings">
          <h2>Available Jobs</h2>
          {jobs.length === 0 ? (
            <p>No jobs available</p>
          ) : (
            <div className="job-cards">
              {jobs.map((job) => (
                <div key={job.id} className="job-card">
                  <h3>{job.title}</h3>
                  <p><strong>Budget:</strong> {job.budget} ETH</p>
                  <p><strong>Status:</strong> {getStatusText(job.status)}</p>
                  <p><strong>Escrowed:</strong> {job.escrowed} ETH</p>
                  <p><strong>Employer:</strong> {job.employer.substring(0, 6)}...{job.employer.substring(38)}</p>
                  {job.freelancer !== "0x0000000000000000000000000000000000000000" && (
                    <p><strong>Freelancer:</strong> {job.freelancer.substring(0, 6)}...{job.freelancer.substring(38)}</p>
                  )}

                  <div className="job-actions">
                    {job.status === "0" && (
                      <button 
                        onClick={() => applyForJob(job.id)} 
                        className="btn btn-apply"
                        disabled={loading}
                      >
                        Apply for Job
                      </button>
                    )}

                    {job.status === "1" && job.employer === account && (
                      <button 
                        onClick={() => releasePayment(job.id)} 
                        className="btn btn-release"
                        disabled={loading}
                      >
                        Release Payment
                      </button>
                    )}

                    {job.status !== "2" && job.employer === account && job.escrowed !== "0" && (
                      <button 
                        onClick={() => refundEmployer(job.id)} 
                        className="btn btn-refund"
                        disabled={loading}
                      >
                        Refund Employer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
