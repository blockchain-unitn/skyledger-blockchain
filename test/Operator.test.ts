import { expect } from "chai";
import { ethers } from "hardhat";
import { Operator, ReputationToken } from "../typechain-types"; // Import your ReputationToken type
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Operator", function () {
  let operator: Operator;
  let reputationToken: ReputationToken; // Type it as your ReputationToken now
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let operatorAddress: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async function () {
    [owner, admin, operatorAddress, user] = await ethers.getSigners();

    // 1. Deploy your custom ReputationToken
    const ReputationTokenFactory = await ethers.getContractFactory(
      "ReputationToken"
    );
    reputationToken = (await ReputationTokenFactory.deploy(
      "SkyLedger Reputation",
      "SLREP"
    )) as unknown as ReputationToken;
    await reputationToken.waitForDeployment(); // Ensure deployment is complete

    // 2. Deploy Operator contract, passing the address of your ReputationToken
    const OperatorContract = await ethers.getContractFactory("Operator");
    operator = (await OperatorContract.deploy(
      reputationToken.getAddress()
    )) as unknown as Operator;
    await operator.waitForDeployment(); // Ensure deployment is complete

    // 3. Approve the Operator contract to spend tokens on behalf of the owner.
    // This is necessary for the registerOperator function, which transfers tokens from the owner.
    await reputationToken
      .connect(owner)
      .approve(await operator.getAddress(), ethers.parseEther("5000"));
  });

  describe("Deployment", function () {
    it("Should set the correct reputation token address", async function () {
      expect(await operator.reputationToken()).to.equal(
        await reputationToken.getAddress()
      );
    });

    it("Should grant owner role to deployer", async function () {
      const ownerRole = await operator.OWNER_ROLE();
      expect(await operator.hasRole(ownerRole, owner.address)).to.be.true;
    });
  });

  describe("Admin Management", function () {
    it("Should allow owner to add admin", async function () {
      const adminRole = await operator.ADMIN_ROLE();
      await operator.addAdmin(admin.address);
      expect(await operator.hasRole(adminRole, admin.address)).to.be.true;
    });

    it("Should not allow admin to add new admin", async function () {
      // First, add admin
      await operator.addAdmin(admin.address);
      // Then, try to add another admin using the admin account
      await expect(operator.connect(admin).addAdmin(user.address)).to.be
        .reverted;
    });

    it("Should allow owner to remove admin", async function () {
      await operator.addAdmin(admin.address);
      await operator.removeAdmin(admin.address);
      const adminRole = await operator.ADMIN_ROLE();
      expect(await operator.hasRole(adminRole, admin.address)).to.be.false;
    });

    it("Should not allow owner to remove themselves", async function () {
      await expect(operator.removeAdmin(owner.address)).to.be.revertedWith(
        "Cannot remove self"
      );
    });

    it("Should not allow admin to remove another admin", async function () {
      await operator.addAdmin(admin.address);
      await expect(operator.connect(admin).removeAdmin(user.address)).to.be
        .reverted;
    });

    it("Should not allow non-admin to add admin", async function () {
      await expect(operator.connect(user).addAdmin(admin.address)).to.be
        .reverted;
    });
  });

  describe("Operator Registration", function () {
    it("Should register operator and transfer 500 tokens", async function () {
      await expect(operator.registerOperator(operatorAddress.address))
        .to.emit(operator, "OperatorRegistered")
        .withArgs(operatorAddress.address);

      const operatorInfo = await operator.getOperatorInfo(
        operatorAddress.address
      );
      expect(operatorInfo.registered).to.be.true;
      // IMPORTANT: If your contract (Operator.sol) transfers 500 whole tokens
      // If it's literally `500` wei, then `500` is correct. Assume 18 decimals for now.
      expect(await reputationToken.balanceOf(operatorAddress.address)).to.equal(
        ethers.parseEther("500")
      );
    });

    it("Should not allow registering the same operator twice", async function () {
      await operator.registerOperator(operatorAddress.address);
      await expect(
        operator.registerOperator(operatorAddress.address)
      ).to.be.revertedWith("Already registered");
    });

    it("Should not allow non-admin to register operator", async function () {
      await expect(
        operator.connect(user).registerOperator(operatorAddress.address)
      ).to.be.reverted;
    });
  });

  describe("Token Spending", function () {
    beforeEach(async function () {
      await operator.registerOperator(operatorAddress.address);
    });

    it("Should allow registered operator to spend skyTokens", async function () {
      const tokenAmount = ethers.parseEther("1");
      await expect(
        operator.connect(operatorAddress).spendTokens({ value: tokenAmount })
      )
        .to.emit(operator, "Sent")
        .withArgs(operatorAddress.address, tokenAmount);
    });

    it("Should not allow spending without skyTokens", async function () {
      await expect(operator.connect(operatorAddress).spendTokens()).to.be
        .reverted;
    });
    it("Should not allow unregistered operator to spend", async function () {
      await expect(
        operator.connect(user).spendTokens({ value: ethers.parseEther("1") })
      ).to.be.reverted;
    });
  });

  describe("Operator Penalization", function () {
    beforeEach(async function () {
      await operator.registerOperator(operatorAddress.address);
      // Operator approves contract to spend their tokens
      // This 1000 should be in the same units as the token's balance.
      // If reputationToken handles 18 decimals, and 1000 means 1000 * 10^18, then use parseEther.
      await reputationToken
        .connect(operatorAddress)
        .approve(await operator.getAddress(), ethers.parseEther("1000"));
    });

    it("Should penalize operator with sufficient tokens", async function () {
      const penalty = ethers.parseEther("100"); // Use parseEther for consistency
      const ownerBalanceBefore = await reputationToken.balanceOf(owner.address);
      await expect(operator.penalizeOperator(operatorAddress.address, penalty))
        .to.emit(operator, "OperatorPenalized")
        .withArgs(operatorAddress.address, penalty);

      // Expect a reduction of 100 tokens (100 * 10^18)
      // Initial reputation from registration was 500 (ethers.parseEther("500"))
      // So after 100 penalty, it should be 400.
      expect(await reputationToken.balanceOf(operatorAddress.address)).to.equal(
        ethers.parseEther("400")
      );

      // Owner should receive the penalty amount
      // The admin who penalizes (owner in this case) should receive the penalty amount
      expect(await reputationToken.balanceOf(owner.address)).to.equal(
        ownerBalanceBefore + penalty
      );
    });
    it("Should not penalize unregistered operator", async function () {
      await expect(
        operator.penalizeOperator(user.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Not registered");
    });

    it("Should not penalize if operator has insufficient tokens", async function () {
      await expect(
        operator.penalizeOperator(
          operatorAddress.address,
          ethers.parseEther("1000")
        )
      ).to.be.revertedWith("Insufficient reputation tokens");
    });

    it("Should not allow non-admin to penalize", async function () {
      await expect(
        operator
          .connect(user)
          .penalizeOperator(operatorAddress.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });
  });

  describe("Reputation Query", function () {
    it("Should return correct reputation balance", async function () {
      await operator.registerOperator(operatorAddress.address);
      expect(await operator.getReputation(operatorAddress.address)).to.equal(
        ethers.parseEther("500")
      );
    });

    it("Should return zero for unregistered operator", async function () {
      expect(await operator.getReputation(user.address)).to.equal(0);
    });
  });
  
  describe("Get All Operators", function () {
  it("Should return empty array when no operators are registered", async function () {
    const allOperators = await operator.getAllOperators();
    expect(allOperators.length).to.equal(0);
  });

  it("Should return all registered operators", async function () {
    // Register multiple operators
    await operator.registerOperator(operatorAddress.address);
    
    // Mint tokens to owner so they can transfer to the second operator
    await reputationToken.mint(owner.address, ethers.parseEther("500"));
    
    // Register another operator
    await operator.registerOperator(user.address);
    
    // Get all operators
    const allOperators = await operator.getAllOperators();
    
    // Check if the array has the correct length
    expect(allOperators.length).to.equal(2);
    
    // Check if the array contains both registered operators
    expect(allOperators).to.include(operatorAddress.address);
    expect(allOperators).to.include(user.address);
  });
  
  it("Should maintain registration order", async function () {
    // Register operators in specific order
    await operator.registerOperator(operatorAddress.address);
    
    // Mint tokens to owner so they can transfer to the second operator
    await reputationToken.mint(owner.address, ethers.parseEther("500"));
    
    await operator.registerOperator(user.address);
    
    const allOperators = await operator.getAllOperators();
    
    // First registered should be at index 0, second at index 1
    expect(allOperators[0]).to.equal(operatorAddress.address);
    expect(allOperators[1]).to.equal(user.address);
  });
});
});
