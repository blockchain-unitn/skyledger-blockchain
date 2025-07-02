import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { expect } from "chai";
import { Contract, ContractTransactionResponse } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

dotenv.config();

const REPUTATION_TOKEN_ADDRESS = process.env.REPUTATION_TOKEN_ADDRESS || "";
const OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS || "";

describe("End-to-End: Operator & ReputationToken Integration", function () {
  let reputationToken: any;
  let operator: any;
  let owner: HardhatEthersSigner,
    admin: HardhatEthersSigner,
    operator1: HardhatEthersSigner;
  let ownerAddr: string,
    adminAddr: string,
    operator1Addr: string,
    operatorContractAddr: string;
  const registrationAmount = ethers.parseEther("500");
  let response: ContractTransactionResponse;

  before(async function () {
    if (!REPUTATION_TOKEN_ADDRESS || !OPERATOR_ADDRESS) {
      this.skip(); // Skip tests if env vars are not set
      return;
    }

    reputationToken = await ethers.getContractAt(
      "ReputationToken",
      REPUTATION_TOKEN_ADDRESS
    );
    operator = await ethers.getContractAt("Operator", OPERATOR_ADDRESS);
    [owner, admin, operator1] = await ethers.getSigners();
    ownerAddr = await owner.getAddress();
    adminAddr = await admin.getAddress();
    operator1Addr = await operator1.getAddress();
    operatorContractAddr = await operator.getAddress();

    // Ensure Operator contract has enough tokens to perform registrations
    const ownerBalanceBefore = await reputationToken.balanceOf(ownerAddr);
    const requiredBalance = ethers.parseEther("10000"); // Ample amount for all tests
    if (ownerBalanceBefore < requiredBalance) {
      const amountToTransfer = requiredBalance - ownerBalanceBefore;
      response = await reputationToken
        .connect(ownerAddr)
        .mint(ownerAddr, amountToTransfer);
      await response.wait();
    }

    // The operator must approve the Operator contract to spend their tokens infinitely
    response = await reputationToken
      .connect(operator1)
      .approve(operatorContractAddr, ethers.MaxInt256);
    await response.wait();

    // the owner must approve the Operator contract to spend their tokens infinitely
    response = await reputationToken
      .connect(owner)
      .approve(operatorContractAddr, ethers.MaxInt256);
    await response.wait();
  });

  // Helper to ensure operator is not registered and has 0 balance
  async function resetOperatorState() {
    // This function is complex and might hide issues.
    // A simpler approach is to ensure the operator is not registered
    // and has a predictable token balance before each relevant test.
    // For now, we will just ensure it has some balance to be burned if needed.

    const opInfo = await operator.getOperatorInfo(operator1Addr);
    if (opInfo.registered) {
      const op1Bal = await reputationToken.balanceOf(operator1Addr);
      if (op1Bal > registrationAmount) {
        try {
          response = await reputationToken
            .connect(owner)
            .burn(operator1Addr, op1Bal - registrationAmount);
          await response.wait();
        } catch (e) {
          // It might fail if owner is not the token owner, but that's ok for a reset.
        }
      }

      if (op1Bal < registrationAmount) {
        // Mint enough tokens to the operator for registration
        response = await reputationToken
          .connect(owner)
          .mint(operator1Addr, registrationAmount - op1Bal);
        await response.wait();
      }
    }
  }

  beforeEach(async function () {
    await resetOperatorState();
  });

  it("should register an operator and assign 500 reputation tokens", async function () {
    // Ensure operator is not registered before test
    let opInfo = await operator.getOperatorInfo(operator1Addr);
    if (!opInfo.registered) {
      response = await operator.connect(owner).registerOperator(operator1Addr);
      await response.wait();
      opInfo = await operator.getOperatorInfo(operator1Addr);
    }

    expect(opInfo.registered).to.be.true;
    expect(await reputationToken.balanceOf(operator1Addr)).to.equal(
      registrationAmount
    );
  });

  it("should penalize an operator and transfer tokens to owner", async function () {
    // 1. Register operator if not already registered
    let opInfo = await operator.getOperatorInfo(operator1Addr);
    if (!opInfo.registered) {
      response = await operator.connect(owner).registerOperator(operator1Addr);
      await response.wait();
    }

    const op1BalanceBefore = await reputationToken.balanceOf(operator1Addr);
    const ownerBalanceBefore = await reputationToken.balanceOf(ownerAddr);

    // 2. Penalize
    const penalty = ethers.parseEther("100");

    response = await operator
      .connect(owner)
      .penalizeOperator(operator1Addr, penalty);
    await response.wait();

    expect(await reputationToken.balanceOf(ownerAddr)).to.equal(
      ownerBalanceBefore + penalty
    );
    expect(await reputationToken.balanceOf(operator1Addr)).to.equal(
      op1BalanceBefore - penalty
    );
  });

  it("should allow registered operator to spend skyTokens", async function () {
    // Ensure operator is registered
    const opInfo = await operator.getOperatorInfo(operator1Addr);
    if (!opInfo.registered) {
      response = await operator.connect(owner).registerOperator(operator1Addr);
      await response.wait();
    }

    const spendAmount = ethers.parseEther("1");
    operator.spendTokens({ value: spendAmount });
  });

  it("should not allow non-admin to register operator", async function () {
    await expect(
      operator.connect(operator1).registerOperator(operator1Addr)
    ).to.be.revertedWith("Only admin or owner");
  });

  it("should allow admin to register operator", async function () {
    response = await operator.connect(owner).addAdmin(adminAddr);
    await response.wait();

    // Ensure operator is not registered before test
    let opInfo = await operator.getOperatorInfo(operator1Addr);
    if (!opInfo.registered) {
      await operator.connect(admin).registerOperator(operator1Addr);
      opInfo = await operator.getOperatorInfo(operator1Addr);
    }
    expect(opInfo.registered).to.be.true;
    expect(await reputationToken.balanceOf(operator1Addr)).to.equal(
      registrationAmount
    );
  });

  it("should allow admin to penalize operator", async function () {
    // 1. Add admin and register operator if not already registered
    await operator.connect(owner).addAdmin(adminAddr);
    const opInfo = await operator.getOperatorInfo(operator1Addr);
    if (!opInfo.registered) {
      await operator.connect(admin).registerOperator(operator1Addr);
    }

    const operatorBalanceBefore = await reputationToken.balanceOf(
      operator1Addr
    );
    const adminBalanceBefore = await reputationToken.balanceOf(adminAddr);

    // 2. Penalize
    const penalty = ethers.parseEther("50");

    response = await operator
      .connect(admin)
      .penalizeOperator(operator1Addr, penalty);
    await response.wait();

    expect(await reputationToken.balanceOf(operator1Addr)).to.equal(
      operatorBalanceBefore - penalty
    );
    expect(await reputationToken.balanceOf(adminAddr)).to.equal(
      adminBalanceBefore + penalty
    );
  });

  it("should not allow non-owner to mint tokens", async function () {
    const mintAmount = ethers.parseEther("1000");
    await expect(
      reputationToken.connect(operator1).mint(operator1Addr, mintAmount)
    ).to.be.reverted;
  });

  it("should allow owner to mint tokens", async function () {
    const mintAmount = ethers.parseEther("1000");
    const initialBalance = await reputationToken.balanceOf(operator1Addr);
    response = await reputationToken
      .connect(owner)
      .mint(operator1Addr, mintAmount);
    await response.wait();
    const finalBalance = await reputationToken.balanceOf(operator1Addr);
    expect(finalBalance).to.equal(initialBalance + mintAmount);
  });

  it("should allow owner to burn tokens from an address", async function () {
    const burnAmount = ethers.parseEther("500");
    response = await reputationToken
      .connect(owner)
      .mint(operator1Addr, burnAmount);
    await response.wait();
    const initialBalance = await reputationToken.balanceOf(operator1Addr);

    response = await reputationToken
      .connect(owner)
      .burn(operator1Addr, burnAmount);
    await response.wait();

    const finalBalance = await reputationToken.balanceOf(operator1Addr);
    expect(finalBalance).to.equal(initialBalance - burnAmount);
  });

  it("should not allow non-owner to burn tokens", async function () {
    const burnAmount = ethers.parseEther("500");
    response = await reputationToken
      .connect(owner)
      .mint(operator1Addr, burnAmount);
    await response.wait();
    await expect(
      reputationToken.connect(operator1).burn(operator1Addr, burnAmount)
    ).to.be.reverted;
  });

  it("should return correct reputation balance", async function () {
    // Ensure operator is registered
    const opInfo = await operator.getOperatorInfo(operator1Addr);
    if (!opInfo.registered) {
      await operator.connect(owner).registerOperator(operator1Addr);
    }

    const reputation = await operator.getReputation(operator1Addr);
    expect(reputation).to.equal(registrationAmount);
  });
});
