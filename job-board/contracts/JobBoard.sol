// JobBoard.sol
pragma solidity ^0.8.0;


contract JobBoard {
    enum JobStatus { Open, Assigned, Completed }
    
    struct Job {
        string title;
        uint256 budget;
        string description;
        address payable employer;
        address payable freelancer;
        JobStatus status;
    }
    
    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => uint256) public escrowedFunds;
    
 event JobPosted(uint256 indexed jobId, string title, string description, uint256 budget);
    event JobApplied(uint256 indexed jobId, address freelancer);
    event FundsEscrowed(uint256 indexed jobId, uint256 amount);
    event PaymentReleased(uint256 indexed jobId, address freelancer, uint256 amount);
    
    modifier onlyEmployer(uint256 jobId) {
        require(msg.sender == jobs[jobId].employer, "Not the employer");
        _;
    }
    
    modifier hasEscrowedFunds(uint256 jobId) {
        require(escrowedFunds[jobId] > 0, "No funds escrowed");
        _;
    }
    
    // Only employers can post jobs
function postJob(string calldata _title, string calldata _description, uint256 _budget) external {
    string memory descriptionToUse = bytes(_description).length == 0 ? "N/A" : _description;
    
    jobs[jobCount] = Job({
        title: _title,
        description: descriptionToUse,
        budget: _budget,
        employer: payable(msg.sender),
        freelancer: payable(address(0)),
        status: JobStatus.Open
    });
    
    emit JobPosted(jobCount, _title, descriptionToUse, _budget);
    jobCount++;
}
function getJobDescription(uint256 jobId) public view returns (string memory) {
    return jobs[jobId].description;
}
    
    // Freelancers can apply only if funds are escrowed
    function applyForJob(uint256 jobId) external hasEscrowedFunds(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Open, "Job not available");
        require(job.freelancer == address(0), "Already taken");
        
        job.freelancer = payable(msg.sender);
        job.status = JobStatus.Assigned;
        emit JobApplied(jobId, msg.sender);
    }
    
    // Employers escrow funds for their jobs
    function escrowFunds(uint256 jobId) external payable onlyEmployer(jobId) {
        require(msg.value > 0, "Must send ETH");
        escrowedFunds[jobId] += msg.value;
        emit FundsEscrowed(jobId, msg.value);
    }
    
    // Only job poster can release payments
    function releasePayment(uint256 jobId) external onlyEmployer(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Assigned, "Job not assigned");
        
        uint256 amount = escrowedFunds[jobId];
        require(amount > 0, "No funds to release");
        
        // Checks-Effects-Interactions pattern
        escrowedFunds[jobId] = 0;
        job.status = JobStatus.Completed;
        
        (bool success, ) = job.freelancer.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit PaymentReleased(jobId, job.freelancer, amount);
    }
    
    // View functions
    function getJobCount() external view returns (uint256) {
        return jobCount;
    }
    
    function getJob(uint256 jobId) external view returns (
        string memory title,
        uint256 budget,
        address employer,
        address freelancer,
        JobStatus status
    ) {
        Job memory job = jobs[jobId];
        return (job.title, job.budget, job.employer, job.freelancer, job.status);
    }
    
    function getEscrowed(uint256 jobId) external view returns (uint256) {
        return escrowedFunds[jobId];
    }
}
