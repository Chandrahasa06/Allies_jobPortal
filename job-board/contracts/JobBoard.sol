// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract JobBoard {
    enum JobStatus { Open, Assigned, Completed }

    struct Job {
        string title;
        uint256 budget;
        address payable employer;
        address payable freelancer;
        JobStatus status;
    }

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => uint256) public escrowedFunds;

    event JobPosted(uint256 indexed jobId, string title, uint256 budget);
    event JobApplied(uint256 indexed jobId, address freelancer);
    event FundsEscrowed(uint256 indexed jobId, uint256 amount);
    event PaymentReleased(uint256 indexed jobId);
    event EmployerRefunded(uint256 indexed jobId);

    modifier onlyEmployer(uint256 jobId) {
        require(msg.sender == jobs[jobId].employer, "Not the employer");
        _;
    }

    modifier onlyFreelancer(uint256 jobId) {
        require(msg.sender == jobs[jobId].freelancer, "Not the freelancer");
        _;
    }

    function postJob(string calldata title, uint256 budget) external {
        jobs[jobCount] = Job({
            title: title,
            budget: budget,
            employer: payable(msg.sender),
            freelancer: payable(address(0)),
            status: JobStatus.Open
        });
        emit JobPosted(jobCount, title, budget);
        jobCount++;
    }

    function applyForJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Open, "Job not available");
        require(job.freelancer == address(0), "Already taken");

        job.freelancer = payable(msg.sender);
        job.status = JobStatus.Assigned;

        emit JobApplied(jobId, msg.sender);
    }

    function escrowFunds(uint256 jobId) external payable onlyEmployer(jobId) {
        Job storage job = jobs[jobId];
        require(msg.value == job.budget, "Incorrect amount");
        escrowedFunds[jobId] = msg.value;

        emit FundsEscrowed(jobId, msg.value);
    }

    function releasePayment(uint256 jobId) external onlyEmployer(jobId) {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Assigned, "Job not in correct state");

        uint256 amount = escrowedFunds[jobId];
        escrowedFunds[jobId] = 0;
        job.status = JobStatus.Completed;
        job.freelancer.transfer(amount);

        emit PaymentReleased(jobId);
    }

    function refundEmployer(uint256 jobId) external onlyEmployer(jobId) {
        Job storage job = jobs[jobId];
        require(job.status != JobStatus.Completed, "Already completed");

        uint256 amount = escrowedFunds[jobId];
        escrowedFunds[jobId] = 0;
        job.status = JobStatus.Open;
        job.employer.transfer(amount);

        emit EmployerRefunded(jobId);
    }

    // View Functions
    function getJobCount() external view returns (uint256) {
        return jobCount;
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function getEscrowed(uint256 jobId) external view returns (uint256) {
        return escrowedFunds[jobId];
    }
}
