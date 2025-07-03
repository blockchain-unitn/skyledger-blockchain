import { expect } from "chai";
import { ethers } from "hardhat";
import { DroneIdentityNFT, DroneIdentityNFT__factory } from "../typechain-types";

describe("DroneIdentityNFT contract", function () {
  let contract: DroneIdentityNFT;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    const factory: DroneIdentityNFT__factory = await ethers.getContractFactory("DroneIdentityNFT");
    contract = await (await factory.deploy());
  });

  it("Should mint a new drone NFT and store data correctly", async () => {
    await contract.mint(
      user1.address,
      "SN-TEST-001",
      "DJI Matrice 350",
      0, // MEDICAL
      ["certA", "certB"],
      [0, 1], // RURAL, URBAN
      ["Owner1"],
      "QmMaint1",
      0 // ACTIVE
    );

    expect(await contract.ownerOf(0)).to.equal(user1.address);

    const drone = await contract.getDroneData(0);
    expect(drone.serialNumber).to.equal("SN-TEST-001");
    expect(drone.model).to.equal("DJI Matrice 350");
    expect(drone.droneType).to.equal(0);
    expect(drone.certHashes).to.deep.equal(["certA", "certB"]);
  expect(drone.permittedZones).to.deep.equal([0, 1])
    expect(drone.maintenanceHash).to.equal("QmMaint1");
    expect(drone.status).to.equal(0);
  });

  it("Should allow drone owner to burn NFT and delete data", async () => {
    await contract.mint(
      user1.address,
      "SN-TEST-002",
      "Model X",
      1, // CARGO
      ["certX"],
      [1], // URBAN
      ["OwnerX"],
      "QmMaintX",
      0
    );

    await contract.connect(user1).burnDrone(0);

    await expect(contract.ownerOf(0)).to.be.reverted;
    await expect(contract.getDroneData(0)).to.be.revertedWith("Drone does not exist");
  });

  it("Should revert burn attempt by non-owner", async () => {
    await contract.mint(
      user1.address,
      "SN-TEST-003",
      "Model Y",
      2, // SURVEILLANCE
      ["certY"],
      [2], // HOSPITALS
      ["OwnerY"],
      "QmMaintY",
      0
    );

    await expect(contract.connect(user2).burnDrone(0)).to.be.revertedWith("Caller is not the drone owner");
  });

  it("Should return correct list of all drones", async () => {
    await contract.mint(
      user1.address,
      "SN-TEST-004",
      "Model A",
      3,
      ["certA"],
      [0],
      ["OwnerA"],
      "QmMaintA",
      0
    );
    await contract.mint(
      user2.address,
      "SN-TEST-005",
      "Model B",
      4,
      ["certB"],
      [1],
      ["OwnerB"],
      "QmMaintB",
      0
    );

    const allDrones = await contract.getAllDrones();
    expect(allDrones).to.deep.equal([0, 1]);
  });

  it("Should cleanly remove drone data on burn", async () => {
    await contract.mint(
      user1.address,
      "SN-TEST-006",
      "Model C",
      5,
      ["certC"],
      [3],
      ["OwnerC"],
      "QmMaintC",
      0
    );

    await contract.connect(user1).burnDrone(0);

    await expect(contract.getDroneData(0)).to.be.revertedWith("Drone does not exist");
    const tokens = await contract.getAllDrones();
    expect(tokens).to.deep.equal([]);
  });
  it("Should allow the drone owner to update maintenance hash", async () => {
  await contract.mint(
    user1.address,
    "SN-TEST-006",
    "DJI Phantom",
    2, // SURVEILLANCE
    ["certX"],
    [0, 1],
    ["OwnerX"],
    "QmOldHash",
    0 // ACTIVE
  );

  // Connect as owner of drone (user1)
  await contract.connect(user1).updateMaintenanceHash(0, "QmNewHash");

  const drone = await contract.getDroneData(0);
  expect(drone.maintenanceHash).to.equal("QmNewHash");
});
it("Should allow drone owner to change status", async () => {
  await contract.mint(
    user1.address,
    "SN-TEST-007",
    "DJI Inspire",
    1, // CARGO
    ["certY"],
    [1],
    ["OwnerY"],
    "QmMaintY",
    0 // ACTIVE
  );

  // Drone owner changes status to MAINTENANCE
  await contract.connect(user1).updateStatus(0, 1); // 1 = MAINTENANCE

  let drone = await contract.getDroneData(0);
  expect(drone.status).to.equal(1);

  // Contract owner changes status to INACTIVE
  await contract.updateStatus(0, 2); // 2 = INACTIVE

  drone = await contract.getDroneData(0);
  expect(drone.status).to.equal(2);
});


});
