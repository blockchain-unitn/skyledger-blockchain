# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

## [Unreleased]

### Added

- Initial implementation of the UTM flight permission smart contract system.
- `RoutePermission` contract for managing drone route pre-authorization.
- `IDroneIdentityNFT` interface for drone identity management.
- `MockDroneIdentityNFT` contract for testing purposes.
- Hardhat configuration with support for custom networks and gas reporting.
- TypeChain type generation for all contracts and interfaces.
- Example `Lock` contract and deployment/test scripts.
- Project scripts for deployment and testing.
- TypeScript and Hardhat Toolbox setup.
- `.env` support for private keys and RPC configuration.
- Comprehensive `.gitignore` for build, cache, and environment files.
- `DroneIdentityNFT` contract for creation of NFT of the drones
- Delete `MockDroneIdentityNFT` and update `RoutePermission` contract and tests and env.orig file
- `ViolationsAlerting` contract for the storing and alerting of unauthorized locations of drones
- `ReputationToken` (ERC20) and `Operator` contracts for managing operator reputation.
- Unit tests for `ReputationToken` and `Operator` contracts.
- End-to-end test script for `Operator` and `ReputationToken` interactions on the blockchain after deploy.
- Updated configuration to support a third account and new contract addresses.
- `Zones` contract for storing and managing geographical zones with different types 
- Comprehensive test suite for the `Zones` contract covering all functionality and edge cases.
- `RouteLogging` contract for logging drone route data and flight information.
- Complete test coverage for `RouteLogging` contract with event validation and data integrity checks.
- Updated deployment script to include both new contracts (`Zones` and `RouteLogging`).

### Changed

- Enhanced `ViolationsAlerting` contract with drone registration verification through DroneIdentityNFT integration.
- Added drone registration validation to prevent violations being reported for unregistered drones.
- Updated `ViolationsAlerting` test suite to include comprehensive drone registration verification 