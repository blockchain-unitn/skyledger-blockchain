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