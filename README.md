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

1. **Clone the repository**:
    ```bash
    git clone https://github.com/blockchain-unitn/skyledger-blockchain.git
    cd skyledger-blockchain
    ```

2. **Install dependencies:**

   ```shell
   npm install
   ```
3. **Environment setup:**

   - Create skyLedger2 and skyLedger3 accounts in the network and add them to metamask and send money.
   - Copy `.env.orig` to `.env` and fill in your private keys and RPC details.

   ```bash
   cp .env.orig .env
   ```

   - Example:
     ```
     PRIVATE_KEY_1=your_private_key_here
     PRIVATE_KEY_2=your_private_key_here
     PRIVATE_KEY_3=your_private_key_here
     RPC_URL=your_rpc_url
     RPC_CHAIN_ID=your_chain_id
     ```

4. **Compile contracts:**

   ```shell
   npx hardhat compile
   ```

5. **Run tests:**

   ```shell
   npx hardhat test
   ```

6. **Deploy contracts in your network:**

   ```shell
   npx hardhat run scripts/deploy.ts --network custom
   ```

   save the contracts addresses.

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
