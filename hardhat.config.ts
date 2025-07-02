import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; // Imports all plugins in Hardhat Toolbox
import * as dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file
import "hardhat-gas-reporter"; // Optional: For gas reporting

const { PRIVATE_KEY_1, PRIVATE_KEY_2, PRIVATE_KEY_3, RPC_URL, RPC_CHAIN_ID } = process.env;
if (!PRIVATE_KEY_1 || !PRIVATE_KEY_2 || !PRIVATE_KEY_3 || !RPC_URL || !RPC_CHAIN_ID) {
  throw new Error(
    "Please set your PRIVATE_KEY_1, PRIVATE_KEY_2, PRIVATE_KEY_3, RPC_URL, and RPC_CHAIN_ID in the .env file"
  );
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28", // Matches the contract's pragma
    settings: {
      viaIR: true, // Use the IR optimizer for better performance
      optimizer: {
        enabled: true, // Enable the Solidity compiler optimizer
        runs: 200, // Default runs, can be adjusted for specific needs
      },
    },
  },
  networks: {
    hardhat: {},
    custom: {
      url: RPC_URL,
      chainId: Number(RPC_CHAIN_ID),
      accounts: [PRIVATE_KEY_1, PRIVATE_KEY_2, PRIVATE_KEY_3], // Use the private key from .env
      allowUnlimitedContractSize: true,
      gas: 8000000,
      blockGasLimit: 8000000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: true, // Enable gas reporting
    showUncalledMethods: true, // Display ALL methods, even if not called
    showMethodSig: true, // Show full function signatures
    reportPureAndViewMethods: true, // Include pure/view functions
    includeIntrinsicGas: true, // Include intrinsic gas overhead
    excludeContracts: [], // Make sure your contract isn't here
  },
};

export default config;
