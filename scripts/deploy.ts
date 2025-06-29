import { ethers } from "hardhat";

async function main() {
    // Deploy MockDroneIdentityNFT contract first
    const MockDroneIdentityNFT = await ethers.getContractFactory("MockDroneIdentityNFT");
    const mockDroneIdentityNFT = await MockDroneIdentityNFT.deploy();
    await mockDroneIdentityNFT.waitForDeployment();
    const mockDroneIdentityNFTAddress = mockDroneIdentityNFT.target;
    console.log("MockDroneIdentityNFT deployed to:", mockDroneIdentityNFTAddress);

    // Deploy RoutePermission contract
    const RoutePermission = await ethers.getContractFactory("RoutePermission");
    const routePermission = await RoutePermission.deploy(mockDroneIdentityNFTAddress);

    await routePermission.waitForDeployment();

    console.log("RoutePermission deployed to:", routePermission.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});