import { expect } from "chai";
import { ethers } from "hardhat";
import { ViolationsAlerting, DroneIdentityNFT } from "../typechain-types";
import { Signer } from "ethers";

enum DroneType {
  Medical,
  Cargo,
  Surveillance,
  Agricultural,
  Recreational,
  Mapping,
  Militar
}

describe("ViolationsAlerting", function () {
  let violationsAlerting: ViolationsAlerting;
 let droneIdentityNFT: DroneIdentityNFT;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DroneIdentityNFT first
    const DroneIdentityNFTFactory = await ethers.getContractFactory("DroneIdentityNFT");
    droneIdentityNFT = await DroneIdentityNFTFactory.deploy() as any;

    // Deploy ViolationsAlerting with DroneIdentityNFT address
    const ViolationsAlertingFactory = await ethers.getContractFactory("ViolationsAlerting");
    violationsAlerting = await ViolationsAlertingFactory.deploy(droneIdentityNFT.target) as any;

    // Mint some test drones (drone ID 0 and 1)
    await droneIdentityNFT.mint(
      await addr1.getAddress(),
      "SN-001",
      "DJI Phantom 4",
      DroneType.Medical,
      ["cert1", "cert2"],
      [0, 1], // RURAL, URBAN zones
      ["owner1"],
      "maintenance1",
      0 // ACTIVE status
    );

    await droneIdentityNFT.mint(
      await addr2.getAddress(),
      "SN-002", 
      "Parrot Anafi",
      DroneType.Cargo,
      ["cert3"],
      [2], // HOSPITALS zone
      ["owner2"],
      "maintenance2",
      0 // ACTIVE status
    );
  });

  describe("reportViolation", function () {
    it("should store the violation data and emit an event for registered drone", async function () {
      const droneID = 0; // Use number, not string
      const position = "45.4642,9.1900"; // Milano coords for example

      const tx = await violationsAlerting.reportViolation(droneID, position);

      // Verify event emission (just check that it was emitted, don't check exact timestamp)
      await expect(tx)
        .to.emit(violationsAlerting, "ViolationReported");

      // Verify violation data stored
      const violation = await violationsAlerting.getViolation(0);
      expect(violation[0]).to.equal("0"); // Contract converts uint to string internally
      expect(violation[1]).to.equal(position);
      expect(violation[2]).to.be.a("bigint");
    });

    it("should track multiple violations for registered drones", async function () {
      await violationsAlerting.reportViolation(0, "45.4642,9.1900"); // Drone 0
      await violationsAlerting.reportViolation(1, "41.9028,12.4964"); // Drone 1

      const count = await violationsAlerting.getViolationsCount();
      expect(count).to.equal(2);

      const v1 = await violationsAlerting.getViolation(0);
      const v2 = await violationsAlerting.getViolation(1);

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
      await violationsAlerting.reportViolation(0, "45.4642,9.1900"); // Drone 0
      await violationsAlerting.reportViolation(1, "41.9028,12.4964"); // Drone 1
      await violationsAlerting.reportViolation(0, "48.8566,2.3522"); // Drone 0 again

      const result = await violationsAlerting.getViolationsByDrone("0");
      const positions = result[0];
      const timestamps = result[1];

      expect(positions.length).to.equal(2);
      expect(positions[0]).to.equal("45.4642,9.1900");
      expect(positions[1]).to.equal("48.8566,2.3522");
      expect(timestamps[0]).to.be.a("bigint");
      expect(timestamps[1]).to.be.a("bigint");
    });
  });

  describe("getAllViolations", function () {
    it("should return all violations with droneID, position, timestamp", async function () {
      await violationsAlerting.reportViolation(0, "45.4642,9.1900"); // Drone 0
      await violationsAlerting.reportViolation(1, "41.9028,12.4964"); // Drone 1

      const result = await violationsAlerting.getAllViolations();
      const droneIDs = result[0];
      const positions = result[1];
      const timestamps = result[2];

      expect(droneIDs.length).to.equal(2);
      expect(droneIDs[0]).to.equal("0");
      expect(droneIDs[1]).to.equal("1");

      expect(positions[0]).to.equal("45.4642,9.1900");
      expect(positions[1]).to.equal("41.9028,12.4964");

      expect(timestamps[0]).to.be.a("bigint");
      expect(timestamps[1]).to.be.a("bigint");
    });
  });

  describe("Drone Registration Verification", function () {
    it("should allow violation reporting for registered drones only", async function () {
      // Should work for registered drone (ID 0)
      const tx = await violationsAlerting.reportViolation(0, "Test Position");
      await expect(tx).to.emit(violationsAlerting, "ViolationReported");

      const violation = await violationsAlerting.getViolation(0);
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
      expect(owner0).to.equal(await addr1.getAddress());

      const owner1 = await droneIdentityNFT.ownerOf(1);
      expect(owner1).to.equal(await addr2.getAddress());

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
