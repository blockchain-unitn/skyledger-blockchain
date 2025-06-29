# SkyLedger BlockChain

This project implements a UTM (Unmanned Traffic Management) flight permission system using Solidity smart contracts and Hardhat. It includes:

- `RoutePermission` contract for drone route pre-authorization and validation.
- `IDroneIdentityNFT` interface and `MockDroneIdentityNFT` contract for drone identity management and testing.
- Hardhat configuration with TypeScript and TypeChain.
- Example scripts for deployment and end-to-end testing.

## Main Instructions

1. **Install dependencies:**

   ```shell
   npm install
   ```

2. **Compile contracts:**

   ```shell
   npx hardhat compile
   ```

3. **Run tests:**

   ```shell
   npx hardhat test
   ```

4. **Environment setup:**

   - Copy `.env.orig` to `.env` and fill in your private keys and RPC details.
   - Example:
     ```
     PRIVATE_KEY_1=your_private_key_here
     PRIVATE_KEY_2=your_private_key_here
     RPC_URL=your_rpc_url
     RPC_CHAIN_ID=your_chain_id
     ```

5. **Deploy contracts locally:**

   ```shell
   npx hardhat run scripts/deploy.ts --network custom
   ```

6. **Run end-to-end tests:**
   ```shell
   npx hardhat test scripts/live.test.ts --network custom
   ```
   This can be run after deploying the contracts. Make sure to add the following addresses to your `.env` file:
   ```
   ROUTE_PERMISSION_ADDRESS=address_route_permission_here
   MOCK_DRONE_NFT_ADDRESS=address_mock_drone_nft_here
   ```

## Additional Notes

- Contracts are located in the `contracts/` directory.
- Deployment and test scripts are in the `scripts/` folder.
- TypeChain-generated types are in `typechain-types/`.
- Gas usage reporting is enabled by default.

## Contributors

- SkyLedger Team
  - Andrea Ballarini
