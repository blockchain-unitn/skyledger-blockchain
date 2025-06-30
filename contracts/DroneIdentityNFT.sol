// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

enum DroneType {
    Medical,
    Cargo,
    Surveillance,
    Agricultural,
    Recreational,
    Mapping,
    Militar
}
enum ZoneType {
    RURAL,
    URBAN,
    HOSPITALS,
    MILITARY,
    RESTRICTED
}

struct AuthorizedPeriod {
    uint8[] daysWeek;
    uint256 from;
    uint256 to;
}

struct PermissionData {
    ZoneType[] authorizedZones;
    AuthorizedPeriod[] authorizedPeriods;
}

contract DroneIdentityNFT is ERC721Enumerable, Ownable {
    struct Drone {
        string model;
        DroneType droneType;
        string[] certHashes;
        string permissions;
        string[] ownerHistory;
        string maintenanceHash;
    }

    uint256 private _tokenIds;
    mapping(uint256 => Drone) private _drones;
    mapping(uint256 => PermissionData) private _dronePermissions;

    constructor() ERC721("DroneIdentityNFT", "DRONE") {}

    function mint(
        address to,
        string memory model,
        DroneType droneType,
        string[] memory certHashes,
        string memory permissions,
        string[] memory ownerHistory,
        string memory maintenanceHash
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIds;
        _safeMint(to, tokenId);

        _drones[tokenId] = Drone({
            model: model,
            droneType: droneType,
            certHashes: certHashes,
            permissions: permissions,
            ownerHistory: ownerHistory,
            maintenanceHash: maintenanceHash
        });

        _tokenIds++;
        return tokenId;
    }

    function getDroneData(uint256 tokenId) external view returns (Drone memory) {
        require(_exists(tokenId), "Drone does not exist");
        return _drones[tokenId];
    }

    function updateMaintenanceHash(uint256 tokenId, string memory newHash) external {
        require(_exists(tokenId), "Drone does not exist");
        require(ownerOf(tokenId) == msg.sender, "Caller is not the drone owner");
        _drones[tokenId].maintenanceHash = newHash;
    }
    function burnDrone(uint256 tokenId) external {
        require(_exists(tokenId), "Drone does not exist");
        require(ownerOf(tokenId) == msg.sender, "Caller is not the drone owner");
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
    function setDronePermissions(
    uint256 tokenId,
    ZoneType[] memory zones,
    AuthorizedPeriod[] memory periods
    ) external onlyOwner {
        require(_exists(tokenId), "Drone does not exist");

        _dronePermissions[tokenId] = PermissionData({
            authorizedZones: zones,
            authorizedPeriods: periods
        });
    }

    function getDronePermissions(uint256 tokenId) external view returns (ZoneType[] memory, AuthorizedPeriod[] memory) {
        require(_exists(tokenId), "Drone does not exist");
        PermissionData storage data = _dronePermissions[tokenId];
        return (data.authorizedZones, data.authorizedPeriods);
    }

}
