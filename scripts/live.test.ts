import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { expect, should } from "chai";
dotenv.config(); // Load environment variables from .env file

const ROUTE_PERMISSION_ADDRESS = process.env.ROUTE_PERMISSION_ADDRESS || "";
const MOCK_DRONE_NFT_ADDRESS = process.env.MOCK_DRONE_NFT_ADDRESS || "";
const PRIVATE_KEY_1 = process.env.PRIVATE_KEY_1 || "";
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2 || "";

enum PreAuthorizationStatus {
  APPROVED,
  FAILED,
}
enum ZoneType {
  RURAL,
  URBAN,
  HOSPITALS,
  MILITARY,
  RESTRICTED,
}

describe("End-to-End: Drone Registration and Route Authorization", function () {
    let mockDroneNFT: any;
    let routePermission: any;
    // let wallet: any;
    let addr1: string;
    let addr2: string;

    before(async function () {
        if (!MOCK_DRONE_NFT_ADDRESS || !ROUTE_PERMISSION_ADDRESS || !PRIVATE_KEY_1 || !PRIVATE_KEY_2) {
            throw new Error("Environment variables not set.");
        }
        // wallet = new ethers.Wallet(PRIVATE_KEY_1, ethers.provider);
        mockDroneNFT = await ethers.getContractAt(
            "MockDroneIdentityNFT",
            MOCK_DRONE_NFT_ADDRESS,
            // wallet
        );
        routePermission = await ethers.getContractAt(
            "RoutePermission",
            ROUTE_PERMISSION_ADDRESS
        );
        const signer1 = await ethers.provider.getSigner(0);
        const signer2 = await ethers.provider.getSigner(1);
        addr1 = await signer1.getAddress();
        addr2 = await signer2.getAddress();
    });

    it("should add a new drone and verify its details", async function () {
        const droneId = 101;
        const now = Math.floor(Date.now() / 1000);
        const zones = [ZoneType.RURAL, ZoneType.URBAN];
        const periods = [
            {
                daysWeek: [1, 2, 3, 4, 5],
                from: now - 3600,
                to: now + 3600,
            },
        ];
        await mockDroneNFT.setDroneDetails(
            droneId,
            "DJI Phantom",
            addr1,
            zones,
            periods
        );
        const drone = await mockDroneNFT.getDroneInfo(droneId);
        expect(drone.model).to.equal("DJI Phantom");
        expect(drone.operatorId).to.equal(addr1);
        expect(drone.authorizedZones.map((z: any) => Number(z))).to.deep.equal(zones);
        expect(drone.authorizedPeriods[0].daysWeek.map((d: any) => Number(d))).to.deep.equal([1,2,3,4,5]);
    });

    it("should approve route authorization for authorized drone", async function () {
        const droneId = 101;
        const now = Math.floor(Date.now() / 1000);
        const route = {
            zones: [ZoneType.RURAL],
            altitudeLimit: 500,
        };
        const startTime = now;
        const endTime = now + 600;
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
        expect(Number(preauthorizationStatus)).to.equal(PreAuthorizationStatus.APPROVED);
        expect(reason).to.equal("");
    });

    it("should fail route authorization for unauthorized zone", async function () {
        const droneId = 101;
        const now = Math.floor(Date.now() / 1000);
        const route = {
            zones: [ZoneType.HOSPITALS],
            altitudeLimit: 500,
        };
        const startTime = now;
        const endTime = now + 600;
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
        expect(reason).to.include("zone");
    });

    it("should fail route authorization for unauthorized time period", async function () {
        const droneId = 101;
        const now = Math.floor(Date.now() / 1000);
        const route = {
            zones: [ZoneType.RURAL],
            altitudeLimit: 500,
        };
        const startTime = now + 7200; // 2 hours in the future, outside authorized period
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
        const droneId = 101;
        const now = Math.floor(Date.now() / 1000);
        const route = {
            zones: [ZoneType.RURAL],
            altitudeLimit: 500,
        };
        const startTime = now;
        const endTime = now + 600;
        const daysOfWeek = [0]; // Sunday, not authorized
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
        expect(reason).to.include("days of the week");
    });

    it("should handle multiple drones with different permissions", async function () {
        const now = Math.floor(Date.now() / 1000);
        // Drone 201: only URBAN, only weekends
        await mockDroneNFT.setDroneDetails(
            201,
            "Parrot Anafi",
            addr2,
            [ZoneType.URBAN],
            [
                {
                    daysWeek: [0, 6], // Sunday, Saturday
                    from: now - 3600,
                    to: now + 3600,
                },
            ]
        );
        // Drone 202: all zones, all week
        await mockDroneNFT.setDroneDetails(
            202,
            "Yuneec Typhoon",
            addr2,
            [ZoneType.RURAL, ZoneType.URBAN, ZoneType.HOSPITALS, ZoneType.MILITARY, ZoneType.RESTRICTED],
            [
                {
                    daysWeek: [0,1,2,3,4,5,6],
                    from: now - 3600,
                    to: now + 3600,
                },
            ]
        );
        // Drone 201: should fail for RURAL
        let resp = await routePermission.checkRouteAuthorization({
            droneId: 201,
            route: { zones: [ZoneType.RURAL], altitudeLimit: 100 },
            startTime: now,
            endTime: now + 100,
            daysOfWeek: [0],
        });
        console.log("Drone 201 RURAL response:", resp);
        expect(Number(resp[1])).to.equal(PreAuthorizationStatus.FAILED);

        // Drone 201: should approve for URBAN on Sunday
        resp = await routePermission.checkRouteAuthorization({
            droneId: 201,
            route: { zones: [ZoneType.URBAN], altitudeLimit: 100 },
            startTime: now,
            endTime: now + 100,
            daysOfWeek: [0],
        });
        console.log("Drone 201 URBAN Sunday response:", resp);
        expect(Number(resp[1])).to.equal(PreAuthorizationStatus.APPROVED);

        // Drone 202: should approve for any zone, any day
        resp = await routePermission.checkRouteAuthorization({
            droneId: 202,
            route: { zones: [ZoneType.HOSPITALS], altitudeLimit: 100 },
            startTime: now,
            endTime: now + 100,
            daysOfWeek: [3],
        });
        console.log("Drone 202 HOSPITALS response:", resp);
        expect(Number(resp[1])).to.equal(PreAuthorizationStatus.APPROVED);
    });
});
