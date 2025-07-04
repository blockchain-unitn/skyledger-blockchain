import { ethers } from "hardhat";

async function main() {
  // Deploy DroneIdentityNFT
  const DroneIdentityNFT = await ethers.getContractFactory("DroneIdentityNFT");
  const droneIdentityNFT = await DroneIdentityNFT.deploy();
  await droneIdentityNFT.waitForDeployment();
  console.log("DroneIdentityNFT deployed to:", droneIdentityNFT.target);

  // Deploy RoutePermission contract
  const RoutePermission = await ethers.getContractFactory("RoutePermission");
  const routePermission = await RoutePermission.deploy(droneIdentityNFT);
  await routePermission.waitForDeployment();
  console.log("RoutePermission deployed to:", routePermission.target);

  // Deploy ReputationToken contract
  const ReputationToken = await ethers.getContractFactory("ReputationToken");
  const reputationToken = await ReputationToken.deploy(
    "SkyLedger Reputation",
    "SLREP"
  );
  await reputationToken.waitForDeployment();
  console.log("ReputationToken deployed to:", reputationToken.target);

  // Deploy Operator contract
  const Operator = await ethers.getContractFactory("Operator");
  const operator = await Operator.deploy(reputationToken.target);
  await operator.waitForDeployment();
  console.log("Operator deployed to:", operator.target);

  // Deploy ViolationsAlerting contract
  const ViolationsAlerting = await ethers.getContractFactory(
    "ViolationsAlerting"
  );
  const penalty = ethers.parseEther("0.1"); // Example penalty amount
  const violationsAlerting = await ViolationsAlerting.deploy(
    droneIdentityNFT.target,
    operator.target,
    penalty
  );
  await violationsAlerting.waitForDeployment();
  console.log("ViolationsAlerting deployed to:", violationsAlerting.target);

  // Deploy Zones contract
  const Zones = await ethers.getContractFactory("Zones");
  const zones = await Zones.deploy();
  await zones.waitForDeployment();
  console.log("Zones deployed to:", zones.target);

  // Deploy RouteLogging contract
  const RouteLogging = await ethers.getContractFactory("RouteLogging");
  const routeLogging = await RouteLogging.deploy();
  await routeLogging.waitForDeployment();
  console.log("RouteLogging deployed to:", routeLogging.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
