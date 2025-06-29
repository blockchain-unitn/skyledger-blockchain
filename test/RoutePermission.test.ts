import { expect } from "chai";
import { ethers } from "hardhat";
import { RoutePermission } from "../typechain-types";
import { Signer } from "ethers";

describe("RoutePermission", function () {
  let routePermission: RoutePermission;
  let mockDroneNFT: any;
  let owner: Signer;
  let addr1: Signer;

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

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Create a mock contract with the required interface
    const MockDroneNFT = await ethers.getContractFactory(
      "MockDroneIdentityNFT"
    );
    mockDroneNFT = await MockDroneNFT.deploy();

    // Deploy RoutePermission
    const RoutePermissionFactory = await ethers.getContractFactory(
      "RoutePermission"
    );
    routePermission = (await RoutePermissionFactory.deploy(
      await mockDroneNFT.getAddress()
    )) as unknown as RoutePermission;
  });

  describe("checkRouteAuthorization", function () {
    it("should approve route for authorized drone in correct zone and time", async function () {
      const droneId = 1;
      const currentTime = Math.floor(Date.now() / 1000);

      await mockDroneNFT.setDroneDetails(
        droneId,
        "DJI Phantom",
        await addr1.getAddress(),
        [ZoneType.RURAL, ZoneType.URBAN],
        [
          {
            daysWeek: [1, 2, 3, 4, 5],
            from: currentTime - 3600,
            to: currentTime + 3600,
          },
        ]
      );

      const routeRequest = {
        droneId: droneId,
        route: {
          zones: [ZoneType.RURAL],
          altitudeLimit: 100,
        },
        startTime: currentTime,
        endTime: currentTime + 1800,
        daysOfWeek: [1, 2],
      };

      const response = await routePermission.checkRouteAuthorization(
        routeRequest
      );

      expect(response.droneId).to.equal(droneId);
      expect(response.preauthorizationStatus).to.equal(
        PreAuthorizationStatus.APPROVED
      );
      expect(response.reason).to.equal("");
    });

    it("should reject route for unauthorized zone", async function () {
      const droneId = 1;
      const currentTime = Math.floor(Date.now() / 1000);

      await mockDroneNFT.setDroneDetails(
        droneId,
        "DJI Phantom",
        await addr1.getAddress(),
        [ZoneType.RURAL],
        [
          {
            daysWeek: [1, 2, 3, 4, 5],
            from: currentTime - 3600,
            to: currentTime + 3600,
          },
        ]
      );

      const routeRequest = {
        droneId: droneId,
        route: {
          zones: [ZoneType.MILITARY],
          altitudeLimit: 100,
        },
        startTime: currentTime,
        endTime: currentTime + 1800,
        daysOfWeek: [1, 2],
      };

      const response = await routePermission.checkRouteAuthorization(
        routeRequest
      );

      expect(response.droneId).to.equal(droneId);
      expect(response.preauthorizationStatus).to.equal(
        PreAuthorizationStatus.FAILED
      );
      expect(response.reason).to.equal(
        "Drone not authorized for requested zone"
      );
    });

    it("should reject route for unauthorized time period", async function () {
      const droneId = 1;
      const currentTime = Math.floor(Date.now() / 1000);

      await mockDroneNFT.setDroneDetails(
        droneId,
        "DJI Phantom",
        await addr1.getAddress(),
        [ZoneType.RURAL],
        [
          {
            daysWeek: [1, 2, 3, 4, 5],
            from: currentTime - 7200,
            to: currentTime - 3600,
          },
        ]
      );

      const routeRequest = {
        droneId: droneId,
        route: {
          zones: [ZoneType.RURAL],
          altitudeLimit: 100,
        },
        startTime: currentTime,
        endTime: currentTime + 1800,
        daysOfWeek: [1, 2],
      };

      const response = await routePermission.checkRouteAuthorization(
        routeRequest
      );

      expect(response.droneId).to.equal(droneId);
      expect(response.preauthorizationStatus).to.equal(
        PreAuthorizationStatus.FAILED
      );
      expect(response.reason).to.equal(
        "Drone not authorized for requested time period"
      );
    });

    it("should reject route for unautorized days of the week", async function () {
      const droneId = 1;
      const currentTime = Math.floor(Date.now() / 1000);
      await mockDroneNFT.setDroneDetails(
        droneId,
        "DJI Phantom",
        await addr1.getAddress(),
        [ZoneType.RURAL],
        [
          {
            daysWeek: [1, 2, 3, 4, 5],
            from: currentTime - 3600,
            to: currentTime + 3600,
          },
        ]
      );
      const routeRequest = {
        droneId: droneId,
        route: {
          zones: [ZoneType.RURAL],
          altitudeLimit: 100,
        },
        startTime: currentTime,
        endTime: currentTime + 1800,
        daysOfWeek: [6, 7], // Saturday and Sunday
      };
      const response = await routePermission.checkRouteAuthorization(
        routeRequest
      );
      expect(response.droneId).to.equal(droneId);
      expect(response.preauthorizationStatus).to.equal(
        PreAuthorizationStatus.FAILED
      );
      expect(response.reason).to.equal(
        "Drone not authorized for requested days of the week"
      );
    });

    it("should approve route spanning multiple authorized zones", async function () {
      const droneId = 1;
      const currentTime = Math.floor(Date.now() / 1000);

      await mockDroneNFT.setDroneDetails(
        droneId,
        "DJI Phantom",
        await addr1.getAddress(),
        [ZoneType.RURAL, ZoneType.URBAN, ZoneType.HOSPITALS],
        [
          {
            daysWeek: [1, 2, 3, 4, 5],
            from: currentTime - 3600,
            to: currentTime + 3600,
          },
        ]
      );

      const routeRequest = {
        droneId: droneId,
        route: {
          zones: [ZoneType.RURAL, ZoneType.URBAN],
          altitudeLimit: 100,
        },
        startTime: currentTime,
        endTime: currentTime + 1800,
        daysOfWeek: [1, 2],
      };

      const response = await routePermission.checkRouteAuthorization(
        routeRequest
      );

      expect(response.droneId).to.equal(droneId);
      expect(response.preauthorizationStatus).to.equal(
        PreAuthorizationStatus.APPROVED
      );
      expect(response.reason).to.equal("");
    });

    it("should reject if any zone in route is unauthorized", async function () {
      const droneId = 1;
      const currentTime = Math.floor(Date.now() / 1000);

      await mockDroneNFT.setDroneDetails(
        droneId,
        "DJI Phantom",
        await addr1.getAddress(),
        [ZoneType.RURAL, ZoneType.URBAN],
        [
          {
            daysWeek: [1, 2, 3, 4, 5],
            from: currentTime - 3600,
            to: currentTime + 3600,
          },
        ]
      );

      const routeRequest = {
        droneId: droneId,
        route: {
          zones: [ZoneType.RURAL, ZoneType.RESTRICTED],
          altitudeLimit: 100,
        },
        startTime: currentTime,
        endTime: currentTime + 1800,
        daysOfWeek: [1, 2],
      };

      const response = await routePermission.checkRouteAuthorization(
        routeRequest
      );

      expect(response.droneId).to.equal(droneId);
      expect(response.preauthorizationStatus).to.equal(
        PreAuthorizationStatus.FAILED
      );
      expect(response.reason).to.equal(
        "Drone not authorized for requested zone"
      );
    });

    it("should handle empty authorized zones", async function () {
      const droneId = 1;
      const currentTime = Math.floor(Date.now() / 1000);

      await mockDroneNFT.setDroneDetails(
        droneId,
        "DJI Phantom",
        await addr1.getAddress(),
        [],
        [
          {
            daysWeek: [1, 2, 3, 4, 5],
            from: currentTime - 3600,
            to: currentTime + 3600,
          },
        ]
      );

      const routeRequest = {
        droneId: droneId,
        route: {
          zones: [ZoneType.RURAL],
          altitudeLimit: 100,
        },
        startTime: currentTime,
        endTime: currentTime + 1800,
        daysOfWeek: [1, 2],
      };

      const response = await routePermission.checkRouteAuthorization(
        routeRequest
      );

      expect(response.droneId).to.equal(droneId);
      expect(response.preauthorizationStatus).to.equal(
        PreAuthorizationStatus.FAILED
      );
      expect(response.reason).to.equal(
        "Drone not authorized for requested zone"
      );
    });

    it("should handle empty authorized periods", async function () {
      const droneId = 1;
      const currentTime = Math.floor(Date.now() / 1000);

      await mockDroneNFT.setDroneDetails(
        droneId,
        "DJI Phantom",
        await addr1.getAddress(),
        [ZoneType.RURAL],
        []
      );

      const routeRequest = {
        droneId: droneId,
        route: {
          zones: [ZoneType.RURAL],
          altitudeLimit: 100,
        },
        startTime: currentTime,
        endTime: currentTime + 1800,
        daysOfWeek: [] ,
      };

      const response = await routePermission.checkRouteAuthorization(
        routeRequest
      );

      expect(response.droneId).to.equal(droneId);
      expect(response.preauthorizationStatus).to.equal(
        PreAuthorizationStatus.FAILED
      );
      expect(response.reason).to.equal(
        "Drone not authorized for requested time period"
      );
    });
  });
});
