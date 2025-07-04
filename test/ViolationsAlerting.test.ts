import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ViolationsAlerting,
  DroneIdentityNFT,
  ReputationToken,
  Operator,
} from "../typechain-types";
import { Signer } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

enum DroneType {
  Medical,
  Cargo,
  Surveillance,
  Agricultural,
  Recreational,
  Mapping,
  Militar,
}

describe("ViolationsAlerting", function () {
  let violationsAlerting: ViolationsAlerting;
  let droneIdentityNFT: DroneIdentityNFT;
  let reputationToken: ReputationToken; // Assuming ReputationToken is not used in this test
  let operator: Operator;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let operatorAddress: SignerWithAddress;
  let penalty: bigint;

  before(async function () {
    [owner, addr1, addr2, operatorAddress] = await ethers.getSigners();

    // Deploy DroneIdentityNFT first
    const DroneIdentityNFTFactory = await ethers.getContractFactory(
      "DroneIdentityNFT"
    );
    droneIdentityNFT = (await DroneIdentityNFTFactory.deploy()) as any;

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
    const operatorApproval = await reputationToken
      .connect(operatorAddress)
      .approve(await operator.getAddress(), ethers.parseEther("5000"));
    await operatorApproval.wait();

    // Approve the Operator contract to spend tokens on behalf of the owner
    const ownerApproval = await reputationToken
      .connect(owner)
      .approve(await operator.getAddress(), ethers.parseEther("5000"));
    await ownerApproval.wait();

    // Mint some test drones (drone ID 0 and 1)
    let mintTx = await droneIdentityNFT.mint(
      await operatorAddress.getAddress(),
      "0",
      "DJI Phantom 4",
      DroneType.Medical,
      ["cert1", "cert2"],
      [0, 1], // RURAL, URBAN zones
      [await operatorAddress.getAddress()],
      "maintenance1",
      0 // ACTIVE status
    );
    await mintTx.wait();

    mintTx = await droneIdentityNFT.mint(
      await operatorAddress.getAddress(),
      "1",
      "Parrot Anafi",
      DroneType.Cargo,
      ["cert3"],
      [2], // HOSPITALS zone
      [await operatorAddress.getAddress()],
      "maintenance2",
      0 // ACTIVE status
    );
    await mintTx.wait();

    // Deploy ViolationsAlerting with DroneIdentityNFT address
    const ViolationsAlertingFactory = await ethers.getContractFactory(
      "ViolationsAlerting"
    );
    penalty = ethers.parseEther("0.1"); // Set penalty amount
    violationsAlerting = (await ViolationsAlertingFactory.deploy(
      droneIdentityNFT.target,
      await operator.getAddress(),
      penalty
    )) as any;

    // Add the violationsAlerting contract as an admin to the Operator contract
    const response = await operator.addAdmin(
      await violationsAlerting.getAddress()
    );
    await response.wait();
  });

  describe("reportViolation", function () {
    beforeEach(async function () {
      // Ensure the operator is registered before each test
      const operatorInfo = await operator.getOperatorInfo(
        await operatorAddress.getAddress()
      );
      if (!operatorInfo.registered) {
        await operator
          .connect(owner)
          .registerOperator(await operatorAddress.getAddress());
      }
      // Operator approves contract to spend their tokens
      // This 1000 should be in the same units as the token's balance.
      // If reputationToken handles 18 decimals, and 1000 means 1000 * 10^18, then use parseEther.
      await reputationToken
        .connect(owner)
        .approve(await operator.getAddress(), ethers.parseEther("1000"));
    });

    it("should store the violation data and emit an event for registered drone", async function () {
      const droneID = 0; // Use number, not string
      const position = "45.4642,9.1900"; // Milano coords for example

      // IMPORTANT: If your contract (Operator.sol) transfers 500 whole tokens
      // If it's literally `500` wei, then `500` is correct. Assume 18 decimals for now.
      expect(
        await reputationToken.balanceOf(await operatorAddress.getAddress())
      ).to.equal(ethers.parseEther("500"));

      const ownerBalanceBefore = await reputationToken.balanceOf(
        await owner.getAddress()
      );
      const operatorBalanceBefore = await reputationToken.balanceOf(
        await operatorAddress.getAddress()
      );
      //await expect(operator.penalizeOperator(operatorAddress.address, penalty)).to.emit(operator, "OperatorPenalized").withArgs(operatorAddress.address, penalty);

      const tx = await violationsAlerting
        .connect(owner)
        .reportViolation(droneID, position);
      await tx.wait();

      // Verify violation data stored
      /*const violation = await violationsAlerting.getViolation(0);
      expect(violation[0]).to.equal("0"); // Contract converts uint to string internally
      /*expect(violation[1]).to.equal(position);
      expect(violation[2]).to.be.a("bigint");*/

      expect(
        await reputationToken.balanceOf(await operatorAddress.getAddress())
      ).to.equal(operatorBalanceBefore - penalty);
      expect(
        await reputationToken.balanceOf(await owner.getAddress())
      ).to.equal(ownerBalanceBefore + penalty);
    });

    it("should track multiple violations for registered drones", async function () {
      // Report multiple violations for different drones
      const countBefore = await violationsAlerting.getViolationsCount();
      let tx = await violationsAlerting.reportViolation(0, "45.4642,9.1900"); // Drone 0
      await tx.wait();

      tx = await violationsAlerting.reportViolation(1, "41.9028,12.4964"); // Drone 1
      await tx.wait();

      const count = await violationsAlerting.getViolationsCount();
      expect(count).to.equal(countBefore + 2n);

      const v1 = await violationsAlerting.getViolation(countBefore);
      const v2 = await violationsAlerting.getViolation(countBefore + 1n);

      expect(v1[0]).to.equal("0");
      expect(v2[0]).to.equal("1");
    });

    it("should reject violation report for unregistered drone", async function () {
      const unregisteredDroneID = 999; // Use number, not string
      const position = "45.4642,9.1900";

      await expect(
        violationsAlerting.reportViolation(unregisteredDroneID, position)
      ).to.be.revertedWith("Drone is not registered on the blockchain");
    });
  });

  describe("getViolationsByDrone", function () {
    it("should return only positions for the specified registered drone", async function () {
      // Report violations for multiple drones
      const countBefore = await violationsAlerting.getViolationsByDrone("0");
      await violationsAlerting.reportViolation(0, "45.4642,9.1900"); // Drone 0
      await violationsAlerting.reportViolation(1, "41.9028,12.4964"); // Drone 1
      await violationsAlerting.reportViolation(0, "48.8566,2.3522"); // Drone 0 again

      const result = await violationsAlerting.getViolationsByDrone("0");
      const positions = result[0];
      const timestamps = result[1];

      expect(positions.length).to.equal(countBefore.positions.length + 2);
      expect(positions[countBefore.positions.length]).to.equal("45.4642,9.1900");
      expect(positions[countBefore.positions.length + 1]).to.equal("48.8566,2.3522");
      expect(timestamps[countBefore.timestamps.length]).to.be.a("bigint");
      expect(timestamps[countBefore.timestamps.length + 1]).to.be.a("bigint");
    });
  });

  describe("getAllViolations", function () {
    it("should return all violations with droneID, position, timestamp", async function () {
      // take the current count of violations
      const countBefore = await violationsAlerting.getAllViolations();
      // Report violations for multiple drones
      await violationsAlerting.reportViolation(0, "45.4642,9.1900"); // Drone 0
      await violationsAlerting.reportViolation(1, "41.9028,12.4964"); // Drone 1

      const result = await violationsAlerting.getAllViolations();
      const droneIDs = result[0];
      const positions = result[1];
      const timestamps = result[2];

      expect(droneIDs.length).to.equal(countBefore.droneIDs.length + 2);
      expect(droneIDs[countBefore.droneIDs.length]).to.equal("0");
      expect(droneIDs[countBefore.droneIDs.length + 1]).to.equal("1");

      expect(positions[countBefore.positions.length]).to.equal("45.4642,9.1900");
      expect(positions[countBefore.positions.length + 1]).to.equal("41.9028,12.4964");

      expect(timestamps[countBefore.timestamps.length]).to.be.a("bigint");
      expect(timestamps[countBefore.timestamps.length + 1]).to.be.a("bigint");
    });
  });

  describe("Drone Registration Verification", function () {
    it("should allow violation reporting for registered drones only", async function () {
      // take the current count of violations
      const countBefore = await violationsAlerting.getViolationsCount();
      // Should work for registered drone (ID 0)
      const tx = await violationsAlerting.reportViolation(0, "Test Position");
      await expect(tx).to.emit(violationsAlerting, "ViolationReported");

      const violation = await violationsAlerting.getViolation(countBefore);
      expect(violation[0]).to.equal("0");
      expect(violation[1]).to.equal("Test Position");
    });

    it("should reject violation reporting for unregistered drone IDs", async function () {
      await expect(
        violationsAlerting.reportViolation(999, "Test Position")
      ).to.be.revertedWith("Drone is not registered on the blockchain");
    });

    it("should verify drone registration through DroneIdentityNFT", async function () {
      // Test that we can verify drone 0 exists by checking its owner
      const owner0 = await droneIdentityNFT.ownerOf(0);
      expect(owner0).to.equal(await operatorAddress.getAddress());

      const owner1 = await droneIdentityNFT.ownerOf(1);
      expect(owner1).to.equal(await operatorAddress.getAddress());

      // Non-existent drone should revert
      await expect(droneIdentityNFT.ownerOf(999)).to.be.reverted;
    });
  });
});

// 🔹 Helper function per timestamp
async function getBlockTimestamp(blockNumber: number): Promise<number> {
  const block = await ethers.provider.getBlock(blockNumber);
  return block?.timestamp || 0;
}
