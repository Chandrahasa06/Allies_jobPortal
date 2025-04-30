import React, { useState, useEffect } from "react";
import Web3 from "web3";
import JobBoard from "./contract/JobBoard.json";
import "./App.css";

const CONTRACT_ADDRESS = "0xeF248ff4ea48f1Ded53Ffc09A281Df22408b3BAD";

function App() {
  const [userRole, setUserRole] = useState(null);

  const handleDisconnect = () => {
    setUserRole(null);
  };

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
        <EmployerDashboard onDisconnect={handleDisconnect} />
      ) : (
        <FreelancerDashboard onDisconnect={handleDisconnect} />
      )}
    </div>
  );
}

function ErrorNotification({ message, onClose }) {
  const [isVisible, setIsVisible] = useState(!!message);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      setIsFading(false);
      
      const timer = setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 500);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`error-notification ${isFading ? 'hidden' : ''}`}>
      <span>{message}</span>
      <button 
        className="close-btn" 
        onClick={() => {
          setIsFading(true);
          setTimeout(() => {
            setIsVisible(false);
            onClose();
          }, 500);
        }}
      >
        &times;
      </button>
    </div>
  );
}

// Employer Dashboard
function EmployerDashboard({ onDisconnect }) {
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
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (contract && account) {
      loadJobs();
    }
  }, [contract, account]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const clearError = () => {
    setError("");
  };

  const loadJobs = async () => {
    if (!contract || !account) return;

    setLoading(true);
    try {
      const count = Number(await contract.methods.getJobCount().call());
      const jobsArray = [];

      for (let i = 0; i < count; i++) {
        const job = await contract.methods.getJob(i).call();

        if (job.employer.toLowerCase() === account.toLowerCase()) {
          const escrowed = await contract.methods.getEscrowed(i).call();

          jobsArray.push({
            id: i,
            title: job.title,
            description: job.description || "No description provided",
            budget: web3.utils.fromWei(job.budget.toString(), 'ether'),
            status: job.status.toString(),
            escrowed: web3.utils.fromWei(escrowed.toString(), 'ether'),
            employer: job.employer,
            freelancer: job.freelancer,
            isApplied: job.freelancer === account,
            deadline: Number(job.deadline),
            workCompleted: job.workCompleted,
            rating: job.rating || 0
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
      const description = newJobDescription.trim();

      await contract.methods.postJob(newJobTitle, description, budgetInWei)
        .send({ from: account, gas: 1000000 });

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

  const escrowFunds = async (jobId) => {
    if (!contract || !escrowAmount) return;

    try {
      setLoading(true);

      const job = await contract.methods.getJob(jobId).call();
      const jobBudgetEth = web3.utils.fromWei(job.budget.toString(), 'ether');

      if (escrowAmount !== jobBudgetEth) {
        throw new Error(`Escrow amount must exactly match job budget (${jobBudgetEth} ETH)`);
      }

      const amountInWei = web3.utils.toWei(escrowAmount, 'ether');

      await contract.methods.escrowFunds(jobId).send({
        from: account,
        value: amountInWei,
        gas: 500000
      });

      loadJobs();
      setEscrowAmount("");
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const releasePayment = async (jobId) => {
    if (!contract || !account || rating === 0) return;

    try {
      setLoading(true);
      setError("");

      await contract.methods.releasePayment(jobId, rating).send({ from: account });
      loadJobs();
      setRating(0);
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const refundIfDeadlinePassed = async (jobId) => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      setError("");

      await contract.methods.refundIfDeadlinePassed(jobId).send({ from: account });
      loadJobs();
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (jobId) => {
    return (
      <div className="rating-container">
        <p>Rate this freelancer:</p>
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${star <= rating ? 'filled' : ''}`}
              onClick={() => setRating(star)}
            >
              {star <= rating ? '★' : '☆'}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const getStatusText = (status) => {
    switch (status) {
      case "0": return "Open";
      case "1": return "Assigned";
      case "2": return "Completed";
      default: return "Unknown";
    }
  };

  const formatTimeLeft = (deadline) => {
    if (!deadline) return "No deadline";
    const timeLeft = deadline - currentTime;
    if (timeLeft <= 0) return "Deadline passed";
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}m ${seconds}s left`;
  };

  const openJobs = jobs.filter(job => job.status === "0");
  const assignedJobs = jobs.filter(job => job.status === "1");
  const completedJobs = jobs.filter(job => job.status === "2");

  return (
    <div className="dashboard employer-dashboard">
      <ErrorNotification message={error} onClose={clearError} />
      <header className="dashboard-header">
        <h1>Employer Dashboard</h1>
        {account ? (
          <div className="wallet-info">
            <span className="wallet-address">Connected: {account.substring(0, 6)}...{account.substring(38)}</span>
            <button className="refresh-btn" onClick={loadJobs}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            <button className="disconnect-btn" onClick={onDisconnect}>
              <i className="fas fa-sign-out-alt"></i> Disconnect
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
              <h2>Your Posted Jobs: <span className="count">{jobs.length}</span></h2>
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
                        <div className="escrow-info">
                          <p>Required escrow amount: <strong>{job.budget} ETH</strong></p>
                        </div>
                        <input
                          type="number"
                          placeholder={`Enter exactly ${job.budget} ETH`}
                          value={escrowAmount}
                          onChange={(e) => setEscrowAmount(e.target.value)}
                          disabled={loading}
                          className="escrow-input"
                          step="0.000001"
                          min="0"
                        />
                        <button
                          onClick={() => escrowFunds(job.id)}
                          disabled={loading || !escrowAmount}
                          className="secondary-btn"
                        >
                          Escrow Funds
                        </button>
                        {error && escrowAmount !== job.budget && (
                          <p className="error-text">Amount must match job budget</p>
                        )}
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
                        <p><span className="detail-label">Description:</span> {job.description}</p>
                        <p><span className="detail-label">Escrowed:</span> {job.escrowed} ETH</p>
                        <p><span className="detail-label">Deadline:</span> {formatTimeLeft(job.deadline)}</p>
                        <p><span className="detail-label">Work Completed:</span> {job.workCompleted ? "Yes" : "No"}</p>
                      </div>

                      <div className="job-actions">
                        {job.workCompleted ? (
                          <div className="release-payment-section">
                            {renderStarRating(job.id)}
                            <button
                              onClick={() => releasePayment(job.id)}
                              disabled={loading || rating === 0}
                              className="primary-btn"
                            >
                              Release Payment
                            </button>
                          </div>
                        ) : currentTime > job.deadline ? (
                          <button
                            onClick={() => refundIfDeadlinePassed(job.id)}
                            disabled={loading}
                            className="danger-btn"
                          >
                            Refund (Deadline Passed)
                          </button>
                        ) : (
                          <p>Waiting for freelancer to complete work...</p>
                        )}
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
                        <p><span className="detail-label">Description:</span> {job.description}</p>
                        <p><span className="detail-label">Escrowed:</span> {job.escrowed} ETH</p>
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
function FreelancerDashboard({ onDisconnect }) {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [freelancerRating, setFreelancerRating] = useState({
    average: 0,
    count: 0
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (contract && account) {
      loadJobs();
      loadFreelancerRating();
    }
  }, [contract, account]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const clearError = () => {
    setError("");
  };

  const loadJobs = async () => {
    if (!contract || !account) return;
  
    setLoading(true);
    try {
      const count = Number(await contract.methods.getJobCount().call());
      const jobsArray = [];
  
      for (let i = 0; i < count; i++) {
        const job = await contract.methods.getJob(i).call();
        const escrowed = await contract.methods.getEscrowed(i).call();
        
        const jobRating = job.rating ? Number(job.rating) : 0;
  
        jobsArray.push({
          id: i,
          title: job.title,
          description: job.description || "No description provided",
          budget: web3.utils.fromWei(job.budget.toString(), 'ether'),
          status: job.status.toString(),
          escrowed: web3.utils.fromWei(escrowed.toString(), 'ether'),
          employer: job.employer,
          freelancer: job.freelancer,
          isApplied: job.freelancer === account,
          deadline: Number(job.deadline),
          workCompleted: job.workCompleted,
          rating: jobRating
        });
      }
      setJobs(jobsArray);
    } catch (error) {
      setError(`Error loading jobs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyForJob = async (jobId) => {
    if (!contract) return;

    try {
      setLoading(true);
      setError("");

      const escrowed = await contract.methods.getEscrowed(jobId).call();
      if (Number(escrowed) === 0) {
        throw new Error("Cannot apply - no funds escrowed for this job");
      }

      await contract.methods.applyForJob(jobId).send({ from: account });
      loadJobs();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const completeWork = async (jobId) => {
    if (!contract) return;

    try {
      setLoading(true);
      setError("");

      await contract.methods.completeWork(jobId).send({ from: account });
      loadJobs();
    } catch (error) {
      setError(error.message);
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const loadFreelancerRating = async () => {
    if (!contract || !account) return;
    
    try {
      const ratingInfo = await contract.methods.getFreelancerRating(account).call();
      setFreelancerRating({
        average: Number(ratingInfo.averageRating),
        count: Number(ratingInfo.ratingCount)
      });
    } catch (error) {
      console.error("Error loading rating:", error);
      setFreelancerRating({
        average: 0,
        count: 0
      });
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

  const formatTimeLeft = (deadline) => {
    if (!deadline) return "No deadline";
    const timeLeft = deadline - currentTime;
    if (timeLeft <= 0) return "Deadline passed";
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}m ${seconds}s left`;
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
      <ErrorNotification message={error} onClose={clearError} />
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Freelancer Dashboard</h1>
          {account && (
            <div className="freelancer-rating">
              <div className="rating-value">{freelancerRating.average.toFixed(1)}</div>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star} 
                    className={`star ${star <= Math.round(freelancerRating.average) ? 'filled' : ''}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <div className="rating-count">({freelancerRating.count})</div>
            </div>
          )}
        </div>
        
        {account ? (
          <div className="header-right">
            <div className="freelancer-tabs">
              <button 
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                My Jobs
              </button>
              <button 
                className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
                onClick={() => setActiveTab('jobs')}
              >
                Available Jobs
              </button>
            </div>
            <span className="wallet-address">Connected: {account.substring(0, 6)}...{account.substring(38)}</span>
            <button className="refresh-btn" onClick={loadJobs}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            <button className="disconnect-btn" onClick={onDisconnect}>
              <i className="fas fa-sign-out-alt"></i> Disconnect
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

      {!account ? (
        <div className="connect-prompt">
          <p>Please connect your wallet to continue</p>
        </div>
      ) : (
        <div className="dashboard-content">
          {activeTab === 'dashboard' ? (
            <>
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
                          <p><span className="detail-label">Description:</span> {job.description}</p>
                          <p><span className="detail-label">Escrowed:</span> {job.escrowed} ETH</p>
                          <p><span className="detail-label">Deadline:</span> {job.deadline ? formatTimeLeft(job.deadline) : "No deadline"}</p>
                        </div>

                        {!job.workCompleted && job.deadline && currentTime <= job.deadline && (
                          <button
                            onClick={() => completeWork(job.id)}
                            disabled={loading}
                            className="primary-btn"
                          >
                            Complete My Work
                          </button>
                        )}

                        {job.workCompleted && (
                          <p className="success-text">Work completed! Waiting for payment.</p>
                        )}

                        {job.deadline && currentTime > job.deadline && !job.workCompleted && (
                          <p className="error-text">Deadline passed!</p>
                        )}
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
                          <p><span className="detail-label">Description:</span> {job.description}</p>
                          <p><span className="detail-label">Escrowed:</span> {job.escrowed} ETH</p>
                          {job.rating > 0 && (
                            <div className="job-rating">
                              <span className="detail-label">Rating:</span>
                              <div className="job-stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={star <= job.rating ? 'filled' : ''}
                                  >
                                    {star <= job.rating ? '★' : '☆'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="job-category">
              <h3 className="category-title">Available Jobs ({availableJobs.length})</h3>
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
                        <p><span className="detail-label">Description:</span> {job.description}</p>
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
          )}
        </div>
      )}
    </div>
  );
}

export default App;
