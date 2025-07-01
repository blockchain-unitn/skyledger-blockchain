import { expect } from "chai";
import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const VIOLATIONS_ALERTING_ADDRESS = process.env.VIOLATIONS_ALERTING_ADDRESS || "";
const PRIVATE_KEY_1 = process.env.PRIVATE_KEY_1 || "";

describe("ViolationsAlerting", function () {
  let violationsAlerting: any;
  let addr1: string;

  before(async function () {
    if (!VIOLATIONS_ALERTING_ADDRESS || !PRIVATE_KEY_1) {
      throw new Error("Missing environment variables. Please check your .env file.");
    }

    violationsAlerting = await ethers.getContractAt(
        "ViolationsAlerting",
        VIOLATIONS_ALERTING_ADDRESS
    );

    const signer1 = await ethers.provider.getSigner(0);
    addr1 = await signer1.getAddress();
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
      await (await violationsAlerting.reportViolation("DRONE125", "41.9028,12.4964")).wait();
      await (await violationsAlerting.reportViolation("DRONE456", "41.9028,12.4964")).wait();

    const count = await violationsAlerting.getViolationsCount();
    expect(count).to.equal(3); // 1 from previous test + 2 new violations

      const v1 = await violationsAlerting.getViolation(1);
      const v2 = await violationsAlerting.getViolation(2);

      expect(v1[0]).to.equal("DRONE125");
      expect(v2[0]).to.equal("DRONE456");
    });
  });

  describe("getViolationsByDrone", function () {
    it("should return only positions for the specified drone", async function () {
      await(await violationsAlerting.reportViolation("DRONE124", "45.4642,9.1900")).wait();
      await(await violationsAlerting.reportViolation("DRONE456", "41.9028,12.4964")).wait();
      await(await violationsAlerting.reportViolation("DRONE124", "48.8566,2.3522")).wait(); // Parigi

      const result = await violationsAlerting.getViolationsByDrone("DRONE124");
      const positions = result[0];
      const timestamps = result[1];

      expect(positions.length).to.equal(2); // 2 from previous tests + 2 new violations
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

      expect(droneIDs.length).to.equal(6); // 4 from previous tests + 2 new violations
      expect(droneIDs[0]).to.equal("DRONE123");
      expect(droneIDs[1]).to.equal("DRONE125");

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
