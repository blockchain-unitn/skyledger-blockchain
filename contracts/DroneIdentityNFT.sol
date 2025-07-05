// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

enum DroneType {
    MEDICAL,
    CARGO,
    SURVEILLANCE,
    AGRICULTURAL,
    RECREATIONAL,
    MAPPING,
    MILITAR
}

enum ZoneType {
    RURAL,
    URBAN,
    HOSPITALS,
    MILITARY,
    RESTRICTED
}

enum DroneStatus {
    ACTIVE,
    MAINTENANCE,
    INACTIVE
}

error DroneDoesNotExist();
error CallerIsNotDroneOwner();
error CallerNotAuthorized();

contract DroneIdentityNFT is ERC721Enumerable, Ownable {
    struct Drone {
        string serialNumber;
        string model;
        DroneType droneType;
        string[] certHashes;
        ZoneType[] permittedZones;
        string[] ownerHistory;
        string maintenanceHash;
        DroneStatus status;
    }

    uint256 private _tokenIds;
    mapping(uint256 => Drone) private _drones;

    constructor() ERC721("DroneIdentityNFT", "DRONE") {}

    function mint(
        address to,
        string memory serialNumber,
        string memory model,
        DroneType droneType,
        string[] memory certHashes,
        ZoneType[] memory permittedZones,
        string[] memory ownerHistory,
        string memory maintenanceHash,
        DroneStatus status
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIds;
        _safeMint(to, tokenId);

        _drones[tokenId] = Drone({
            serialNumber: serialNumber,
            model: model,
            droneType: droneType,
            certHashes: certHashes,
            permittedZones: permittedZones,
            ownerHistory: ownerHistory,
            maintenanceHash: maintenanceHash,
            status: status
        });

        _tokenIds++;
        return tokenId;
    }

    function getDroneData(uint256 tokenId) external view returns (Drone memory) {
        if (!_exists(tokenId)) revert DroneDoesNotExist();
        return _drones[tokenId];
    }

    function updateCertHashes(uint256 tokenId, string[] memory newCertHashes) external {
        if (!_exists(tokenId)) revert DroneDoesNotExist();
        if (ownerOf(tokenId) != msg.sender) revert CallerIsNotDroneOwner();
        _drones[tokenId].certHashes = newCertHashes;
    }

    function updatePermittedZones(uint256 tokenId, ZoneType[] memory newZones) external {
        if (!_exists(tokenId)) revert DroneDoesNotExist();
        if (ownerOf(tokenId) != msg.sender) revert CallerIsNotDroneOwner();
        _drones[tokenId].permittedZones = newZones;
    }

    function updateOwnerHistory(uint256 tokenId, string[] memory newOwnerHistory) external {
        if (!_exists(tokenId)) revert DroneDoesNotExist();
        if (ownerOf(tokenId) != msg.sender) revert CallerIsNotDroneOwner();
        _drones[tokenId].ownerHistory = newOwnerHistory;
    }

    function updateMaintenanceHash(uint256 tokenId, string memory newHash) external {
        if (!_exists(tokenId)) revert DroneDoesNotExist();
        if (ownerOf(tokenId) != msg.sender) revert CallerIsNotDroneOwner();
        _drones[tokenId].maintenanceHash = newHash;
    }

    function updateStatus(uint256 tokenId, DroneStatus newStatus) external {
        if (!_exists(tokenId)) revert DroneDoesNotExist();
        if (ownerOf(tokenId) != msg.sender && owner() != msg.sender) revert CallerNotAuthorized();
        _drones[tokenId].status = newStatus;
    }

    function burnDrone(uint256 tokenId) external {
        if (!_exists(tokenId)) revert DroneDoesNotExist();
        if (ownerOf(tokenId) != msg.sender) revert CallerIsNotDroneOwner();
        _burn(tokenId);
        delete _drones[tokenId];
    }

    function getAllDrones() external view returns (uint256[] memory) {
        uint256 total = totalSupply();
        uint256[] memory tokens = new uint256[](total);
        for (uint256 i = 0; i < total; i++) {
            tokens[i] = tokenByIndex(i);
        }
        return tokens;
    }
}
