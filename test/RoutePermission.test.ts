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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    await droneIdentityNFT.waitForDeployment()

    const RoutePermissionFactory = await ethers.getContractFactory("RoutePermission");
    routePermission = await RoutePermissionFactory.deploy(droneIdentityNFT) as RoutePermission;
    await routePermission.waitForDeployment()
  });

it("should approve route authorization for authorized drone", async function () {
  const tx = await droneIdentityNFT.connect(owner).mint(
    owner.getAddress(),
    "SN-TEST-001",
    "DJI Matrice 350",
    0,                // MEDICAL
    ["certA","certB"],
    [0, 1],            // ZoneType[]
    ["Owner1"],
    "QmMaint1",
    0                 // ACTIVE
  );
  await tx.wait();

  const tx2 = await droneIdentityNFT.connect(owner).mint(
    owner.getAddress(),
    "SN-TEST-001",
    "DJI Matrice 350",
    0,                // MEDICAL
    ["certA","certB"],
    [0, 1],            // ZoneType[]
    ["Owner1"],
    "QmMaint1",
    0                 // ACTIVE
  );
  await tx2.wait();

  const tokenId = await (await droneIdentityNFT.getAllDrones()).slice(-1)[0];

  const resp = await routePermission.checkRouteAuthorization({
    droneId: tokenId,
    route: {
      zones: [ 0 ],
      altitudeLimit: 100
    }
  });

  const [droneIdResp, preauthorizationStatus, reason] = resp;
  expect(droneIdResp).to.equal(Number(tokenId));
  expect(preauthorizationStatus).to.equal(PreAuthorizationStatus.APPROVED);
  expect(reason).to.equal("");
});






  it("should fail route authorization for unauthorized zone", async function () {
    const zones = [ZoneType.RURAL];
    const tx = await droneIdentityNFT.connect(owner).mint(
      owner.address,
        "SN-TEST-001",
        "DJI Matrice 350",
        0,                // MEDICAL
        ["certA","certB"],
        zones,            // ZoneType[]
        ["Owner1"],
        "QmMaint1",
        0                 // ACTIVE
    );
    await tx.wait();

    const tokenId = await (await droneIdentityNFT.getAllDrones()).slice(-1)[0];

    const resp = await routePermission.checkRouteAuthorization({
      droneId: tokenId,
      route: { zones: [ZoneType.MILITARY], altitudeLimit: 100 }
    });

    const [droneIdResp, preauthorizationStatus, reason] = resp;
    expect(Number(droneIdResp)).to.equal(Number(tokenId));
    expect(preauthorizationStatus).to.equal(PreAuthorizationStatus.FAILED);
    expect(reason).to.include("zone");
  });



  it("should fail if drone is not active", async function () {
    const zones = [ZoneType.RURAL];
    const tx = await droneIdentityNFT.connect(owner).mint(
      owner.address,
      "SN-TEST-001",
      "Drone C",
      DroneType.MEDICAL,
      [],
      zones,
      [],
      "QmMaint",
      0
    );
    await tx.wait();

    const tokenId = await (await droneIdentityNFT.getAllDrones()).slice(-1)[0];

    // Change status to something not ACTIVE (e.g., 1 = IN_MAINTENANCE)
    await droneIdentityNFT.updateStatus(tokenId, 1);

    const resp = await routePermission.checkRouteAuthorization({
      droneId: tokenId,
      route: { zones: [ZoneType.RURAL], altitudeLimit: 100 }
    });

    const [droneIdResp, preauthorizationStatus, reason] = resp;
    expect(Number(droneIdResp)).to.equal(Number(tokenId));
    expect(preauthorizationStatus).to.equal(PreAuthorizationStatus.FAILED);
    expect(reason).to.include("not active");
  });





  it("should handle multiple drones with different permissions", async function () {
    const zones1 = [ZoneType.RURAL, ZoneType.URBAN];
    const tx1 = await droneIdentityNFT.connect(owner).mint(
      owner.address,
      "SN-TEST-001",
      "Drone D",
      DroneType.MEDICAL,
      [],
      zones1,
      [],
      "QmMaint1",
      0
    );
    await tx1.wait();

    const zones2 = [ZoneType.MILITARY];
    const tx2 = await droneIdentityNFT.connect(owner).mint(
      owner.address,
      "SN-TEST-001",
      "Drone E",
      DroneType.SURVEILLANCE,
      [],
      zones2,
      [],
      "QmMaint2",
      0
    );
    await tx2.wait();

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
