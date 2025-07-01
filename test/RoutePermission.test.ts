import { ethers } from "hardhat";
import { expect } from "chai";
import { RoutePermission, DroneIdentityNFT } from "../typechain-types";
import { Signer } from "ethers";

enum PreAuthorizationStatus {
    APPROVED,
    FAILED
}

enum ZoneType {
    RURAL,
    URBAN,
    HOSPITALS,
    MILITARY,
    RESTRICTED
}
enum DroneType {
  Medical,
  Cargo,
  Surveillance,
  Agricultural,
  Recreational,
  Mapping,
  Militar
}

describe("RoutePermission", function () {
  let routePermission: RoutePermission;
  let droneIdentityNFT: DroneIdentityNFT;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const DroneIdentityNFTFactory = await ethers.getContractFactory("DroneIdentityNFT");
    droneIdentityNFT = (await DroneIdentityNFTFactory.deploy()) as DroneIdentityNFT;

    const RoutePermissionFactory = await ethers.getContractFactory("RoutePermission");
    routePermission = await RoutePermissionFactory.deploy(droneIdentityNFT) as RoutePermission;
    
  });

  it("should approve route authorization for authorized drone", async function () {
    const now = Math.floor(Date.now() / 1000);
    const zones = [ZoneType.RURAL];
    const periods = [
      {
        daysWeek: [1, 2, 3, 4, 5],
        from: now - 3600,
        to: now + 3600,
      },
    ];
    const permissionsJson = JSON.stringify({ zones: zones.map(z => ZoneType[z]), periods });

    const tx = await droneIdentityNFT.connect(owner).mint(
      owner.address,
      "Drone A",
      DroneType.Medical,
      [],
      permissionsJson,
      [],
      "QmMaint"
    );
    await tx.wait();

    const tokenId = (await droneIdentityNFT.getAllDrones()).slice(-1)[0];

    await droneIdentityNFT.setDronePermissions(tokenId, zones, periods);

    const route = {
      zones: zones,
      altitudeLimit: 500,
    };
    const startTime = now;
    const endTime = now + 300;
    const daysOfWeek = [2];

    const resp = await routePermission.checkRouteAuthorization({
      droneId: tokenId,
      route,
      startTime,
      endTime,
      daysOfWeek,
    });

    const [droneIdResp, preauthorizationStatus, reason] = resp;
    expect(Number(droneIdResp)).to.equal(Number(tokenId));
    expect(Number(preauthorizationStatus)).to.equal(PreAuthorizationStatus.APPROVED);
    expect(reason).to.equal("");
  });
  it("should fail route authorization for unauthorized zone", async function () {
  
          const now = Math.floor(Date.now() / 1000);
          const certs = ["sha256-certX", "sha256-certY"];
          const ownerHistory = ["QmOwner1", "QmOwner2"];
          const zones = [ZoneType.RURAL, ZoneType.URBAN];
          const periods = [
          {
              daysWeek: [1, 2, 3, 4, 5],
              from: Math.floor(Date.now() / 1000) - 3600,
              to: Math.floor(Date.now() / 1000) + 3600,
          },
          ];
          const permissionsJson = JSON.stringify({ zones: zones.map(z => ZoneType[z]), periods });
          const maintenanceHash = "QmMaintLive";
  
          const tx = await droneIdentityNFT.mint(
              addr1,
              "DJI Matrice",
              DroneType.Medical,
              certs,
              permissionsJson,
              ownerHistory,
              maintenanceHash
          );
          await tx.wait();
  
          const droneId = (await droneIdentityNFT.getAllDrones()).slice(-1)[0];
  
          const setPermTx = await droneIdentityNFT.setDronePermissions(droneId, zones, periods);
          await setPermTx.wait();
  
          const route = {
              zones: [ZoneType.HOSPITALS],  // unauthorized zone
              altitudeLimit: 500,
          };
          const startTime = now;
          const endTime = now + 600;
          const daysOfWeek = [2]; // assuming authorized day
  
          const resp = await routePermission.checkRouteAuthorization({
              droneId,
              route,
              startTime,
              endTime,
              daysOfWeek,
          });
  
          const [droneIdResp, preauthorizationStatus, reason] = resp;
          expect(Number(droneIdResp)).to.equal(droneId);
          expect(Number(preauthorizationStatus)).to.equal(PreAuthorizationStatus.FAILED);
          expect(reason).to.include("zone");
      });
  
      it("should fail route authorization for unauthorized time period", async function () {
          const now = Math.floor(Date.now() / 1000);
          const certs = ["sha256-certX", "sha256-certY"];
          const ownerHistory = ["QmOwner1", "QmOwner2"];
          const zones = [ZoneType.RURAL, ZoneType.URBAN];
          const periods = [
          {
              daysWeek: [1, 2, 3, 4, 5],
              from: Math.floor(Date.now() / 1000) - 3600,
              to: Math.floor(Date.now() / 1000) + 3600,
          },
          ];
          const permissionsJson = JSON.stringify({ zones: zones.map(z => ZoneType[z]), periods });
          const maintenanceHash = "QmMaintLive";
  
          const tx = await droneIdentityNFT.mint(
              addr1,
              "DJI Matrice",
              DroneType.Medical,
              certs,
              permissionsJson,
              ownerHistory,
              maintenanceHash
          );
          await tx.wait();
  
          const droneId = (await droneIdentityNFT.getAllDrones()).slice(-1)[0];
  
          const setPermTx = await droneIdentityNFT.setDronePermissions(droneId, zones, periods);
          await setPermTx.wait();
  
          const route = {
              zones: [ZoneType.RURAL],
              altitudeLimit: 500,
          };
          const startTime = now + 7200; // 2 hours in the future, unauthorized
          const endTime = startTime + 600;
          const daysOfWeek = [2];
  
          const resp = await routePermission.checkRouteAuthorization({
              droneId,
              route,
              startTime,
              endTime,
              daysOfWeek,
          });
  
          const [droneIdResp, preauthorizationStatus, reason] = resp;
          expect(Number(droneIdResp)).to.equal(droneId);
          expect(Number(preauthorizationStatus)).to.equal(PreAuthorizationStatus.FAILED);
          expect(reason).to.include("time period");
      });
  
      it("should fail route authorization for unauthorized day of week", async function () {
          const now = Math.floor(Date.now() / 1000);
          const certs = ["sha256-certX", "sha256-certY"];
          const ownerHistory = ["QmOwner1", "QmOwner2"];
          const zones = [ZoneType.RURAL, ZoneType.URBAN];
          const periods = [
          {
              daysWeek: [1, 2, 3, 4, 5],
              from: Math.floor(Date.now() / 1000) - 3600,
              to: Math.floor(Date.now() / 1000) + 3600,
          },
          ];
          const permissionsJson = JSON.stringify({ zones: zones.map(z => ZoneType[z]), periods });
          const maintenanceHash = "QmMaintLive";
  
          const tx = await droneIdentityNFT.mint(
              addr1,
              "DJI Matrice",
              DroneType.Medical,
              certs,
              permissionsJson,
              ownerHistory,
              maintenanceHash
          );
          await tx.wait();
  
          const droneId = (await droneIdentityNFT.getAllDrones()).slice(-1)[0];
  
          const setPermTx = await droneIdentityNFT.setDronePermissions(droneId, zones, periods);
          await setPermTx.wait();
  
          const route = {
              zones: [ZoneType.RURAL],
              altitudeLimit: 500,
          };
          const startTime = now;
          const endTime = now + 600;
          const daysOfWeek = [0]; // Sunday, unauthorized
  
          const resp = await routePermission.checkRouteAuthorization({
              droneId,
              route,
              startTime,
              endTime,
              daysOfWeek,
          });
  
          const [droneIdResp, preauthorizationStatus, reason] = resp;
          expect(Number(droneIdResp)).to.equal(droneId);
          expect(Number(preauthorizationStatus)).to.equal(PreAuthorizationStatus.FAILED);
          expect(reason).to.include("not authorized for requested day");
      });
  
      it("should handle multiple drones with different permissions", async function () {
          const now = Math.floor(Date.now() / 1000);
  
          const certs = ["sha256-certX", "sha256-certY"];
          const ownerHistory = ["QmOwner1", "QmOwner2"];
          const zones = [ZoneType.RURAL, ZoneType.URBAN];
          const periods = [
          {
              daysWeek: [0, 1, 2, 3, 4, 5],
              from: Math.floor(Date.now() / 1000) - 3600,
              to: Math.floor(Date.now() / 1000) + 3600,
          },
          ];
          const permissionsJson = JSON.stringify({ zones: zones.map(z => ZoneType[z]), periods });
          const maintenanceHash = "QmMaintLive";
  
          const tx = await droneIdentityNFT.mint(
              addr1,
              "DJI Matrice",
              DroneType.Medical,
              certs,
              permissionsJson,
              ownerHistory,
              maintenanceHash
          );
          await tx.wait();
  
          const droneId = (await droneIdentityNFT.getAllDrones()).slice(-1)[0];
  
          const setPermTx = await droneIdentityNFT.setDronePermissions(droneId, zones, periods);
          await setPermTx.wait();
  
          
  
          const certs2 = ["sha256-certX", "sha256-certY"];
          const ownerHistory2 = ["QmOwner1", "QmOwner2"];
          const zones2 = [ZoneType.MILITARY];
          const periods2 = [
          {
              daysWeek: [0, 1, 2, 3, 4, 5],
              from: Math.floor(Date.now() / 1000) - 3600,
              to: Math.floor(Date.now() / 1000) + 3600,
          },
          ];
          const permissionsJson2 = JSON.stringify({ zones: zones2.map(z => ZoneType[z]), periods2 });
          const maintenanceHash2 = "QmMaintLive";
  
          const tx2 = await droneIdentityNFT.mint(
              addr1,
              "DJI Matrice",
              DroneType.Medical,
              certs2,
              permissionsJson2,
              ownerHistory2,
              maintenanceHash2
          );
          await tx2.wait();
  
          const droneId2 = (await droneIdentityNFT.getAllDrones()).slice(-1)[0];
  
          const setPermTx2 = await droneIdentityNFT.setDronePermissions(droneId2, zones2, periods2);
          await setPermTx2.wait();
  
          // Drone 201 unauthorized for RURAL zone
          let resp = await routePermission.checkRouteAuthorization({
              droneId: droneId,
              route: { zones: [ZoneType.MILITARY], altitudeLimit: 100 },
              startTime: now,
              endTime: now + 100,
              daysOfWeek: [0], // Sunday
          });
          expect(Number(resp[1])).to.equal(PreAuthorizationStatus.FAILED);
  
          // Drone 201 authorized for URBAN on Sunday
          resp = await routePermission.checkRouteAuthorization({
              droneId: droneId,
              route: { zones: [ZoneType.URBAN], altitudeLimit: 100 },
              startTime: now,
              endTime: now + 100,
              daysOfWeek: [0],
          });
          expect(Number(resp[1])).to.equal(PreAuthorizationStatus.APPROVED);
  
          // Drone 202 authorized for any zone any day
          resp = await routePermission.checkRouteAuthorization({
              droneId: droneId2,
              route: { zones: [ZoneType.MILITARY], altitudeLimit: 100 },
              startTime: now,
              endTime: now + 100,
              daysOfWeek: [3], // Wednesday
          });
          expect(Number(resp[1])).to.equal(PreAuthorizationStatus.APPROVED);
      });
});
