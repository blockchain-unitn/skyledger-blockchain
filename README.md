# SkyLedger BlockChain

This project implements a UTM (Unmanned Traffic Management) flight permission system using Solidity smart contracts and Hardhat. It includes:

- `RoutePermission` contract for drone route pre-authorization and validation.
- `Operator` contract for operator registration, reputation management, and token spending.
- `ReputationToken` contract (ERC20) for tracking operator reputation in the system.
- `DroneIdentityNFT` contract for creation of NFT of the drones
- `ViolationsAlerting` contract for storing on the blockchain the violated positions of the drones
- Hardhat configuration with TypeScript and TypeChain.
- Example scripts for deployment and end-to-end testing.

# Main Instructions

## Creation of the avalanche network and subnet

### Prerequisites

Ensure you have installed:

- **Go ≥ 1.18**
- **Avalanche CLI**
  
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
- Get address from (NOT ewoq)
- Use defaults for test environment
- ID: 2578
- Token: skyT

Deploy:
```bash
avalanche blockchain deploy skyLedgerBlockchain --local
```

### Account Setup
1. **Create a new network on MetaMask using your local network connection data.**
2. **Create account key**
```bash
avalanche key create skyLedger1
```
Use the private key found in the `~/.avalanche-cli/keys/` folder to import the account into MetaMask.

Test with this funded test account (for local transfers):
```bash
0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027
```

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
     PRIVATE_KEY_3=your_private_key_here
     RPC_URL=your_rpc_url
     RPC_CHAIN_ID=your_chain_id
     ```

5. **Deploy contracts locally:**

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
   ```
and finally:
   ```shell
   npx hardhat test scripts/< nameOfTest >.live.test.ts --network custom
   ```
   

## Additional Notes

- Contracts are located in the `contracts/` directory.
- Deployment and test scripts are in the `scripts/` folder.
- TypeChain-generated types are in `typechain-types/`.
- Gas usage reporting is enabled by default.

## Contributors

- SkyLedger Team
  - Andrea Ballarini
  - Luca Claus
  - Davide Zanolini
