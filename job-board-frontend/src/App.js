import React, { useEffect, useState } from "react";
import Web3 from "web3";
import JobBoard from "./contract/JobBoard.json";
import "./App.css";

const CONTRACT_ADDRESS = "0xd723fDa35ca78066499c828220379C70Bb7D3e44";

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
        
        // Check if connected to the right network
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
  
        // Initialize contract with proper ABI validation
        if (!JobBoard.abi) {
          throw new Error("ABI not loaded correctly");
        }
        
        console.log("Contract ABI:", JobBoard.abi); // Debug ABI
        
        const contractInstance = new web3Instance.eth.Contract(
          JobBoard.abi,
          CONTRACT_ADDRESS
        );
        setContract(contractInstance);
        
        // Test contract connection
        try {
          const testCount = await contractInstance.methods.getJobCount().call();
          console.log("Contract connection test successful. Job count:", testCount);
        } catch (testError) {
          console.error("Contract test failed:", testError);
          throw new Error(`Contract test failed: ${testError.message}`);
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (newAccounts) => {
          setAccount(newAccounts[0] || null);
        });
        
        // Listen for chain changes
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      } catch (error) {
        console.error("Error connecting wallet:", error);
        setError(`Connection error: ${error.message}`);
      }
    } else {
      setError("Please install MetaMask or another Web3 provider!");
    }
  };

  // Load Jobs with improved error handling
  useEffect(() => {
    const loadJobs = async () => {
      if (!contract || !web3) return;
      
      setLoading(true);
      setError("");
      
      try {
        console.log("Loading jobs...");
        const count = await contract.methods.getJobCount().call();
        console.log("Job count:", count);
        
        const jobsArray = [];
        
        for (let i = 0; i < count; i++) {
          try {
            const job = await contract.methods.getJob(i).call();
            const escrowed = await contract.methods.getEscrowed(i).call();
            
            jobsArray.push({
              id: i,
              title: job.title,
              budget: web3.utils.fromWei(job.budget, 'ether'),
              employer: job.employer,
              freelancer: job.freelancer,
              status: job.status,
              escrowed: web3.utils.fromWei(escrowed, 'ether')
            });
          } catch (jobError) {
            console.error(`Error loading job ${i}:`, jobError);
            continue;
          }
        }
        
        setJobs(jobsArray);
      } catch (error) {
        console.error("Error loading jobs:", error);
        setError(`Error loading jobs: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadJobs();
  }, [web3, contract]);

  // Post Job with improved gas handling
  const postJob = async () => {
    if (!contract || !newJobTitle || !newJobBudget) {
      setError("Please fill all fields and ensure contract is loaded");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      const budgetInWei = web3.utils.toWei(newJobBudget, 'ether');
      
      // Estimate gas with error handling
      let gasEstimate;
      try {
        gasEstimate = await contract.methods
          .postJob(newJobTitle, budgetInWei)
          .estimateGas({ from: account });
      } catch (estimateError) {
        console.error("Gas estimate failed:", estimateError);
        throw new Error(`Gas estimation failed: ${estimateError.message}`);
      }
      
      // Add 20% buffer to gas estimate
      const gasWithBuffer = Math.floor(gasEstimate * 1.2);
      
      console.log(`Posting job with ${gasWithBuffer} gas`);
      
      const receipt = await contract.methods
        .postJob(newJobTitle, budgetInWei)
        .send({ 
          from: account,
          gas: gasWithBuffer
        });
      
      if (receipt.status) {
        // Refresh jobs
        const count = await contract.methods.getJobCount().call();
        const newJob = await contract.methods.getJob(count - 1).call();
        const escrowed = await contract.methods.getEscrowed(count - 1).call();
        
        setJobs([...jobs, {
          id: count - 1,
          title: newJob.title,
          budget: newJobBudget,
          employer: newJob.employer,
          freelancer: newJob.freelancer,
          status: newJob.status,
          escrowed: web3.utils.fromWei(escrowed, 'ether')
        }]);
        
        setNewJobTitle("");
        setNewJobBudget("");
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error("Error posting job:", error);
      setError(`Failed to post job: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Apply for Job with error handling
  const applyForJob = async (jobId) => {
    if (!contract) {
      setError("Contract not loaded");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      const receipt = await contract.methods.applyForJob(jobId).send({ from: account });
      
      if (receipt.status) {
        // Update job status
        const updatedJobs = [...jobs];
        updatedJobs[jobId].freelancer = account;
        updatedJobs[jobId].status = "1"; // Assigned
        setJobs(updatedJobs);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error("Error applying for job:", error);
      setError(`Failed to apply for job: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Escrow Funds with value validation
  const escrowFunds = async () => {
    if (!contract) {
      setError("Contract not loaded");
      return;
    }
    
    if (!selectedJobId || isNaN(selectedJobId)) {
      setError("Please select a valid job");
      return;
    }
    
    if (!escrowAmount || isNaN(escrowAmount)) {
      setError("Please enter a valid amount");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      const amountInWei = web3.utils.toWei(escrowAmount, 'ether');
      
      const receipt = await contract.methods.escrowFunds(selectedJobId).send({
        from: account,
        value: amountInWei
      });
      
      if (receipt.status) {
        // Update escrowed amount
        const updatedJobs = [...jobs];
        const newEscrowed = await contract.methods.getEscrowed(selectedJobId).call();
        updatedJobs[selectedJobId].escrowed = web3.utils.fromWei(newEscrowed, 'ether');
        setJobs(updatedJobs);
        
        setSelectedJobId("");
        setEscrowAmount("");
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error("Error escrowing funds:", error);
      setError(`Failed to escrow funds: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Release Payment with confirmation
  const releasePayment = async (jobId) => {
    if (!contract) {
      setError("Contract not loaded");
      return;
    }
    
    if (!window.confirm("Are you sure you want to release payment?")) {
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      const receipt = await contract.methods.releasePayment(jobId).send({ from: account });
      
      if (receipt.status) {
        // Update job status
        const updatedJobs = [...jobs];
        updatedJobs[jobId].status = "2"; // Completed
        updatedJobs[jobId].escrowed = "0";
        setJobs(updatedJobs);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error("Error releasing payment:", error);
      setError(`Failed to release payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Refund Employer with confirmation
  const refundEmployer = async (jobId) => {
    if (!contract) {
      setError("Contract not loaded");
      return;
    }
    
    if (!window.confirm("Are you sure you want to refund the employer?")) {
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      const receipt = await contract.methods.refundEmployer(jobId).send({ from: account });
      
      if (receipt.status) {
        // Update job status
        const updatedJobs = [...jobs];
        updatedJobs[jobId].status = "0"; // Open
        updatedJobs[jobId].escrowed = "0";
        setJobs(updatedJobs);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error("Error refunding employer:", error);
      setError(`Failed to refund employer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
          {account ? `Connected: ${account.substring(0, 6)}...${account.substring(38)}` : "Connect Wallet"}
        </button>
      </div>

      {loading && <div className="loading-overlay">Processing transaction...</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="grid-container">
        {/* Left Column - Job Posting and Management */}
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

        {/* Right Column - Job Listings */}
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