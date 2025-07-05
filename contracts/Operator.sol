// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Using 0.8.20 is safer for OpenZeppelin imports and general compatibility
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// Custom errors
error NotRegistered();
error NoSkyTokensSent();
error TokenTransferFailed();
error NotAdminOrOwner();
error NotOwner();
error AlreadyRegistered();
error SelfRemovalNotAllowed();

contract Operator is ReentrancyGuard, AccessControl {
    struct OperatorInfo {
        bool registered;
    }
    mapping(address => OperatorInfo) public operators;
    address[] private _allOperators;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE"); // UTM Service Providers
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE"); // Owner of the contract (the deployer)
    IERC20Metadata public reputationToken;
    address payable public ownerAddr;

    event OperatorRegistered(address indexed operator);
    event TokensSpent(address indexed operator, uint256 amount);
    event OperatorPenalized(address indexed operator, uint256 penalty);

    modifier atLeastAdmin() {
        if (
            !(hasRole(ADMIN_ROLE, msg.sender) ||
                hasRole(OWNER_ROLE, msg.sender))
        ) {
            revert NotAdminOrOwner();
        }
        _;
    }

    modifier onlyOwner() {
        if (!hasRole(OWNER_ROLE, msg.sender)) {
            revert NotOwner();
        }
        _;
    }

    modifier onlyRegistered() {
        if (!operators[msg.sender].registered) {
            revert NotRegistered();
        }
        _;
    }

    constructor(address _reputationToken) {
        _grantRole(OWNER_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); // Default admin role for AccessControl
        ownerAddr = payable(msg.sender);
        reputationToken = IERC20Metadata(_reputationToken);
    }

    function addAdmin(address newAdmin) external onlyOwner {
        grantRole(ADMIN_ROLE, newAdmin);
    }

    function removeAdmin(address adminToRemove) external onlyOwner {
        if (adminToRemove == msg.sender) {
            revert SelfRemovalNotAllowed();
        }
        revokeRole(ADMIN_ROLE, adminToRemove);
    }

    function registerOperator(
        address payable operator
    ) external payable atLeastAdmin {
        if (operators[operator].registered) {
            revert AlreadyRegistered();
        }
        operators[operator] = OperatorInfo({registered: true});
        _allOperators.push(operator);
        // Transfer 500 reputation tokens to the operator from the contract deployer's address
        uint256 registrationAmount = 500 * (10 ** reputationToken.decimals()); // This dynamically gets decimals

        if (
            !reputationToken.transferFrom(
                ownerAddr,
                operator,
                registrationAmount
            )
        ) {
            revert TokenTransferFailed();
        }
        emit OperatorRegistered(operator);
    }

    event Sent(address indexed to, uint256 amount);

    // Send native skyT to the owner address
    function spendTokens() public payable nonReentrant {
        // Ensure the caller is a registered operator
        if (!operators[msg.sender].registered) revert NotRegistered();
        // Ensure the caller has sent enough skyTokens
        if (msg.value == 0) revert NoSkyTokensSent();
        (bool success, ) = ownerAddr.call{value: msg.value}("Spent SkyT");
        if (!success) {
            revert TokenTransferFailed();
        }
        emit Sent(msg.sender, msg.value);
    }

    // Penalize operator by transferring reputation tokens from operator to the admin who calls this function
    function penalizeOperator(
        address payable operator,
        uint256 penalty
    ) external payable atLeastAdmin nonReentrant {
        if (!operators[operator].registered) {
            revert NotRegistered();
        }
        if (penalty == 0) {
            revert TokenTransferFailed();
        }
        if (reputationToken.balanceOf(operator) < penalty) {
            revert TokenTransferFailed();
        }
        // Operator must approve this contract to spend their tokens before penalization
        bool success = reputationToken.transferFrom(
            operator,
            ownerAddr, // Transfer to the owner address
            penalty
        );
        if (!success) {
            revert TokenTransferFailed();
        }
        emit OperatorPenalized(operator, penalty);
    }

    function getReputation(
        address operator
    ) external view returns (uint256 reputationBalance) {
        return reputationToken.balanceOf(operator);
    }

    function getOperatorInfo(
        address operatorAddress
    ) external view returns (OperatorInfo memory) {
        return operators[operatorAddress];
    }

    function getAllOperators() external view returns (address[] memory) {
        return _allOperators;
    }
}
