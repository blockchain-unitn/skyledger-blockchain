import { ethers } from "hardhat";
import { expect } from "chai";

enum ZoneType {
    RURAL,
    URBAN,
    HOSPITALS,
    MILITARY,
    RESTRICTED,
}

enum RouteStatus {
    NORMAL,
    DEVIATED,
}

describe("RouteLogging", function () {
    let routeLogging: any;
    let owner: any;
    let addr1: any;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        const RouteLoggingFactory = await ethers.getContractFactory("RouteLogging");
        routeLogging = await RouteLoggingFactory.deploy();
        await routeLogging.waitForDeployment();
    });

    it("should log a route and emit an event", async function () {
        const zones = [ZoneType.RURAL, ZoneType.URBAN];
        const startPoint = { latitude: 45000000, longitude: 9000000 };
        const endPoint = { latitude: 46000000, longitude: 9100000 };
        const route = [
            { latitude: 45000000, longitude: 9000000 },
            { latitude: 45500000, longitude: 9050000 },
            { latitude: 46000000, longitude: 9100000 },
        ];
        const startTime = Math.floor(Date.now() / 1000);
        const endTime = startTime + 600;

        const tx = await routeLogging.logRoute(
            1,
            owner.address,
            zones,
            startPoint,
            endPoint,
            route,
            startTime,
            endTime,
            RouteStatus.NORMAL
        );
        const receipt = await tx.wait();

        // Check event
        const events = receipt.logs.filter((log: any) => {
            try {
                return routeLogging.interface.parseLog(log);
            } catch {
                return false;
            }
        });
        expect(events.length).to.be.greaterThan(0);
        
        const parsedEvent = routeLogging.interface.parseLog(events[0]);
        expect(parsedEvent.name).to.equal("RouteLogged");
        expect(parsedEvent.args.droneId).to.equal(1);

        // Check log storage
        const log = await routeLogging.getLog(0);
        expect(log.droneId).to.equal(1);
        expect(log.utmAuthorizer).to.equal(owner.address);
        expect(log.zones.map((z: any) => Number(z))).to.deep.equal(zones);
        expect(log.startPoint.latitude).to.equal(startPoint.latitude);
        expect(log.endPoint.longitude).to.equal(endPoint.longitude);
        expect(log.route.length).to.equal(route.length);
        expect(log.startTime).to.equal(startTime);
        expect(log.endTime).to.equal(endTime);
        expect(Number(log.status)).to.equal(RouteStatus.NORMAL);
    });

    it("should revert if logRoute is called with invalid data", async function () {
        const zones: ZoneType[] = [];
        const startPoint = { latitude: 0, longitude: 0 };
        const endPoint = { latitude: 0, longitude: 0 };
        const route: any[] = [];
        const startTime = 1000;
        const endTime = 900;

        await expect(
            routeLogging.logRoute(
                0,
                ethers.ZeroAddress,
                zones,
                startPoint,
                endPoint,
                route,
                startTime,
                endTime,
                RouteStatus.NORMAL
            )
        ).to.be.reverted;
    });

    it("should return the correct logs count", async function () {
        expect(await routeLogging.getLogsCount()).to.equal(0);
        const zones = [ZoneType.RURAL];
        const startPoint = { latitude: 1, longitude: 1 };
        const endPoint = { latitude: 2, longitude: 2 };
        const route = [startPoint, endPoint];
        const startTime = 1;
        const endTime = 2;

        await routeLogging.logRoute(
            1,
            owner.address,
            zones,
            startPoint,
            endPoint,
            route,
            startTime,
            endTime,
            RouteStatus.NORMAL
        );
        expect(await routeLogging.getLogsCount()).to.equal(1);
    });

    it("should return all log IDs for a given drone", async function () {
        // Log two routes for droneId 1, one for droneId 2
        const zones = [ZoneType.RURAL];
        const startPoint = { latitude: 1, longitude: 1 };
        const endPoint = { latitude: 2, longitude: 2 };
        const route = [startPoint, endPoint];
        await routeLogging.logRoute(1, owner.address, zones, startPoint, endPoint, route, 1, 2, RouteStatus.NORMAL);
        await routeLogging.logRoute(1, owner.address, zones, startPoint, endPoint, route, 3, 4, RouteStatus.NORMAL);
        await routeLogging.logRoute(2, owner.address, zones, startPoint, endPoint, route, 5, 6, RouteStatus.NORMAL);

        const logIds = await routeLogging.getLogsOfDrone(1);
        expect(logIds.map((id: any) => Number(id))).to.deep.equal([0, 1]);
        const logIds2 = await routeLogging.getLogsOfDrone(2);
        expect(logIds2.map((id: any) => Number(id))).to.deep.equal([2]);
    });

    it("should return all unique drones authorized by a UTM", async function () {
        const zones = [ZoneType.RURAL];
        const startPoint = { latitude: 1, longitude: 1 };
        const endPoint = { latitude: 2, longitude: 2 };
        const route = [startPoint, endPoint];
        await routeLogging.logRoute(1, owner.address, zones, startPoint, endPoint, route, 1, 2, RouteStatus.NORMAL);
        await routeLogging.logRoute(2, owner.address, zones, startPoint, endPoint, route, 3, 4, RouteStatus.NORMAL);
        await routeLogging.logRoute(1, owner.address, zones, startPoint, endPoint, route, 5, 6, RouteStatus.NORMAL);
        await routeLogging.logRoute(3, addr1.address, zones, startPoint, endPoint, route, 7, 8, RouteStatus.NORMAL);

        const dronesByOwner = await routeLogging.getDronesAuthorizedByUTM(owner.address);
        expect(dronesByOwner.map((id: any) => Number(id)).sort()).to.deep.equal([1, 2]);
        const dronesByAddr1 = await routeLogging.getDronesAuthorizedByUTM(addr1.address);
        expect(dronesByAddr1.map((id: any) => Number(id))).to.deep.equal([3]);
    });

    it("should return the zones of a log", async function () {
        const zones = [ZoneType.RURAL, ZoneType.HOSPITALS];
        const startPoint = { latitude: 1, longitude: 1 };
        const endPoint = { latitude: 2, longitude: 2 };
        const route = [startPoint, endPoint];
        await routeLogging.logRoute(1, owner.address, zones, startPoint, endPoint, route, 1, 2, RouteStatus.NORMAL);

        const logZones = await routeLogging.getZonesOfLog(0);
        expect(logZones.map((z: any) => Number(z))).to.deep.equal(zones);
    });

    it("should revert when getting zones of a log that does not exist", async function () {
        await expect(routeLogging.getZonesOfLog(99)).to.be.revertedWith("Log does not exist");
    });

    it("should return an empty array if a drone has no logs", async function () {
        const logIds = await routeLogging.getLogsOfDrone(99); // droneId 99 never logged
        expect(logIds.length).to.equal(0);
    });

    it("should revert when getting zones of a non-existent log", async function () {
        await expect(routeLogging.getZonesOfLog(42)).to.be.revertedWith("Log does not exist");
    });

    // Test safe UTM function
    it("should handle safe UTM drone query with limits", async function () {
        const zones = [ZoneType.RURAL];
        const startPoint = { latitude: 1, longitude: 1 };
        const endPoint = { latitude: 2, longitude: 2 };
        const route = [startPoint, endPoint];

        // Create logs for multiple drones under same UTM
        for (let i = 1; i <= 10; i++) {
            await routeLogging.logRoute(
                i, 
                owner.address, 
                zones, 
                startPoint, 
                endPoint, 
                route, 
                1, 
                2, 
                RouteStatus.NORMAL
            );
        }

        const [drones, hasMore] = await routeLogging.getDronesAuthorizedByUTMSafe(owner.address, 5);
        expect(drones.length).to.equal(5);
        expect(hasMore).to.equal(true);

        // Test invalid maxResults
        await expect(
            routeLogging.getDronesAuthorizedByUTMSafe(owner.address, 0)
        ).to.be.revertedWith("Invalid maxResults range");

        await expect(
            routeLogging.getDronesAuthorizedByUTMSafe(owner.address, 51)
        ).to.be.revertedWith("Invalid maxResults range");
    });
});