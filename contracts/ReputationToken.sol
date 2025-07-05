/**
 * @title ReputationToken
 * @dev A simple ERC20 token for tracking user reputation in the SkyLedger system
 *
 * This contract creates a reputation token that can be:
 * - Transferred between users
 * - Minted by the owner as rewards
 * - Burned by the owner as penalties
 *
 * @notice The owner (typically the main contract) controls minting and burning
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Use your project's Solidity version

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // Useful if you want an owner to mint/burn

contract ReputationToken is ERC20, Ownable {
    /**
     * @dev Constructor that gives the deployer an initial supply of tokens
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     */
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        // Initial supply set to 1,000,000 tokens
        _mint(msg.sender, 1000000 * (10 ** decimals()));
    }

    /**
     * @dev Mint new tokens to a specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from a specified address
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
}
