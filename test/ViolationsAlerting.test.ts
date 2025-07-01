import { expect } from "chai";
import { ethers } from "hardhat";
import { ViolationsAlerting } from "../typechain-types/contracts";
import { Signer } from "ethers";

describe("ViolationsAlerting", function () {
  let violationsAlerting: ViolationsAlerting;
  let owner: Signer;
  let addr1: Signer;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const ViolationsAlertingFactory = await ethers.getContractFactory("ViolationsAlerting");
    violationsAlerting = (await ViolationsAlertingFactory.deploy()) as ViolationsAlerting;
  });

  describe("reportViolation", function () {
    it("should store the violation data and emit an event", async function () {
      const droneID = "DRONE123";
      const position = "45.4642,9.1900"; // Milano coords for example

      const tx = await violationsAlerting.reportViolation(droneID, position);

      // Verify event emission
      await expect(tx)
        .to.emit(violationsAlerting, "ViolationReported")
        .withArgs(droneID, position, await getBlockTimestamp(tx.blockNumber));

      // Verify violation data stored
      const violation = await violationsAlerting.getViolation(0);
      expect(violation[0]).to.equal(droneID);
      expect(violation[1]).to.equal(position);
      expect(violation[2]).to.be.a("bigint");
    });

    it("should track multiple violations", async function () {
      await violationsAlerting.reportViolation("DRONE123", "45.4642,9.1900");
      await violationsAlerting.reportViolation("DRONE456", "41.9028,12.4964"); // Roma

      const count = await violationsAlerting.getViolationsCount();
      expect(count).to.equal(2);

      const v1 = await violationsAlerting.getViolation(0);
      const v2 = await violationsAlerting.getViolation(1);

      expect(v1[0]).to.equal("DRONE123");
      expect(v2[0]).to.equal("DRONE456");
    });
  });

  describe("getViolationsByDrone", function () {
    it("should return only positions for the specified drone", async function () {
      await violationsAlerting.reportViolation("DRONE123", "45.4642,9.1900");
      await violationsAlerting.reportViolation("DRONE456", "41.9028,12.4964");
      await violationsAlerting.reportViolation("DRONE123", "48.8566,2.3522"); // Parigi

      const result = await violationsAlerting.getViolationsByDrone("DRONE123");
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
      await violationsAlerting.reportViolation("DRONE123", "45.4642,9.1900");
      await violationsAlerting.reportViolation("DRONE456", "41.9028,12.4964");

      const result = await violationsAlerting.getAllViolations();
      const droneIDs = result[0];
      const positions = result[1];
      const timestamps = result[2];

      expect(droneIDs.length).to.equal(2);
      expect(droneIDs[0]).to.equal("DRONE123");
      expect(droneIDs[1]).to.equal("DRONE456");

      expect(positions[0]).to.equal("45.4642,9.1900");
      expect(positions[1]).to.equal("41.9028,12.4964");

      expect(timestamps[0]).to.be.a("bigint");
      expect(timestamps[1]).to.be.a("bigint");
    });
  });
});

// 🔹 Helper function per timestamp
async function getBlockTimestamp(blockNumber: number): Promise<number> {
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
}
