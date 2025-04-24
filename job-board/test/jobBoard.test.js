const JobBoard = artifacts.require("JobBoard");

contract("JobBoard", accounts => {
    const employer = accounts[0];
    const freelancer = accounts[1];
    let jobId;

    it("should post a job", async () => {
        const board = await JobBoard.deployed();
        await board.postJob("Solidity Dev", web3.utils.toWei("1", "ether"), { from: employer });
        const job = await board.jobs(0);
        assert.equal(job.title, "Solidity Dev");
    });

    it("should allow freelancer to apply", async () => {
        const board = await JobBoard.deployed();
        await board.applyForJob(0, { from: freelancer });
        const job = await board.jobs(0);
        assert.equal(job.freelancer, freelancer);
    });

    it("should escrow funds", async () => {
        const board = await JobBoard.deployed();
        await board.escrowFunds(0, { from: employer, value: web3.utils.toWei("1", "ether") });
        const escrow = await board.escrowedFunds(0);
        assert.equal(escrow.toString(), web3.utils.toWei("1", "ether"));
    });

    it("should release payment to freelancer", async () => {
        const board = await JobBoard.deployed();
        await board.releasePayment(0, { from: employer });
        const job = await board.jobs(0);
        assert.equal(job.status.toString(), "2"); // Completed
    });
});
