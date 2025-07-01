import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { expect, should } from "chai";
dotenv.config(); // Load environment variables from .env file

const ROUTE_PERMISSION_ADDRESS = process.env.ROUTE_PERMISSION_ADDRESS || "";
const DRONE_IDENTITY_NFT_ADDRESS = process.env.DRONE_IDENTITY_NFT_ADDRESS || "";
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

enum DroneType {
  Medical,
  Cargo,
  Surveillance,
  Agricultural,
  Recreational,
  Mapping,
  Militar
}

describe("End-to-End: Drone Registration and Route Authorization", function () {
    let routePermission: any;
    let droneIdentityNFT: any;
    let addr1: string;
    let addr2: string;

    before(async function () {
        if (!ROUTE_PERMISSION_ADDRESS || !PRIVATE_KEY_1 || !PRIVATE_KEY_2) {
            throw new Error("Environment variables not set.");
        }
        routePermission = await ethers.getContractAt(
            "RoutePermission",
            ROUTE_PERMISSION_ADDRESS
        );

        if (!DRONE_IDENTITY_NFT_ADDRESS) {
            throw new Error("DRONE_IDENTITY_NFT_ADDRESS not set in env.");
        }
        droneIdentityNFT = await ethers.getContractAt(
            "DroneIdentityNFT",
            DRONE_IDENTITY_NFT_ADDRESS
        );

        const signer1 = await ethers.provider.getSigner(0);
        const signer2 = await ethers.provider.getSigner(1);
        addr1 = await signer1.getAddress();
        addr2 = await signer2.getAddress();
    });

        //test contract DroneIdentityNFT
    it("should mint and retrieve a DroneIdentityNFT", async function () {
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
            DroneType.Surveillance,
            certs,
            permissionsJson,
            ownerHistory,
            maintenanceHash
        );
        await tx.wait();

        const lastTokenId = (await droneIdentityNFT.getAllDrones()).slice(-1)[0];

        const setPermTx = await droneIdentityNFT.setDronePermissions(lastTokenId, zones, periods);
        await setPermTx.wait();

        const ownerOf0 = await droneIdentityNFT.ownerOf(lastTokenId);
        expect(ownerOf0).to.equal(addr1);

        const data = await droneIdentityNFT.getDroneData(lastTokenId);
        expect(data.model).to.equal("DJI Matrice");
        expect(data.droneType).to.equal(DroneType.Surveillance);
        expect(data.certHashes).to.deep.equal(certs);
        expect(data.permissions).to.equal(permissionsJson);
        expect(data.ownerHistory).to.deep.equal(ownerHistory);
        expect(data.maintenanceHash).to.equal(maintenanceHash);

        // Verifica permessi strutturati
        const [storedZones, storedPeriods] = await droneIdentityNFT.getDronePermissions(lastTokenId);
        expect(storedZones.map((z: any) => Number(z))).to.deep.equal(zones);
        expect(storedPeriods.length).to.equal(periods.length);
        expect(storedPeriods[0].from).to.equal(periods[0].from);
    });


    it("should allow owner to update maintenanceHash and prevent non-owner", async function () {
        const tx=await droneIdentityNFT.connect(await ethers.provider.getSigner(0)).updateMaintenanceHash(0, "QmNewMaintLive");

        await tx.wait();

        const data = await droneIdentityNFT.getDroneData(0);
        expect(data.maintenanceHash).to.equal("QmNewMaintLive");

        await expect(
            droneIdentityNFT.connect(await ethers.provider.getSigner(1)).updateMaintenanceHash(0, "QmFakeUpdate")
        ).to.be.revertedWith("Caller is not the drone owner");
    });

    it("should reject maintenance update for non-existent drone", async function () {
        await expect(
            droneIdentityNFT.connect(await ethers.provider.getSigner(0)).updateMaintenanceHash(9999, "QmNonExistent")
        ).to.be.revertedWith("Drone does not exist");
    });

    it("should mint multiple DroneIdentityNFTs and track owners", async function () {
        const tx = await droneIdentityNFT.mint(
            addr1,
            "Drone A",
            DroneType.Cargo,
            [],
            "",
            [],
            "QmA"
        );
        await tx.wait();
        const tx2 = await droneIdentityNFT.mint(
            addr2,
            "Drone B",
            DroneType.Medical,
            [],
            "",
            [],
            "QmB"
        );
        await tx2.wait();

        expect(await droneIdentityNFT.ownerOf(1)).to.equal(addr1);
        expect(await droneIdentityNFT.ownerOf(2)).to.equal(addr2);
    });
        it("should allow owner to burn drone and remove it", async function () {
        // Mint un nuovo drone
        const tx = await droneIdentityNFT.mint(
            addr1,
            "Drone BurnTest",
            DroneType.Cargo,
            [],
            "",
            [],
            "QmBurn"
        );
        await tx.wait();

        const tokenId = 3; // Poiché hai già mintato 0, 1, 2 nei test precedenti
        expect(await droneIdentityNFT.ownerOf(tokenId)).to.equal(addr1);

        // Burn da parte del proprietario
        const burnTx = await droneIdentityNFT.connect(await ethers.provider.getSigner(0)).burnDrone(tokenId);
        await burnTx.wait();

        // Verifica che il drone non esista più
        await expect(droneIdentityNFT.ownerOf(tokenId)).to.be.revertedWith(/ERC721: (owner query for nonexistent token|invalid token ID)/);
        await expect(droneIdentityNFT.getDroneData(tokenId)).to.be.revertedWith("Drone does not exist");

        // Verifica che un non proprietario non possa burnare un drone inesistente
        await expect(
            droneIdentityNFT.connect(await ethers.provider.getSigner(1)).burnDrone(tokenId)
        ).to.be.revertedWith("Drone does not exist");
    });

    it("should return all existing drone token IDs", async function () {
        // Mintiamo due droni
        const tx1 = await droneIdentityNFT.mint(
            addr1,
            "Drone C",
            DroneType.Medical,
            [],
            "",
            [],
            "QmC"
        );
        await tx1.wait();
        const tx2 = await droneIdentityNFT.mint(
            addr2,
            "Drone D",
            DroneType.Surveillance,
            [],
            "",
            [],
            "QmD"
        );
        await tx2.wait();

        // Verifica che restituisca gli ID dei droni esistenti
        const tokens = await droneIdentityNFT.getAllDrones();
        const tokenIds = tokens.map((t: any) => Number(t));
        // I token id dipendono dal numero dei mint precedenti, quindi prendiamo da 4 in su
        expect(tokenIds).to.include.members([4, 5]);

        // Burniamo uno dei droni
        const tx3 = await droneIdentityNFT.connect(await ethers.provider.getSigner(0)).burnDrone(4);
        await tx3.wait();

        const tokensAfterBurn = await droneIdentityNFT.getAllDrones();
        const tokenIdsAfterBurn = tokensAfterBurn.map((t: any) => Number(t));
        expect(tokenIdsAfterBurn).to.include(5);
        expect(tokenIdsAfterBurn).to.not.include(4);
    });

    it("should allow owner to update drone permissions and retrieve updated permissions", async function () {
        // Minta un drone prima con permessi vuoti
        const mintTx = await droneIdentityNFT.mint(
            addr1,
            "Test Drone",
            DroneType.Cargo,
            [],
            "",
            [],
            "QmInitialMaint"
        );
        await mintTx.wait();

        const tokenId = (await droneIdentityNFT.getAllDrones()).slice(-1)[0];

        // Definiamo nuovi permessi
        const newZones = [ZoneType.RURAL, ZoneType.URBAN];
        const newPeriods = [
            {
            daysWeek: [1, 2, 3, 4, 5],
            from: Math.floor(Date.now() / 1000) - 3600,
            to: Math.floor(Date.now() / 1000) + 3600,
            },
        ];

        // Chiamiamo setDronePermissions con il signer proprietario del contratto
        const ownerSigner = await ethers.provider.getSigner(0);
        const tx=await droneIdentityNFT.connect(ownerSigner).setDronePermissions(tokenId, newZones, newPeriods);
        await tx.wait();

        // Recuperiamo i permessi aggiornati
        const [zones, periods] = await droneIdentityNFT.getDronePermissions(tokenId);

        // Controlli
        expect(zones.map((z: any) => Number(z))).to.deep.equal(newZones);

        expect(periods.length).to.equal(newPeriods.length);
        expect(periods[0].daysWeek.map((d: any) => Number(d))).to.deep.equal(newPeriods[0].daysWeek);
        expect(Number(periods[0].from)).to.equal(newPeriods[0].from);
        expect(Number(periods[0].to)).to.equal(newPeriods[0].to);
        });


    //--------------------------------------------------------------------------



    //test RoutePermission contract

    it("should approve route authorization for authorized drone", async function () {
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
        const daysOfWeek = [2];

        const resp = await routePermission.checkRouteAuthorization({
            droneId,
            route,
            startTime,
            endTime,
            daysOfWeek,
        });

        const [droneIdResp, preauthorizationStatus, reason] = resp;
        expect(Number(droneIdResp)).to.equal(Number(droneId));
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
