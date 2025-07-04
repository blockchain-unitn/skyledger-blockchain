import { ethers } from "hardhat";

async function main() {
  // Deploy DroneIdentityNFT
  const DroneIdentityNFT = await ethers.getContractFactory("DroneIdentityNFT");
  const droneIdentityNFT = await DroneIdentityNFT.deploy();
  await droneIdentityNFT.waitForDeployment();
  console.log("DRONE_IDENTITY_NFT_ADDRESS=", droneIdentityNFT.target);

  // Deploy RoutePermission contract
  const RoutePermission = await ethers.getContractFactory("RoutePermission");
  const routePermission = await RoutePermission.deploy(droneIdentityNFT);
  await routePermission.waitForDeployment();
  console.log("ROUTE_PERMISSION_ADDRESS=", routePermission.target);

  // Deploy ReputationToken contract
  const ReputationToken = await ethers.getContractFactory("ReputationToken");
  const reputationToken = await ReputationToken.deploy(
    "SkyLedger Reputation",
    "SLREP"
  );
  await reputationToken.waitForDeployment();
  console.log("REPUTATION_TOKEN_ADDRESS=", reputationToken.target);

  // Deploy Operator contract
  const Operator = await ethers.getContractFactory("Operator");
  const operator = await Operator.deploy(reputationToken.target);
  await operator.waitForDeployment();
  console.log("OPERATOR_ADDRESS=", operator.target);

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
  console.log("VIOLATIONS_ALERTING_ADDRESS=", violationsAlerting.target);

  // Deploy Zones contract
  const Zones = await ethers.getContractFactory("Zones");
  const zones = await Zones.deploy();
  await zones.waitForDeployment();
  console.log("ZONES_ADDRESS=", zones.target);

  // Deploy RouteLogging contract
  const RouteLogging = await ethers.getContractFactory("RouteLogging");
  const routeLogging = await RouteLogging.deploy();
  await routeLogging.waitForDeployment();
  console.log("ROUTE_LOGGING_ADDRESS=", routeLogging.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
