import { expect } from "chai";
import { ethers } from "hardhat";
import { DroneIdentityNFT } from "../typechain-types";
import { Signer } from "ethers";

enum DroneType {
  Medical,
  Cargo,
  Surveillance,
  Agricultural,
  Recreational,
  Mapping,
  Militar
}

describe("DroneIdentityNFT", function () {
  let droneNFT: DroneIdentityNFT;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const DroneIdentityNFTFactory = await ethers.getContractFactory("DroneIdentityNFT");
    droneNFT = (await DroneIdentityNFTFactory.deploy()) as DroneIdentityNFT;
  });

  it("should mint a drone NFT and store correct data", async function () {
    const certs = ["sha256-cert1", "sha256-cert2"];
    const ownerHistory = ["QmOwnerCID1", "QmOwnerCID2"];
    const permissions = '{"zones": ["A", "B"], "altitude": "100m"}';
    const maintenanceHash = "QmMaintenanceCID";
    const addr1Address = await addr1.getAddress();

    const tx = await droneNFT.mint(
      addr1Address,
      "DJI Phantom 4",
      DroneType.Medical,
      certs,
      permissions,
      ownerHistory,
      maintenanceHash
    );
    await tx.wait();

    expect(await droneNFT.ownerOf(0)).to.equal(addr1Address);
    const droneData = await droneNFT.getDroneData(0);
    expect(droneData.model).to.equal("DJI Phantom 4");
    expect(droneData.droneType).to.equal(DroneType.Medical);
    expect(droneData.certHashes).to.deep.equal(certs);
    expect(droneData.permissions).to.equal(permissions);
    expect(droneData.ownerHistory).to.deep.equal(ownerHistory);
    expect(droneData.maintenanceHash).to.equal(maintenanceHash);
  });

  it("should update maintenance hash only by drone owner", async function () {
    const certs = ["sha256-cert"];
    const ownerHistory: string[] = [];
    const permissions = '{"zones": ["X"], "altitude": "50m"}';
    const maintenanceHash = "QmOldMaintenanceCID";
    const addr1Address = await addr1.getAddress();

    const tx = await droneNFT.mint(
      addr1Address,
      "Parrot Anafi",
      DroneType.Cargo,
      certs,
      permissions,
      ownerHistory,
      maintenanceHash
    );
    await tx.wait();

    await droneNFT.connect(addr1).updateMaintenanceHash(0, "QmNewMaintenanceCID");
    const updatedDrone = await droneNFT.getDroneData(0);
    expect(updatedDrone.maintenanceHash).to.equal("QmNewMaintenanceCID");

    await expect(
      droneNFT.connect(owner).updateMaintenanceHash(0, "QmFakeUpdate")
    ).to.be.revertedWith("Caller is not the drone owner");
  });

  it("should revert when trying to update non-existent drone", async function () {
    await expect(
      droneNFT.connect(addr1).updateMaintenanceHash(999, "QmNonExistent")
    ).to.be.revertedWith("Drone does not exist");
  });

  it("should store correct droneType for different types", async function () {
    const types = [
      DroneType.Medical,
      DroneType.Cargo,
      DroneType.Surveillance,
      DroneType.Agricultural,
      DroneType.Recreational,
      DroneType.Mapping
    ];
    for (let i = 0; i < types.length; i++) {
      const tx = await droneNFT.mint(
        await addr1.getAddress(),
        `DroneModel${i}`,
        types[i],
        [],
        "",
        [],
        ""
      );
      await tx.wait();
      const data = await droneNFT.getDroneData(i);
      expect(data.droneType).to.equal(types[i]);
    }
  });

  it("should track ownerOf correctly after mint", async function () {
    const tx = await droneNFT.mint(
      await addr1.getAddress(),
      "TestDrone",
      DroneType.Surveillance,
      [],
      "",
      [],
      ""
    );
    await tx.wait();
    expect(await droneNFT.ownerOf(0)).to.equal(await addr1.getAddress());
  });

  it("should allow multiple drones to be minted by different owners", async function () {
    await droneNFT.mint(
      await addr1.getAddress(),
      "Drone1",
      DroneType.Medical,
      [],
      "",
      [],
      ""
    );
    await droneNFT.mint(
      await addr2.getAddress(),
      "Drone2",
      DroneType.Cargo,
      [],
      "",
      [],
      ""
    );

    expect(await droneNFT.ownerOf(0)).to.equal(await addr1.getAddress());
    expect(await droneNFT.ownerOf(1)).to.equal(await addr2.getAddress());
  });

  it("should store and retrieve empty certHashes and ownerHistory", async function () {
    const tx = await droneNFT.mint(
      await addr1.getAddress(),
      "EmptyTestDrone",
      DroneType.Mapping,
      [],
      "",
      [],
      "QmEmptyTest"
    );
    await tx.wait();
    const data = await droneNFT.getDroneData(0);
    expect(data.certHashes.length).to.equal(0);
    expect(data.ownerHistory.length).to.equal(0);
  });

  it("should fail to get data for non-existent drone", async function () {
    await expect(
      droneNFT.getDroneData(999)
    ).to.be.revertedWith("Drone does not exist");
  });
});
