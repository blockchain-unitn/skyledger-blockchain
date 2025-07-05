import { ethers } from "hardhat";
import { expect } from "chai";
import { RoutePermission, DroneIdentityNFT, DroneIdentityNFT__factory } from "../typechain-types";
import { Signer } from "ethers";

enum PreAuthorizationStatus {
  APPROVED,
  FAILED
}

enum DroneType {
  MEDICAL,
  CARGO,
  SURVEILLANCE,
  AGRICULTURAL,
  RECREATIONAL,
  MAPPING,
  MILITAR
}

enum ZoneType {
  RURAL,
  URBAN,
  HOSPITALS,
  MILITARY,
  RESTRICTED
}

describe("RoutePermission", function () {
  let routePermission: RoutePermission;
  let droneIdentityNFT: DroneIdentityNFT;
  let owner: Signer;
  let addr1: Signer;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const factory: DroneIdentityNFT__factory = await ethers.getContractFactory("DroneIdentityNFT");
    droneIdentityNFT = await (await factory.deploy());
    await droneIdentityNFT.waitForDeployment();

    const RoutePermissionFactory = await ethers.getContractFactory("RoutePermission");
    routePermission = await RoutePermissionFactory.deploy(droneIdentityNFT) as RoutePermission;
    await routePermission.waitForDeployment();
  });

  it("should approve route authorization for authorized drone", async function () {
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-001",
      "DJI Matrice 350",
      DroneType.MEDICAL,
      ["certA", "certB"],
      [ZoneType.RURAL, ZoneType.URBAN],
      ["Owner1"],
      "QmMaint1",
      0 // ACTIVE
    );

    const tokenId = (await droneIdentityNFT.getAllDrones())[0];

    const resp = await routePermission.checkRouteAuthorization({
      droneId: tokenId,
      route: { zones: [ZoneType.RURAL], altitudeLimit: 100 }
    });

    const [droneIdResp, preauthorizationStatus, reason] = resp;
    expect(Number(droneIdResp)).to.equal(Number(tokenId));
    expect(preauthorizationStatus).to.equal(PreAuthorizationStatus.APPROVED);
    expect(reason).to.equal("");
  });

  it("should fail route authorization for unauthorized zone", async function () {
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-002",
      "DJI Matrice 350",
      DroneType.MEDICAL,
      ["certA", "certB"],
      [ZoneType.RURAL],
      ["Owner1"],
      "QmMaint1",
      0 // ACTIVE
    );

    const tokenId = (await droneIdentityNFT.getAllDrones())[0];

    const resp = await routePermission.checkRouteAuthorization({
      droneId: tokenId,
      route: { zones: [ZoneType.MILITARY], altitudeLimit: 100 }
    });

    const [droneIdResp, preauthorizationStatus, reason] = resp;
    expect(Number(droneIdResp)).to.equal(Number(tokenId));
    expect(preauthorizationStatus).to.equal(PreAuthorizationStatus.FAILED);
  });

  it("should fail if drone is not active", async function () {
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-003",
      "Drone C",
      DroneType.MEDICAL,
      [],
      [ZoneType.RURAL],
      [],
      "QmMaint",
      0 // ACTIVE
    );

    const tokenId = (await droneIdentityNFT.getAllDrones())[0];

    // Change status to something not ACTIVE (e.g., 1 = IN_MAINTENANCE)
    await droneIdentityNFT.updateStatus(tokenId, 1);

    const resp = await routePermission.checkRouteAuthorization({
      droneId: tokenId,
      route: { zones: [ZoneType.RURAL], altitudeLimit: 100 }
    });

    const [droneIdResp, preauthorizationStatus, reason] = resp;
    expect(Number(droneIdResp)).to.equal(Number(tokenId));
    expect(preauthorizationStatus).to.equal(PreAuthorizationStatus.FAILED);
  });

  it("should fail if no zones are specified", async function () {
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-004",
      "Drone D",
      DroneType.MEDICAL,
      [],
      [ZoneType.RURAL],
      [],
      "QmMaint",
      0 // ACTIVE
    );

    const tokenId = (await droneIdentityNFT.getAllDrones())[0];

    const resp = await routePermission.checkRouteAuthorization({
      droneId: tokenId,
      route: { zones: [], altitudeLimit: 100 }
    });

    const [droneIdResp, preauthorizationStatus, reason] = resp;
    expect(Number(droneIdResp)).to.equal(Number(tokenId));
    expect(preauthorizationStatus).to.equal(PreAuthorizationStatus.FAILED);
  });

  it("should fail if drone does not exist", async function () {
    const resp = await routePermission.checkRouteAuthorization({
      droneId: 9999,
      route: { zones: [ZoneType.RURAL], altitudeLimit: 100 }
    });

    const [droneIdResp, preauthorizationStatus, reason] = resp;
    expect(Number(droneIdResp)).to.equal(9999);
    expect(preauthorizationStatus).to.equal(PreAuthorizationStatus.FAILED);
  });

  it("should return correct AuthorizationRequestLog from getAuthorizationLog", async function () {
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-008",
      "Drone F",
      DroneType.MEDICAL,
      [],
      [ZoneType.RURAL],
      [],
      "QmMaint",
      0 // ACTIVE
    );
    const tokenId = (await droneIdentityNFT.getAllDrones())[0];

    // Call requestRouteAuthorization to create a log
    const tx = await routePermission.requestRouteAuthorization({
      droneId: tokenId,
      route: { zones: [ZoneType.RURAL], altitudeLimit: 100 }
    });
    const receipt = await tx.wait();
    // Find the block timestamp from the transaction receipt
    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    if (!block) {
      throw new Error("Block not found");
    }
    const timestamp = block.timestamp;

    const log = await routePermission.getAuthorizationLog(timestamp);
    expect(Number(log.droneId)).to.equal(Number(tokenId));
    expect(log.route.zones[0]).to.equal(ZoneType.RURAL);
    expect(log.preauthorizationStatus).to.equal(PreAuthorizationStatus.APPROVED);
    expect(Number(log.timestamp)).to.equal(Number(timestamp));
  });

  it("should return all AuthorizationRequestLogs from getAllAuthorizationLogs", async function () {
    // Mint two drones and request authorization for both
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-009",
      "Drone G",
      DroneType.MEDICAL,
      [],
      [ZoneType.RURAL],
      [],
      "QmMaint",
      0 // ACTIVE
    );
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-010",
      "Drone H",
      DroneType.SURVEILLANCE,
      [],
      [ZoneType.URBAN],
      [],
      "QmMaint2",
      0 // ACTIVE
    );
    const drones = await droneIdentityNFT.getAllDrones();
    const id1 = drones[drones.length - 2];
    const id2 = drones[drones.length - 1];

    await routePermission.requestRouteAuthorization({
      droneId: id1,
      route: { zones: [ZoneType.RURAL], altitudeLimit: 100 }
    });
    await routePermission.requestRouteAuthorization({
      droneId: id2,
      route: { zones: [ZoneType.URBAN], altitudeLimit: 100 }
    });

    const logs = await routePermission.getAllAuthorizationLogs();
    // There may be logs from previous tests, so just check the last two
    const lastLogs = logs.slice(-2);
    expect(Number(lastLogs[0].droneId)).to.equal(Number(id1));
    expect(lastLogs[0].route.zones[0]).to.equal(ZoneType.RURAL);
    expect(Number(lastLogs[1].droneId)).to.equal(Number(id2));
    expect(lastLogs[1].route.zones[0]).to.equal(ZoneType.URBAN);
  });

  it("should return empty AuthorizationRequestLog for non-existent timestamp", async function () {
    // 1234567890 is a timestamp that should not exist
    const log = await routePermission.getAuthorizationLog(1234567890);
    // Solidity returns default struct values if not found
    expect(Number(log.droneId)).to.equal(0);
    expect(log.reason).to.equal("");
    expect(Number(log.timestamp)).to.equal(0);
    expect(log.route.zones.length).to.equal(0);
  });

  it("should emit event on requestRouteAuthorization", async function () {
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-005",
      "DJI Matrice 350",
      DroneType.MEDICAL,
      ["certA", "certB"],
      [ZoneType.RURAL],
      ["Owner1"],
      "QmMaint1",
      0 // ACTIVE
    );

    const tokenId = (await droneIdentityNFT.getAllDrones())[0];

    await expect(
      routePermission.requestRouteAuthorization({
        droneId: tokenId,
        route: { zones: [ZoneType.RURAL], altitudeLimit: 100 }
      })
    ).to.emit(routePermission, "RouteAuthorizationRequested");
  });

  it("should handle multiple drones with different permissions", async function () {
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-006",
      "Drone D",
      DroneType.MEDICAL,
      [],
      [ZoneType.RURAL, ZoneType.URBAN],
      [],
      "QmMaint1",
      0 // ACTIVE
    );
    await droneIdentityNFT.connect(owner).mint(
      await owner.getAddress(),
      "SN-TEST-007",
      "Drone E",
      DroneType.SURVEILLANCE,
      [],
      [ZoneType.MILITARY],
      [],
      "QmMaint2",
      0 // ACTIVE
    );

    const drones = await droneIdentityNFT.getAllDrones();
    const id1 = drones[drones.length - 2];
    const id2 = drones[drones.length - 1];

    // Drone D allowed in URBAN
    let resp = await routePermission.checkRouteAuthorization({
      droneId: id1,
      route: { zones: [ZoneType.URBAN], altitudeLimit: 100 }
    });
    expect(resp[1]).to.equal(PreAuthorizationStatus.APPROVED);

    // Drone D not allowed in MILITARY
    resp = await routePermission.checkRouteAuthorization({
      droneId: id1,
      route: { zones: [ZoneType.MILITARY], altitudeLimit: 100 }
    });
    expect(resp[1]).to.equal(PreAuthorizationStatus.FAILED);

    // Drone E allowed in MILITARY
    resp = await routePermission.checkRouteAuthorization({
      droneId: id2,
      route: { zones: [ZoneType.MILITARY], altitudeLimit: 100 }
    });
    expect(resp[1]).to.equal(PreAuthorizationStatus.APPROVED);
  });
});