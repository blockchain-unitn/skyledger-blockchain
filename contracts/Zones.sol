// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

enum ZoneType {
    RURAL,
    URBAN,
    HOSPITALS,
    MILITARY,
    RESTRICTED
}

struct Coordinates {
    int256 latitude;   // Latitude in degrees * 10^6 (to avoid floating point)
    int256 longitude;  // Longitude in degrees * 10^6 (to avoid floating point)
}

struct Zone {
    uint256 id;
    string name;
    ZoneType zoneType;
    Coordinates[] boundaries;  // Array of coordinates defining the zone boundary
    uint256 maxAltitude;      // Maximum allowed altitude in meters
    uint256 minAltitude;      // Minimum allowed altitude in meters
    bool isActive;            // Whether the zone is currently active
    string description;       // Additional information about the zone
    uint256 createdAt;        // Timestamp when zone was created
    uint256 updatedAt;        // Timestamp when zone was last updated
}

// Custom errors
error ZoneDoesNotExist();
error ZoneNameEmpty();
error ZoneBoundaryTooSmall();
error InvalidAltitudeRange();

contract Zones is Ownable {
    uint256 private _zoneCounter;
    mapping(uint256 => Zone) private _zones;
    mapping(ZoneType => uint256[]) private _zonesByType;
    
    // Events
    event ZoneCreated(uint256 indexed zoneId, string name, ZoneType zoneType);
    event ZoneUpdated(uint256 indexed zoneId, string name);
    event ZoneStatusChanged(uint256 indexed zoneId, bool isActive);
    event ZoneDeleted(uint256 indexed zoneId);

    constructor() {}
    
    function createZone(
        string memory name,
        ZoneType zoneType,
        Coordinates[] memory boundaries,
        uint256 maxAltitude,
        uint256 minAltitude,
        string memory description
    ) public onlyOwner returns (uint256) {
        if (bytes(name).length == 0) revert ZoneNameEmpty();
        if (boundaries.length < 3) revert ZoneBoundaryTooSmall();
        if (maxAltitude < minAltitude) revert InvalidAltitudeRange();

        _zoneCounter++;
        uint256 zoneId = _zoneCounter;

        Zone storage newZone = _zones[zoneId];
        newZone.id = zoneId;
        newZone.name = name;
        newZone.zoneType = zoneType;
        newZone.maxAltitude = maxAltitude;
        newZone.minAltitude = minAltitude;
        newZone.isActive = true;
        newZone.description = description;
        newZone.createdAt = block.timestamp;
        newZone.updatedAt = block.timestamp;

        // Copy boundaries
        for (uint256 i = 0; i < boundaries.length; i++) {
            newZone.boundaries.push(boundaries[i]);
        }

        // Add to zone type mapping
        _zonesByType[zoneType].push(zoneId);

        emit ZoneCreated(zoneId, name, zoneType);
        return zoneId;
    }

    function updateZone(
        uint256 zoneId,
        string memory name,
        Coordinates[] memory boundaries,
        uint256 maxAltitude,
        uint256 minAltitude,
        string memory description
    ) public onlyOwner {
        if (_zones[zoneId].id == 0) revert ZoneDoesNotExist();
        if (bytes(name).length == 0) revert ZoneNameEmpty();
        if (boundaries.length < 3) revert ZoneBoundaryTooSmall();
        if (maxAltitude < minAltitude) revert InvalidAltitudeRange();

        Zone storage zone = _zones[zoneId];
        zone.name = name;
        zone.maxAltitude = maxAltitude;
        zone.minAltitude = minAltitude;
        zone.description = description;
        zone.updatedAt = block.timestamp;

        // Clear existing boundaries and add new ones
        delete zone.boundaries;
        for (uint256 i = 0; i < boundaries.length; i++) {
            zone.boundaries.push(boundaries[i]);
        }

        emit ZoneUpdated(zoneId, name);
    }

    function setZoneStatus(uint256 zoneId, bool isActive) public onlyOwner {
        if (_zones[zoneId].id == 0) revert ZoneDoesNotExist();
        
        _zones[zoneId].isActive = isActive;
        _zones[zoneId].updatedAt = block.timestamp;
        
        emit ZoneStatusChanged(zoneId, isActive);
    }

    function deleteZone(uint256 zoneId) public onlyOwner {
        if (_zones[zoneId].id == 0) revert ZoneDoesNotExist();
        
        ZoneType zoneType = _zones[zoneId].zoneType;
        
        // Remove from zone type mapping
        uint256[] storage zoneIds = _zonesByType[zoneType];
        for (uint256 i = 0; i < zoneIds.length; i++) {
            if (zoneIds[i] == zoneId) {
                zoneIds[i] = zoneIds[zoneIds.length - 1];
                zoneIds.pop();
                break;
            }
        }
        
        delete _zones[zoneId];
        emit ZoneDeleted(zoneId);
    }

    function getZone(uint256 zoneId) public view returns (Zone memory) {
        if (_zones[zoneId].id == 0) revert ZoneDoesNotExist();
        return _zones[zoneId];
    }

    function getZonesByType(ZoneType zoneType) public view returns (uint256[] memory) {
        return _zonesByType[zoneType];
    }

    function getZoneBoundaries(uint256 zoneId) public view returns (Coordinates[] memory) {
        if (_zones[zoneId].id == 0) revert ZoneDoesNotExist();
        return _zones[zoneId].boundaries;
    }

    function zoneExists(uint256 zoneId) public view returns (bool) {
        return _zones[zoneId].id != 0;
    }

    function getTotalZones() public view returns (uint256) {
        return _zoneCounter;
    }

    function getActiveZonesByType(ZoneType zoneType) public view returns (uint256[] memory) {
        uint256[] memory allZones = _zonesByType[zoneType];
        uint256 activeCount = 0;
        
        // Count active zones
        for (uint256 i = 0; i < allZones.length; i++) {
            if (_zones[allZones[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active zones
        uint256[] memory activeZones = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allZones.length; i++) {
            if (_zones[allZones[i]].isActive) {
                activeZones[index] = allZones[i];
                index++;
            }
        }
        
        return activeZones;
    }
}