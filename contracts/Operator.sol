// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Using 0.8.20 is safer for OpenZeppelin imports and general compatibility
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Operator is ReentrancyGuard, AccessControl {
    struct OperatorInfo {
        bool registered;
    }
    mapping(address => OperatorInfo) public operators;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE"); // UTM Service Providers
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE"); // Owner of the contract (the deployer)
    IERC20Metadata public reputationToken;
    address payable public ownerAddr;

    event OperatorRegistered(address indexed operator);
    event TokensSpent(address indexed operator, uint256 amount);
    event OperatorPenalized(address indexed operator, uint256 penalty);

    modifier atLeastAdmin() {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(OWNER_ROLE, msg.sender),
            "Only admin or owner"
        );
        _;
    }

    modifier onlyOwner() {
        require(hasRole(OWNER_ROLE, msg.sender), "Only owner");
        _;
    }

    modifier onlyRegistered() {
        require(operators[msg.sender].registered, "Not registered");
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
        require(adminToRemove != msg.sender, "Cannot remove self");
        revokeRole(ADMIN_ROLE, adminToRemove);
    }

    function registerOperator(
        address payable operator
    ) external payable atLeastAdmin {
        require(!operators[operator].registered, "Already registered");
        operators[operator] = OperatorInfo({registered: true});
        // Transfer 500 reputation tokens to the operator from the contract deployer's address
        uint256 registrationAmount = 500 * (10 ** reputationToken.decimals()); // This dynamically gets decimals

        require(
            reputationToken.transferFrom(
                ownerAddr,
                operator,
                registrationAmount
            ),
            "Token transfer failed. Make sure the owner has enough tokens and has approved this contract."
        );
        emit OperatorRegistered(operator);
    }

    event Sent(address indexed to, uint256 amount);

    // Send native skyT to the owner address
    function spendTokens() public payable nonReentrant {
        // Ensure the caller is a registered operator
        require(operators[msg.sender].registered, "Not registered");
        // Ensure the caller has sent enough skyTokens
        require(msg.value > 0, "Must send skyTokens");
        (bool success, ) = ownerAddr.call{value: msg.value}("Spent SkyT");
        require(success, "Failed to send skyTokens");
        emit Sent(msg.sender, msg.value);
    }

    // Penalize operator by transferring reputation tokens from operator to the admin who calls this function
    function penalizeOperator(
        address payable operator,
        uint256 penalty
    ) external payable atLeastAdmin nonReentrant {
        require(operators[operator].registered, "Not registered");
        require(penalty > 0, "Penalty must be greater than zero");
        // Ensure the operator has enough reputation tokens to cover the penalty
        require(
            reputationToken.balanceOf(operator) >= penalty,
            "Insufficient reputation tokens"
        );
        // Operator must approve this contract to spend their tokens before penalization
        bool success = reputationToken.transferFrom(
            operator,
            payable(msg.sender),
            penalty
        );
        require(success, "Token transfer failed");
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
}
