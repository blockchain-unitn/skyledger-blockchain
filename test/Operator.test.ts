import { expect } from "chai";
import { ethers } from "hardhat";
import { Operator, ReputationToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Operator contract", function () {
  let operator: Operator;
  let reputationToken: ReputationToken;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let operatorAddr: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async function () {
    [owner, admin, operatorAddr, user] = await ethers.getSigners();

    // Deploy ReputationToken
    const ReputationTokenFactory = await ethers.getContractFactory("ReputationToken");
    reputationToken = (await ReputationTokenFactory.deploy("SkyLedger Reputation", "SLREP")) as ReputationToken;
    await reputationToken.waitForDeployment();

    // Deploy Operator contract
    const OperatorFactory = await ethers.getContractFactory("Operator");
    operator = (await OperatorFactory.deploy(await reputationToken.getAddress())) as Operator;
    await operator.waitForDeployment();

    // Approve Operator contract to spend owner's tokens
    await reputationToken.connect(owner).approve(await operator.getAddress(), ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct reputation token address", async function () {
      expect(await operator.reputationToken()).to.equal(await reputationToken.getAddress());
    });

    it("Should grant owner role to deployer", async function () {
      const ownerRole = await operator.OWNER_ROLE();
      expect(await operator.hasRole(ownerRole, owner.address)).to.be.true;
    });
  });

  describe("Admin Management", function () {
    it("Owner can add admin", async function () {
      await operator.addAdmin(admin.address);
      const adminRole = await operator.ADMIN_ROLE();
      expect(await operator.hasRole(adminRole, admin.address)).to.be.true;
    });

    it("Owner can remove admin", async function () {
      await operator.addAdmin(admin.address);
      await operator.removeAdmin(admin.address);
      const adminRole = await operator.ADMIN_ROLE();
      expect(await operator.hasRole(adminRole, admin.address)).to.be.false;
    });

    it("Owner cannot remove self", async function () {
      await expect(operator.removeAdmin(owner.address)).to.be.reverted;
    });

    it("Admin cannot add another admin", async function () {
      await operator.addAdmin(admin.address);
      await expect(operator.connect(admin).addAdmin(user.address)).to.be.reverted;
    });

    it("Admin cannot remove another admin", async function () {
      await operator.addAdmin(admin.address);
      await expect(operator.connect(admin).removeAdmin(owner.address)).to.be.reverted;
    });

    it("Non-admin cannot add admin", async function () {
      await expect(operator.connect(user).addAdmin(admin.address)).to.be.reverted;
    });
  });

  describe("Operator Registration", function () {
    it("Admin or owner can register operator and transfer tokens", async function () {
      await operator.addAdmin(admin.address);
      await expect(operator.connect(admin).registerOperator(operatorAddr.address))
        .to.emit(operator, "OperatorRegistered")
        .withArgs(operatorAddr.address);

      const info = await operator.getOperatorInfo(operatorAddr.address);
      expect(info.registered).to.be.true;
      expect(await reputationToken.balanceOf(operatorAddr.address)).to.equal(ethers.parseUnits("500", 18));
    });

    it("Owner can register operator", async function () {
      await expect(operator.registerOperator(operatorAddr.address))
        .to.emit(operator, "OperatorRegistered")
        .withArgs(operatorAddr.address);
    });

    it("Cannot register operator twice", async function () {
      await operator.registerOperator(operatorAddr.address);
      await expect(operator.registerOperator(operatorAddr.address)).to.be.reverted;
    });

    it("Non-admin cannot register operator", async function () {
      await expect(operator.connect(user).registerOperator(operatorAddr.address)).to.be.reverted;
    });
  });

  describe("Operator Info", function () {
    it("Returns correct info for registered operator", async function () {
      await operator.registerOperator(operatorAddr.address);
      const info = await operator.getOperatorInfo(operatorAddr.address);
      expect(info.registered).to.be.true;
    });

    it("Returns false for unregistered operator", async function () {
      const info = await operator.getOperatorInfo(user.address);
      expect(info.registered).to.be.false;
    });
  });

  describe("Get All Operators", function () {
    it("Returns empty array if no operators", async function () {
      const all = await operator.getAllOperators();
      expect(all.length).to.equal(0);
    });

    it("Returns all registered operators in order", async function () {
      await operator.registerOperator(operatorAddr.address);
      await reputationToken.mint(owner.address, ethers.parseEther("500"));
      await operator.registerOperator(user.address);
      const all = await operator.getAllOperators();
      expect(all.length).to.equal(2);
      expect(all[0]).to.equal(operatorAddr.address);
      expect(all[1]).to.equal(user.address);
    });
  });

  describe("Reputation Query", function () {
    it("Returns correct reputation for registered operator", async function () {
      await operator.registerOperator(operatorAddr.address);
      expect(await operator.getReputation(operatorAddr.address)).to.equal(ethers.parseUnits("500", 18));
    });

    it("Returns zero for unregistered operator", async function () {
      expect(await operator.getReputation(user.address)).to.equal(0);
    });
  });

  describe("Token Spending", function () {
    beforeEach(async function () {
      await operator.registerOperator(operatorAddr.address);
    });

    it("Registered operator can spend tokens (send skyT)", async function () {
      const value = ethers.parseEther("1");
      await expect(operator.connect(operatorAddr).spendTokens({ value }))
        .to.emit(operator, "Sent")
        .withArgs(operatorAddr.address, value);
    });

    it("Cannot spend tokens with zero value", async function () {
      await expect(operator.connect(operatorAddr).spendTokens({ value: 0 })).to.be.reverted;
    });

    it("Unregistered operator cannot spend tokens", async function () {
      await expect(operator.connect(user).spendTokens({ value: ethers.parseEther("1") })).to.be.reverted;
    });
  });

  describe("Edge Cases and Custom Errors", function () {
    beforeEach(async function () {
      await operator.registerOperator(operatorAddr.address);
    });

    it("Should revert with NotRegistered when spendTokens is called by unregistered address", async function () {
      await expect(operator.connect(user).spendTokens({ value: ethers.parseEther("1") }))
        .to.be.revertedWithCustomError(operator, "NotRegistered");
    });

    it("Should revert with NoSkyTokensSent when spendTokens is called with zero value", async function () {
      await expect(operator.connect(operatorAddr).spendTokens({ value: 0 }))
        .to.be.revertedWithCustomError(operator, "NoSkyTokensSent");
    });

    it("Should revert with TokenTransferFailed if penalizeOperator is called with zero penalty", async function () {
      await expect(operator.penalizeOperator(operatorAddr.address, 0))
        .to.be.revertedWithCustomError(operator, "TokenTransferFailed");
    });

    it("Should revert with TokenTransferFailed if penalizeOperator is called with penalty greater than balance", async function () {
      await expect(operator.penalizeOperator(operatorAddr.address, ethers.parseEther("1000")))
        .to.be.revertedWithCustomError(operator, "TokenTransferFailed");
    });

    it("Should revert with NotRegistered if penalizeOperator is called on unregistered operator", async function () {
      await expect(operator.penalizeOperator(user.address, ethers.parseEther("1")))
        .to.be.revertedWithCustomError(operator, "NotRegistered");
    });

    it("Should revert with NotOwner if addAdmin is called by non-owner", async function () {
      await expect(operator.connect(admin).addAdmin(user.address))
        .to.be.revertedWithCustomError(operator, "NotOwner");
    });

    it("Should revert with NotOwner if removeAdmin is called by non-owner", async function () {
      await operator.addAdmin(admin.address);
      await expect(operator.connect(admin).removeAdmin(owner.address))
        .to.be.revertedWithCustomError(operator, "NotOwner");
    });

    it("Should revert with SelfRemovalNotAllowed if owner tries to remove self as admin", async function () {
      await expect(operator.removeAdmin(owner.address))
        .to.be.revertedWithCustomError(operator, "SelfRemovalNotAllowed");
    });

    it("Should revert with AlreadyRegistered if trying to register an already registered operator", async function () {
      await expect(operator.registerOperator(operatorAddr.address))
        .to.be.revertedWithCustomError(operator, "AlreadyRegistered");
    });
    
  });

  describe("Penalization", function () {
    beforeEach(async function () {
      await operator.registerOperator(operatorAddr.address);
      await reputationToken.connect(operatorAddr).approve(await operator.getAddress(), ethers.parseEther("1000"));
    });

    it("Admin or owner can penalize operator with sufficient tokens", async function () {
      const penalty = ethers.parseEther("100");
      const ownerBalanceBefore = await reputationToken.balanceOf(owner.address);
      await expect(operator.penalizeOperator(operatorAddr.address, penalty))
        .to.emit(operator, "OperatorPenalized")
        .withArgs(operatorAddr.address, penalty);

      expect(await reputationToken.balanceOf(operatorAddr.address)).to.equal(ethers.parseEther("400"));
      expect(await reputationToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore + penalty);
    });

    it("Cannot penalize unregistered operator", async function () {
      await expect(operator.penalizeOperator(user.address, ethers.parseEther("100"))).to.be.reverted;
    });

    it("Cannot penalize with insufficient tokens", async function () {
      await expect(operator.penalizeOperator(operatorAddr.address, ethers.parseEther("1000"))).to.be.reverted;
    });

    it("Non-admin cannot penalize", async function () {
      await expect(operator.connect(user).penalizeOperator(operatorAddr.address, ethers.parseEther("100"))).to.be.reverted;
    });
    it("Should revert registerOperator if not enough allowance", async function () {
      // Deploy a new Operator contract
      const OperatorFactory = await ethers.getContractFactory("Operator");
      const newOperator = await OperatorFactory.deploy(await reputationToken.getAddress());
      await newOperator.waitForDeployment();

      // Attempt to register operator without sufficient allowance
      await expect(newOperator.registerOperator(operatorAddr.address)).to.be.reverted;
    });

    it("Should allow registerOperator after approve", async function () {
      const OperatorFactory = await ethers.getContractFactory("Operator");
      const newOperator = await OperatorFactory.deploy(await reputationToken.getAddress());
      await newOperator.waitForDeployment();

      // Approve the new operator to spend tokens
      await reputationToken.connect(owner).approve(await newOperator.getAddress(), ethers.parseEther("10000"));
      await expect(newOperator.registerOperator(operatorAddr.address)).to.emit(newOperator, "OperatorRegistered");
    });
  });
});