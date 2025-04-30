const JobBoard = artifacts.require("JobBoard");

contract("JobBoard", (accounts) => {
  let jobBoard;
  const [employer, freelancer, otherAccount] = accounts;

  beforeEach(async () => {
    jobBoard = await JobBoard.new();
  });

  describe("Job Posting", () => {
    it("should allow employer to post jobs", async () => {
      const result = await jobBoard.postJob("Web Developer", "Build a website", web3.utils.toWei("1", "ether"), { from: employer });
      assert.equal(result.logs[0].event, "JobPosted");
      const job = await jobBoard.jobs(0);
      assert.equal(job.title, "Web Developer");
    });

    it("should prevent empty job titles", async () => {
      try {
        await jobBoard.postJob("", "Invalid job", web3.utils.toWei("1", "ether"), { from: employer });
        assert.fail("Expected revert not received");
      } catch (error) {
        assert(error.message.includes("revert"), "Expected revert");
      }
    });
  });

  describe("Applications", () => {
    beforeEach(async () => {
      await jobBoard.postJob("Web Developer", "Build a website", web3.utils.toWei("1", "ether"), { from: employer });
      await jobBoard.escrowFunds(0, { from: employer, value: web3.utils.toWei("1", "ether") });
    });

    it("should allow freelancer to apply", async () => {
      const result = await jobBoard.applyForJob(0, { from: freelancer });
      assert.equal(result.logs[0].event, "JobApplied");
      const job = await jobBoard.jobs(0);
      assert.equal(job.freelancer, freelancer);
    });

    it("should prevent double applications", async () => {
      await jobBoard.applyForJob(0, { from: freelancer });
      try {
        await jobBoard.applyForJob(0, { from: otherAccount });
        assert.fail("Expected revert not received");
      } catch (error) {
        assert(error.message.includes("Already taken"), "Expected 'Already taken' error");
      }
    });

    it("should prevent applications without escrow", async () => {
      await jobBoard.postJob("No Escrow Job", "Test", web3.utils.toWei("1", "ether"), { from: employer });
      try {
        await jobBoard.applyForJob(1, { from: freelancer });
        assert.fail("Expected revert not received");
      } catch (error) {
        assert(error.message.includes("No funds escrowed"), "Expected 'No funds escrowed' error");
      }
    });
  });

  describe("Payments", () => {
    beforeEach(async () => {
      await jobBoard.postJob("Payment Release Job", "Test release", web3.utils.toWei("1", "ether"), { from: employer });
      await jobBoard.escrowFunds(0, { from: employer, value: web3.utils.toWei("1", "ether") });
      await jobBoard.applyForJob(0, { from: freelancer });
      await jobBoard.completeWork(0, { from: freelancer });
    });

    it("should properly escrow funds", async () => {
      const escrowed = await jobBoard.getEscrowed(0);
      assert.equal(escrowed.toString(), web3.utils.toWei("1", "ether"));
    });

    it("should release payment to freelancer", async () => {
      const freelancerBefore = web3.utils.toBN(await web3.eth.getBalance(freelancer));
      const result = await jobBoard.releasePayment(0, 5, { from: employer });
      
      const freelancerAfter = web3.utils.toBN(await web3.eth.getBalance(freelancer));
      const expectedAmount = web3.utils.toBN(web3.utils.toWei("1", "ether"));
      
      assert.equal(result.logs[0].event, "PaymentReleased");
      assert.equal(result.logs[1].event, "FreelancerRated");
      assert.isTrue(freelancerAfter.sub(freelancerBefore).gte(expectedAmount.sub(web3.utils.toBN("200000000000000000")))); // accounting for gas
    });
  });

  describe("Edge Cases", () => {
    beforeEach(async () => {
      await jobBoard.postJob("Unauthorized Release", "Test", web3.utils.toWei("1", "ether"), { from: employer });
      await jobBoard.escrowFunds(0, { from: employer, value: web3.utils.toWei("1", "ether") });
      await jobBoard.applyForJob(0, { from: freelancer });
      await jobBoard.completeWork(0, { from: freelancer });
    });

    it("should prevent unauthorized payment release", async () => {
      try {
        await jobBoard.releasePayment(0, 5, { from: otherAccount });
        assert.fail("Expected revert not received");
      } catch (error) {
        assert(error.message.includes("Not the employer"), "Expected 'Not the employer' error");
      }
    });


    it("should prevent releasing payment for unassigned jobs", async () => {
      await jobBoard.postJob("Unassigned Job", "Test", web3.utils.toWei("1", "ether"), { from: employer });
      await jobBoard.escrowFunds(1, { from: employer, value: web3.utils.toWei("1", "ether") });
      
      try {
        await jobBoard.releasePayment(1, 5, { from: employer });
        assert.fail("Expected revert not received");
      } catch (error) {
        assert(error.message.includes("Job not assigned"), "Expected 'Job not assigned' error");
      }
    });

  });

  describe("Ratings", () => {
    beforeEach(async () => {
      await jobBoard.postJob("Rating Test Job", "Test ratings", web3.utils.toWei("1", "ether"), { from: employer });
      await jobBoard.escrowFunds(0, { from: employer, value: web3.utils.toWei("1", "ether") });
      await jobBoard.applyForJob(0, { from: freelancer });
      await jobBoard.completeWork(0, { from: freelancer });
      await jobBoard.releasePayment(0, 5, { from: employer });
    });

    it("should record freelancer ratings", async () => {
      const rating = await jobBoard.freelancerRatings(freelancer);
      assert.equal(rating.totalRatings.toString(), "5");
      assert.equal(rating.ratingCount.toString(), "1");
    });
  });
});
