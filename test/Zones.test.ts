import { expect } from "chai";
import { ethers } from "hardhat";
import { Zones } from "../typechain-types";
import { Signer } from "ethers";

enum ZoneType {
  RURAL,
  URBAN,
  HOSPITALS,
  MILITARY,
  RESTRICTED
}

interface Coordinates {
  latitude: bigint;
  longitude: bigint;
}

describe("Zones", function () {
  let zones: Zones;
  let owner: Signer;
  let addr1: Signer;

  const sampleBoundaries: Coordinates[] = [
    { latitude: 45123456n, longitude: 9123456n },
    { latitude: 45123500n, longitude: 9123500n },
    { latitude: 45123600n, longitude: 9123400n }
  ];

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const ZonesFactory = await ethers.getContractFactory("Zones");
    zones = (await ZonesFactory.deploy()) as Zones;
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await zones.owner()).to.equal(await owner.getAddress());
    });

    it("should initialize with zero zones", async function () {
      expect(await zones.getTotalZones()).to.equal(0);
    });
  });

  describe("Zone Creation", function () {
    it("should create a zone successfully and emit event", async function () {
      const tx = await zones.createZone(
        "Test Zone",
        ZoneType.RURAL,
        sampleBoundaries,
        100,
        0,
        "A test rural zone"
      );
      await expect(tx)
        .to.emit(zones, "ZoneCreated")
        .withArgs(1, "Test Zone", ZoneType.RURAL);

      expect(await zones.getTotalZones()).to.equal(1);
      expect(await zones.zoneExists(1)).to.be.true;
    });

    it("should revert with empty name", async function () {
      await expect(
        zones.createZone(
          "",
          ZoneType.RURAL,
          sampleBoundaries,
          100,
          0,
          "Description"
        )
      ).to.be.revertedWith("Zone name cannot be empty");
    });

    it("should revert with less than 3 boundaries", async function () {
      await expect(
        zones.createZone(
          "Bad Zone",
          ZoneType.RURAL,
          [{ latitude: 1n, longitude: 2n }],
          100,
          0,
          "Description"
        )
      ).to.be.revertedWith("Zone must have at least 3 boundary points");
    });

    it("should revert if maxAltitude < minAltitude", async function () {
      await expect(
        zones.createZone(
          "Bad Altitude",
          ZoneType.RURAL,
          sampleBoundaries,
          10,
          20,
          "Description"
        )
      ).to.be.revertedWith("Max altitude must be >= min altitude");
    });
  });

  describe("Zone Updates", function () {
    beforeEach(async function () {
      await zones.createZone(
        "Original Zone",
        ZoneType.RURAL,
        sampleBoundaries,
        100,
        0,
        "Original description"
      );
    });

    it("should update zone successfully and emit event", async function () {
      const newBoundaries = [
        { latitude: 46123456n, longitude: 10123456n },
        { latitude: 46123500n, longitude: 10123500n },
        { latitude: 46123600n, longitude: 10123400n }
      ];

      const tx = await zones.updateZone(
        1,
        "Updated Zone",
        newBoundaries,
        200,
        10,
        "Updated description"
      );
      await expect(tx)
        .to.emit(zones, "ZoneUpdated")
        .withArgs(1, "Updated Zone");

      const zone = await zones.getZone(1);
      expect(zone.name).to.equal("Updated Zone");
      expect(zone.maxAltitude).to.equal(200);
      expect(zone.minAltitude).to.equal(10);
      expect(zone.description).to.equal("Updated description");

      const boundaries = await zones.getZoneBoundaries(1);
      expect(boundaries.length).to.equal(newBoundaries.length);
    });

    it("should revert when updating non-existent zone", async function () {
      await expect(
        zones.updateZone(
          999,
          "Non-existent Zone",
          sampleBoundaries,
          100,
          0,
          "Description"
        )
      ).to.be.revertedWith("Zone does not exist");
    });

    it("should only allow owner to update zones", async function () {
      await expect(
        zones.connect(addr1).updateZone(
          1,
          "Unauthorized Update",
          sampleBoundaries,
          100,
          0,
          "Description"
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert with empty name on update", async function () {
      await expect(
        zones.updateZone(
          1,
          "",
          sampleBoundaries,
          100,
          0,
          "Description"
        )
      ).to.be.revertedWith("Zone name cannot be empty");
    });

    it("should revert with less than 3 boundaries on update", async function () {
      await expect(
        zones.updateZone(
          1,
          "Zone",
          [{ latitude: 1n, longitude: 2n }],
          100,
          0,
          "Description"
        )
      ).to.be.revertedWith("Zone must have at least 3 boundary points");
    });

    it("should revert if maxAltitude < minAltitude on update", async function () {
      await expect(
        zones.updateZone(
          1,
          "Zone",
          sampleBoundaries,
          0,
          100,
          "Description"
        )
      ).to.be.revertedWith("Max altitude must be >= min altitude");
    });
  });

  describe("Zone Status", function () {
    beforeEach(async function () {
      await zones.createZone(
        "Zone Status",
        ZoneType.RURAL,
        sampleBoundaries,
        100,
        0,
        "Status test"
      );
    });

    it("should set zone status and emit event", async function () {
      const tx = await zones.setZoneStatus(1, false);
      await expect(tx)
        .to.emit(zones, "ZoneStatusChanged")
        .withArgs(1, false);

      const zone = await zones.getZone(1);
      expect(zone.isActive).to.be.false;
    });

    it("should revert when setting status for non-existent zone", async function () {
      await expect(zones.setZoneStatus(999, true)).to.be.revertedWith("Zone does not exist");
    });

    it("should only allow owner to set zone status", async function () {
      await expect(zones.connect(addr1).setZoneStatus(1, false)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Zone Deletion", function () {
    beforeEach(async function () {
      await zones.createZone(
        "Zone to Delete",
        ZoneType.MILITARY,
        sampleBoundaries,
        100,
        0,
        "Will be deleted"
      );
    });

    it("should delete zone successfully and emit event", async function () {
      const tx = await zones.deleteZone(1);
      await expect(tx)
        .to.emit(zones, "ZoneDeleted")
        .withArgs(1);

      expect(await zones.zoneExists(1)).to.be.false;
      await expect(zones.getZone(1)).to.be.revertedWith("Zone does not exist");
    });

    it("should revert when deleting non-existent zone", async function () {
      await expect(zones.deleteZone(999)).to.be.revertedWith("Zone does not exist");
    });

    it("should only allow owner to delete zones", async function () {
      await expect(zones.connect(addr1).deleteZone(1)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Zone Queries", function () {
    beforeEach(async function () {
      await zones.createZone(
        "Zone1",
        ZoneType.RURAL,
        sampleBoundaries,
        100,
        0,
        "Zone1"
      );
      await zones.createZone(
        "Zone2",
        ZoneType.RURAL,
        sampleBoundaries,
        100,
        0,
        "Zone2"
      );
      await zones.createZone(
        "Zone3",
        ZoneType.URBAN,
        sampleBoundaries,
        100,
        0,
        "Zone3"
      );
      // Deactivate Zone2
      await zones.setZoneStatus(2, false);
    });

    it("should return correct zone data", async function () {
      const zone = await zones.getZone(1);
      expect(zone.id).to.equal(1);
      expect(zone.name).to.equal("Zone1");
    });

    it("should return correct boundaries", async function () {
      const boundaries = await zones.getZoneBoundaries(1);
      expect(boundaries.length).to.equal(sampleBoundaries.length);
      expect(boundaries[0].latitude).to.equal(sampleBoundaries[0].latitude);
    });

    it("should revert getZone for non-existent zone", async function () {
      await expect(zones.getZone(999)).to.be.revertedWith("Zone does not exist");
    });

    it("should revert getZoneBoundaries for non-existent zone", async function () {
      await expect(zones.getZoneBoundaries(999)).to.be.revertedWith("Zone does not exist");
    });

    it("should return correct zones by type", async function () {
      const ruralZones = await zones.getZonesByType(ZoneType.RURAL);
      expect(ruralZones.map(Number)).to.include(1).and.to.include(2);
      const urbanZones = await zones.getZonesByType(ZoneType.URBAN);
      expect(urbanZones.map(Number)).to.include(3);
    });

    it("should return correct active zones by type", async function () {
      const activeRural = await zones.getActiveZonesByType(ZoneType.RURAL);
      expect(activeRural.map(Number)).to.include(1);
      expect(activeRural.map(Number)).to.not.include(2); // Zone2 is inactive
    });

    it("should return true for existing zone and false for non-existent", async function () {
      expect(await zones.zoneExists(1)).to.be.true;
      expect(await zones.zoneExists(999)).to.be.false;
    });

    it("should return correct total zones", async function () {
      expect(await zones.getTotalZones()).to.equal(3);
    });
  });
});