# SkyLedger BlockChain

This project implements a UTM (Unmanned Traffic Management) flight permission system using Avalanche Blockchain with Solidity smart contracts and Hardhat. It includes:

- `DroneIdentityNFT` contract (ERC721) for creation and management of NFTs of the drones
- `Zones` contract for creation and management of Airzones
- `RoutePermission` contract for drone route pre-authorization and validation.
- `RouteLogging` contract is a smart contract for recording and managing drone flight route data.
- `Operator` contract for operator registration, reputation management, and token spending.
- `ReputationToken` contract (ERC20) for tracking operator reputation in the system.
- `ViolationsAlerting` contract for storing on the blockchain the violated positions of the drones
- Hardhat configuration with TypeScript and TypeChain.
- Example scripts for deployment and end-to-end testing.

# Main Instructions

## Creation of the avalanche network and subnet

### Prerequisites

Ensure you have installed:

- **Go ≥ 1.18**
  
Install Avalanche CLI:
```bash
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh -s
export PATH=~/bin:$PATH >> .bashrc
avalanche --version
```
### Create Avalanche L1 Blockchain
Create blockchain configuration:

```bash
avalanche blockchain create skyLedgerBlockchain
```

Wizard choices:

- Subnet-EVM
- Proof-of-Authority
- Get address from ... (NOT ewoq)
- Use defaults for test environment
- ID: 2578
- Token: skyT

Deploy:
```bash
avalanche blockchain deploy skyLedgerBlockchain --local
```

### Account Setup
1. **Create a new network on MetaMask using your local network (RPC_URL) connection data.**
2. **Create account key**
```bash
avalanche key create skyLedger1
```
Use the private key 'skyLedger1.pk' found in the `~/.avalanche-cli/keys/` folder to import the account into MetaMask.

Test with this funded test account (for local transfers), add this account:
```bash
0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027
```
and send money from the funded test account to skyLedger1.pk account.

## Testing and Deploying of the contracts

Make sure you are the directory of the project.

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

   - Create skyLedger2 and skyLedger3 accounts in the network.
   - Copy `.env.orig` to `.env` and fill in your private keys and RPC details.
   - Example:
     ```
     PRIVATE_KEY_1=your_private_key_here
     PRIVATE_KEY_2=your_private_key_here
     PRIVATE_KEY_3=your_private_key_here
     RPC_URL=your_rpc_url
     RPC_CHAIN_ID=your_chain_id
     ```
5. **Deploy contracts in your network:**

   ```shell
   npx hardhat run scripts/deploy.ts --network custom
   ```

6. **Run end-to-end tests:**
Make sure to add the following addresses to your `.env` file:
   ```
   DRONE_IDENTITY_NFT_ADDRESS=address_drone_identity_nft_here
   ROUTE_PERMISSION_ADDRESS=address_route_permission_here
   VIOLATIONS_ALERTING_ADDRESS=address_violations_alerting_here
   REPUTATION_TOKEN_ADDRESS=address_reputation_token_here
   OPERATOR_ADDRESS=address_operator_here
   ZONES_ADDRESS=address_zones_here
   ROUTE_LOGGING_ADDRESS=address_route_logging_here
   ```


## Additional step 

   ```shell
   npx hardhat test scripts/< nameOfTest >.live.test.ts --network custom
   ```
for testing the contracts directly in the network.

## Additional Notes

- Contracts are located in the `contracts/` directory.
- Deployment and test scripts are in the `scripts/` folder.
- TypeChain-generated types are in `typechain-types/`.
- Gas usage reporting is enabled by default.

## Contributors

- SkyLedger Team:
  - Andrea Ballarini
  - Luca Claus
  - Davide Zanolini
