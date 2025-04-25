import React, { useState, useEffect } from "react";
import Web3 from "web3";
import JobBoard from "./contract/JobBoard.json";
import "./App.css";

const CONTRACT_ADDRESS = "0x6B42fb9D0F43259FDD76c7c63E15274949eF8966";

function App() {
  const [userRole, setUserRole] = useState(null);

  if (!userRole) {
    return (
      <div className="role-selection">
        <h1>Welcome to Decentralized Job Board</h1>
        <h2>Select Your Role</h2>
        <div className="role-options">
          <div className="role-card employer-card" onClick={() => setUserRole('employer')}>
            <h3>Employer</h3>
            <p>Post jobs and manage contracts</p>
          </div>
          <div className="role-card freelancer-card" onClick={() => setUserRole('freelancer')}>
            <h3>Freelancer</h3>
            <p>Find and apply for jobs</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {userRole === 'employer' ? (
        <EmployerDashboard />
      ) : (
        <FreelancerDashboard />
      )}
    </div>
  );
}

// Employer Dashboard
function EmployerDashboard() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobBudget, setNewJobBudget] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [escrowAmount, setEscrowAmount] = useState("");
  const [newJobDescription, setNewJobDescription] = useState("");

  useEffect(() => {
    if (contract && account) {
      loadJobs();
    }
  }, [contract, account]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3Instance = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3Instance.eth.getAccounts();
        setAccount(accounts[0]);
        setWeb3(web3Instance);

        const contractInstance = new web3Instance.eth.Contract(
          JobBoard.abi,
          CONTRACT_ADDRESS
        );
        setContract(contractInstance);
      } catch (error) {
        setError(`Connection error: ${error.message}`);
      }
    } else {
      setError("Please install MetaMask!");
    }
  };
  const loadJobs = async () => {
    if (!contract) return;

    setLoading(true);
    try {
      const count = Number(await contract.methods.getJobCount().call());
      const jobsArray = [];

      for (let i = 0; i < count; i++) {
        const job = await contract.methods.getJob(i).call();
        if (job.employer === account) {  // Only show jobs posted by this employer
          const escrowed = await contract.methods.getEscrowed(i).call();
          jobsArray.push({
            id: i,
            title: job.title,
            description: job.description || "N/A", // Default to "N/A" if empty
            budget: web3.utils.fromWei(job.budget.toString(), 'ether'),
            status: job.status.toString(),
            escrowed: web3.utils.fromWei(escrowed.toString(), 'ether'),
            freelancer: job.freelancer
          });
        }
      }
      setJobs(jobsArray);
    } catch (error) {
      setError(`Error loading jobs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const postJob = async () => {
    if (!contract || !newJobTitle || !newJobBudget) return;

    try {
      setLoading(true);
      const budgetInWei = web3.utils.toWei(newJobBudget, 'ether');
      const description = newJobDescription.trim() || "N/A"; // Default to "N/A" if empty

      await contract.methods.postJob(newJobTitle, description, budgetInWei)
        .send({ from: account, gas: 500000 });

      loadJobs();
      setNewJobTitle("");
      setNewJobDescription("");
      setNewJobBudget("");
    } catch (error) {
      setError(`Failed to post job: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const escrowFunds = async () => {
    if (!contract || !selectedJobId || !escrowAmount) return;

    try {
      setLoading(true);
      const amountInWei = web3.utils.toWei(escrowAmount, 'ether');

      await contract.methods.escrowFunds(selectedJobId).send({
        from: account,
        value: amountInWei
      });

      loadJobs();
      setSelectedJobId("");
      setEscrowAmount("");
    } catch (error) {
      setError("Failed to escrow funds");
    } finally {
      setLoading(false);
    }
  };

  const releasePayment = async (jobId) => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      setError("");

      // Additional check (though contract should enforce this)
      const job = await contract.methods.getJob(jobId).call();
      if (job.employer.toLowerCase() !== account.toLowerCase()) {
        throw new Error("Only the job poster can release payment");
      }

      await contract.methods.releasePayment(jobId).send({ from: account });
      loadJobs();
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
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

  const openJobs = jobs.filter(job => job.status === "0");
  const assignedJobs = jobs.filter(job => job.status === "1");
  const completedJobs = jobs.filter(job => job.status === "2");

  return (
    <div className="dashboard employer-dashboard">
      <header className="dashboard-header">
        <h1>Employer Dashboard</h1>
        {account ? (
          <div className="wallet-info">
            <span className="wallet-address">Connected: {account.substring(0, 6)}...{account.substring(38)}</span>
            <button className="refresh-btn" onClick={loadJobs}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        ) : (
          <button className="connect-btn" onClick={connectWallet}>
            <i className="fas fa-plug"></i> Connect Wallet
          </button>
        )}
      </header>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing transaction...</p>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}

      {!account ? (
        <div className="connect-prompt">
          <p>Please connect your wallet to continue</p>
        </div>
      ) : (
        <div className="dashboard-content">
          <div className="post-job-section card">
            <h2>Post New Job</h2>
            <div className="form-group">
              <input
                type="text"
                placeholder="Job Title"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                disabled={loading}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <textarea
                placeholder="Job Description"
                value={newJobDescription}
                onChange={(e) => setNewJobDescription(e.target.value)}
                disabled={loading}
                className="form-input"
                rows={4}
              />
            </div>
            <div className="form-group">
              <input
                type="number"
                placeholder="Budget in ETH"
                value={newJobBudget}
                onChange={(e) => setNewJobBudget(e.target.value)}
                disabled={loading}
                min="0"
                step="0.01"
                className="form-input"
              />
            </div>
            <button
              onClick={postJob}
              className="primary-btn"
              disabled={loading || !newJobTitle || !newJobBudget}
            >
              Post Job
            </button>
          </div>

          <div className="jobs-section">
            <div className="job-count-display">
              <h2>Jobs you posted: <span className="count">{jobs.length}</span></h2>
              <div className="job-count-breakdown">
                <span>Open: {openJobs.length}</span><br></br>
                <span>Assigned: {assignedJobs.length}</span><br></br>
                <span>Completed: {completedJobs.length}</span>
              </div>
            </div>

            <div className="job-category">
              <h3 className="category-title">Open Jobs</h3>
              {openJobs.length === 0 ? (
                <p className="no-jobs">No open jobs</p>
              ) : (
                <div className="job-list">
                  {openJobs.map(job => (
                    <div key={job.id} className="job-card open-job">
                      <div className="job-header">
                        <h4>{job.title}</h4>
                        <span className={`status-badge ${job.status === "0" ? 'open' : ''}`}>
                          {getStatusText(job.status)}
                        </span>
                      </div>
                      <div className="job-details">
                        <p><span className="detail-label">Description:</span> {job.description}</p>
                        <p><span className="detail-label">Budget:</span> {job.budget} ETH</p>
                        <p><span className="detail-label">Escrowed:</span> {job.escrowed} ETH</p>
                      </div>

                      <div className="escrow-section">
                        <input
                          type="number"
                          placeholder="ETH to escrow"
                          value={job.id === Number(selectedJobId) ? escrowAmount : ''}
                          onChange={(e) => {
                            setSelectedJobId(job.id);
                            setEscrowAmount(e.target.value);
                          }}
                          disabled={loading}
                          className="escrow-input"
                        />
                        <button
                          onClick={() => escrowFunds()}
                          disabled={loading || !escrowAmount}
                          className="secondary-btn"
                        >
                          Escrow Funds
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="job-category">
              <h3 className="category-title">Assigned Jobs</h3>
              {assignedJobs.length === 0 ? (
                <p className="no-jobs">No assigned jobs</p>
              ) : (
                <div className="job-list">
                  {assignedJobs.map(job => (
                    <div key={job.id} className="job-card assigned-job">
                      <div className="job-header">
                        <h4>{job.title}</h4>
                        <span className="status-badge assigned">{getStatusText(job.status)}</span>
                      </div>
                      <div className="job-details">
                        <p><span className="detail-label">Budget:</span> {job.budget} ETH</p>
                        <p><span className="detail-label">Freelancer:</span> {job.freelancer.substring(0, 6)}...</p>
                        <p><span className="detail-label">Escrowed:</span> {job.escrowed} ETH</p>
                      </div>

                      <div className="job-actions">
                        <button
                          onClick={() => releasePayment(job.id)}
                          disabled={loading}
                          className="primary-btn"
                        >
                          Release Payment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="job-category">
              <h3 className="category-title">Completed Jobs</h3>
              {completedJobs.length === 0 ? (
                <p className="no-jobs">No completed jobs</p>
              ) : (
                <div className="job-list">
                  {completedJobs.map(job => (
                    <div key={job.id} className="job-card completed-job">
                      <div className="job-header">
                        <h4>{job.title}</h4>
                        <span className="status-badge completed">{getStatusText(job.status)}</span>
                      </div>
                      <div className="job-details">
                        <p><span className="detail-label">Budget:</span> {job.budget} ETH</p>
                        <p><span className="detail-label">Freelancer:</span> {job.freelancer.substring(0, 6)}...</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Freelancer Dashboard
function FreelancerDashboard() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (contract && account) {
      loadJobs();
    }
  }, [contract, account]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3Instance = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3Instance.eth.getAccounts();
        setAccount(accounts[0]);
        setWeb3(web3Instance);

        const contractInstance = new web3Instance.eth.Contract(
          JobBoard.abi,
          CONTRACT_ADDRESS
        );
        setContract(contractInstance);
      } catch (error) {
        setError(`Connection error: ${error.message}`);
        setTimeout(() => setError(""), 5000);
      }
    } else {
      setError("Please install MetaMask!");
      setTimeout(() => setError(""), 5000);
    }
  };

  const loadJobs = async () => {
    if (!contract) return;

    setLoading(true);
    try {
      const count = Number(await contract.methods.getJobCount().call());
      const jobsArray = [];

      for (let i = 0; i < count; i++) {
        const job = await contract.methods.getJob(i).call();
        const escrowed = await contract.methods.getEscrowed(i).call();

        jobsArray.push({
          id: i,
          title: job.title,
          budget: web3.utils.fromWei(job.budget.toString(), 'ether'),
          status: job.status.toString(),
          escrowed: web3.utils.fromWei(escrowed.toString(), 'ether'),
          employer: job.employer,
          freelancer: job.freelancer,
          isApplied: job.freelancer === account
        });
      }
      setJobs(jobsArray);
    } catch (error) {
      setError(`Error loading jobs: ${error.message}`);
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const applyForJob = async (jobId) => {
    if (!contract) return;

    try {
      setLoading(true);
      setError("");

      // Check if funds are escrowed first
      const escrowed = await contract.methods.getEscrowed(jobId).call();
      if (Number(escrowed) === 0) {
        throw new Error("Cannot apply - no funds escrowed for this job");
      }

      await contract.methods.applyForJob(jobId).send({ from: account });
      loadJobs();
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
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

  const availableJobs = jobs.filter(job =>
    job.status === "0" && job.freelancer !== account
  );
  const myAssignedJobs = jobs.filter(job =>
    job.freelancer === account && job.status === "1"
  );
  const completedJobs = jobs.filter(job =>
    job.status === "2" && job.freelancer === account
  );

  return (
    <div className="dashboard freelancer-dashboard">
      <header className="dashboard-header">
        <h1>Freelancer Dashboard</h1>
        {account ? (
          <div className="wallet-info">
            <span className="wallet-address">Connected: {account.substring(0, 6)}...{account.substring(38)}</span>
            <button className="refresh-btn" onClick={loadJobs}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        ) : (
          <button className="connect-btn" onClick={connectWallet}>
            <i className="fas fa-plug"></i> Connect Wallet
          </button>
        )}
      </header>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing transaction...</p>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}

      {!account ? (
        <div className="connect-prompt">
          <p>Please connect your wallet to continue</p>
        </div>
      ) : (
        <div className="dashboard-content">
          <div className="jobs-section">
            <div className="job-count-display">
              <h2>Total Jobs Available: <span className="count">{availableJobs.length}</span></h2>
            </div>

            <div className="job-category">
              <h3 className="category-title">Available Jobs</h3>
              {availableJobs.length === 0 ? (
                <p className="no-jobs">No available jobs currently</p>
              ) : (
                <div className="job-list">
                  {availableJobs.map(job => (
                    <div key={job.id} className="job-card available-job">
                      <div className="job-header">
                        <h4>{job.title}</h4>
                        <span className="status-badge open">{getStatusText(job.status)}</span>
                      </div>
                      <div className="job-details">
                        <p><span className="detail-label">Budget:</span> {job.budget} ETH</p>
                        <p><span className="detail-label">Posted by:</span> {job.employer.substring(0, 6)}...</p>
                        <p><span className="detail-label">Escrowed:</span> {job.escrowed} ETH</p>
                      </div>
                      <button
                        onClick={() => applyForJob(job.id)}
                        disabled={loading}
                        className="primary-btn"
                      >
                        Apply for Job
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="job-category">
              <h3 className="category-title">My Assigned Jobs</h3>
              {myAssignedJobs.length === 0 ? (
                <p className="no-jobs">No assigned jobs</p>
              ) : (
                <div className="job-list">
                  {myAssignedJobs.map(job => (
                    <div key={job.id} className="job-card my-job">
                      <div className="job-header">
                        <h4>{job.title}</h4>
                        <span className="status-badge assigned">{getStatusText(job.status)}</span>
                      </div>
                      <div className="job-details">
                        <p><span className="detail-label">Budget:</span> {job.budget} ETH</p>
                        <p><span className="detail-label">Posted by:</span> {job.employer.substring(0, 6)}...</p>
                        <p><span className="detail-label">Escrowed:</span> {job.escrowed} ETH</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="job-category">
              <h3 className="category-title">My Completed Jobs</h3>
              {completedJobs.length === 0 ? (
                <p className="no-jobs">No completed jobs</p>
              ) : (
                <div className="job-list">
                  {completedJobs.map(job => (
                    <div key={job.id} className="job-card completed-job">
                      <div className="job-header">
                        <h4>{job.title}</h4>
                        <span className="status-badge completed">{getStatusText(job.status)}</span>
                      </div>
                      <div className="job-details">
                        <p><span className="detail-label">Budget:</span> {job.budget} ETH</p>
                        <p><span className="detail-label">Posted by:</span> {job.employer.substring(0, 6)}...</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
