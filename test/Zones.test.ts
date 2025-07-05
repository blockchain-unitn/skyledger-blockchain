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
  let addr2: Signer;

  const sampleBoundaries: Coordinates[] = [
    { latitude: 45123456n, longitude: 9123456n },
    { latitude: 45123500n, longitude: 9123500n },
    { latitude: 45123600n, longitude: 9123400n },
    { latitude: 45123400n, longitude: 9123300n }
  ];

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
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
    it("should create a zone successfully", async function () {
      const tx = await zones.createZone(
        "Test Zone",
        ZoneType.RURAL,
        sampleBoundaries,
        100, // maxAltitude
        0,   // minAltitude
        "A test rural zone"
      );

      await expect(tx)
        .to.emit(zones, "ZoneCreated")
        .withArgs(1, "Test Zone", ZoneType.RURAL);

      expect(await zones.getTotalZones()).to.equal(1);
      expect(await zones.zoneExists(1)).to.be.true;
    });

    it("should store zone data correctly", async function () {
      await zones.createZone(
        "Hospital Zone",
        ZoneType.HOSPITALS,
        sampleBoundaries,
        50,
        10,
        "No-fly zone around hospital"
      );

      const zone = await zones.getZone(1);
      expect(zone.id).to.equal(1);
      expect(zone.name).to.equal("Hospital Zone");
      expect(zone.zoneType).to.equal(ZoneType.HOSPITALS);
      expect(zone.maxAltitude).to.equal(50);
      expect(zone.minAltitude).to.equal(10);
      expect(zone.isActive).to.be.true;
      expect(zone.description).to.equal("No-fly zone around hospital");
      expect(zone.createdAt).to.be.greaterThan(0);
      expect(zone.updatedAt).to.be.greaterThan(0);
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

    it("should update zone successfully", async function () {
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

    it("should delete zone successfully", async function () {
      const tx = await zones.deleteZone(1);

      await expect(tx)
        .to.emit(zones, "ZoneDeleted")
        .withArgs(1);

      expect(await zones.zoneExists(1)).to.be.false;
      
      await expect(zones.getZone(1)).to.be.revertedWith("Zone does not exist");
    });

    it("should revert when deleting non-existent zone", async function () {
      await expect(
        zones.deleteZone(999)
      ).to.be.revertedWith("Zone does not exist");
    });

    it("should only allow owner to delete zones", async function () {
      await expect(
        zones.connect(addr1).deleteZone(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});