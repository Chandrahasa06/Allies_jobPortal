// SPDX-License-Identifier: UNLICENSED
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
        uint256 deadline;
        bool workCompleted;
        uint8 rating; // New field to store rating (0-5)
        bool rated; // New field to track if rated
    }
    
    struct FreelancerRating {
        uint256 totalRatings;
        uint256 ratingCount;
        uint256 lastRating;
    }
    
    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => uint256) public escrowedFunds;
    mapping(address => FreelancerRating) public freelancerRatings; // New mapping for freelancer ratings
    
    event JobPosted(uint256 indexed jobId, string title, string description, uint256 budget);
    event JobApplied(uint256 indexed jobId, address freelancer);
    event FundsEscrowed(uint256 indexed jobId, uint256 amount);
    event PaymentReleased(uint256 indexed jobId, address freelancer, uint256 amount);
    event WorkCompleted(uint256 indexed jobId);
    event Refunded(uint256 indexed jobId, address employer, uint256 amount);
    event FreelancerRated(uint256 indexed jobId, address freelancer, uint8 rating); // New event
    
    modifier onlyEmployer(uint256 jobId) {
        require(msg.sender == jobs[jobId].employer, "Not the employer");
        _;
    }
    
    modifier onlyFreelancer(uint256 jobId) {
        require(msg.sender == jobs[jobId].freelancer, "Not the freelancer");
        _;
    }
    
    modifier hasEscrowedFunds(uint256 jobId) {
        require(escrowedFunds[jobId] > 0, "No funds escrowed");
        _;
    }
    
    function postJob(string calldata _title, string calldata _description, uint256 _budget) external {
        string memory descriptionToUse = bytes(_description).length == 0 ? "N/A" : _description;
        
        jobs[jobCount] = Job({
            title: _title,
            description: descriptionToUse,
            budget: _budget,
            employer: payable(msg.sender),
            freelancer: payable(address(0)),
            status: JobStatus.Open,
            deadline: 0,
            workCompleted: false,
            rating: 0,
            rated: false
        });
        
        emit JobPosted(jobCount, _title, descriptionToUse, _budget);
        jobCount++;
    }
    
    function getJobDescription(uint256 jobId) public view returns (string memory) {
        return jobs[jobId].description;
    }
    
    function applyForJob(uint256 jobId) external hasEscrowedFunds(jobId) {
        Job storage job = jobs[jobId];
        require(job.freelancer == address(0), "Already taken");
        require(job.status == JobStatus.Open, "Job not available");
        
        job.freelancer = payable(msg.sender);
        job.status = JobStatus.Assigned;
        job.deadline = block.timestamp + 2 minutes; // Set deadline to 2 minutes from now for testing
        emit JobApplied(jobId, msg.sender);
    }
    
    function escrowFunds(uint256 jobId) external payable onlyEmployer(jobId) {
        require(msg.value > 0, "Must send ETH");
        escrowedFunds[jobId] += msg.value;
        emit FundsEscrowed(jobId, msg.value);
    }
    

    function releasePayment(uint256 jobId, uint8 _rating) external onlyEmployer(jobId) {
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1-5");
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Assigned, "Job not assigned");
        require(job.workCompleted, "Work not completed");
        require(!job.rated, "Already rated this job");
        
        uint256 amount = escrowedFunds[jobId];
        require(amount > 0, "No funds to release");
        
        escrowedFunds[jobId] = 0;
        job.status = JobStatus.Completed;
        job.rating = _rating;
        job.rated = true;
        
        // Update freelancer's rating stats
        FreelancerRating storage rating = freelancerRatings[job.freelancer];
        rating.totalRatings += _rating;
        rating.ratingCount += 1;
        rating.lastRating = block.timestamp;
        
        (bool success, ) = job.freelancer.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit PaymentReleased(jobId, job.freelancer, amount);
        emit FreelancerRated(jobId, job.freelancer, _rating);
    }
    
    // New function for freelancer to mark work as completed
    function completeWork(uint256 jobId) external onlyFreelancer(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Assigned, "Job not assigned");
        require(!job.workCompleted, "Work already completed");
        
        job.workCompleted = true;
        emit WorkCompleted(jobId);
    }
    
    // New function for employer to refund if deadline passed
    function refundIfDeadlinePassed(uint256 jobId) external onlyEmployer(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Assigned, "Job not assigned");
        require(!job.workCompleted, "Work was completed");
        require(block.timestamp > job.deadline, "Deadline not passed");
        
        uint256 amount = escrowedFunds[jobId];
        require(amount > 0, "No funds to refund");
        
        escrowedFunds[jobId] = 0;
        job.status = JobStatus.Open;
        job.freelancer = payable(address(0));
        job.deadline = 0;
        
        (bool success, ) = job.employer.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Refunded(jobId, job.employer, amount);
    }
    
    // View functions
    function getJobCount() external view returns (uint256) {
        return jobCount;
    }
    
    function getJob(uint256 jobId) external view returns (
        string memory title,
        string memory description,
        uint256 budget,
        address employer,
        address freelancer,
        JobStatus status,
        uint256 deadline,
        bool workCompleted
    ) {
        Job memory job = jobs[jobId];
        return (
            job.title,
            job.description,
            job.budget,
            job.employer,
            job.freelancer,
            job.status,
            job.deadline,
            job.workCompleted
        );
    }
    
    function getEscrowed(uint256 jobId) external view returns (uint256) {
        return escrowedFunds[jobId];
    }
    
    // Helper function to check if deadline has passed
    function isDeadlinePassed(uint256 jobId) external view returns (bool) {
        return block.timestamp > jobs[jobId].deadline && jobs[jobId].deadline != 0;
    }
      function getFreelancerRating(address _freelancer) external view returns (
        uint256 averageRating,
        uint256 ratingCount,
        uint256 lastRatingTimestamp
    ) {
        FreelancerRating memory rating = freelancerRatings[_freelancer];
        averageRating = rating.ratingCount > 0 ? rating.totalRatings / rating.ratingCount : 0;
        return (
            averageRating,
            rating.ratingCount,
            rating.lastRating
        );
    }
}
