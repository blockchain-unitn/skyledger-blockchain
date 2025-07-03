// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDroneIdentityNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function totalSupply() external view returns (uint256);
}

contract ViolationsAlerting {
    struct Violation {
        string droneID;
        string position;
        uint256 timestamp;
    }

    Violation[] public violations;
    IDroneIdentityNFT public droneRegistry;

    event ViolationReported(
        string indexed droneID,
        string position,
        uint256 timestamp
    );

    constructor(address _droneRegistry) {
        droneRegistry = IDroneIdentityNFT(_droneRegistry);
    }

    modifier onlyRegisteredDrone(uint256 droneId) {
        require(isDroneRegistered(droneId), "Drone is not registered on the blockchain");
        _;
    }

    function isDroneRegistered(uint256 droneId) public view returns (bool) {
        try droneRegistry.ownerOf(droneId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    function reportViolation(uint256 droneId, string memory position) public onlyRegisteredDrone(droneId) {
        uint256 currentTime = block.timestamp;

        // Convert droneId to string for storage
        string memory droneIdStr = uintToString(droneId);

        violations.push(Violation({
            droneID: droneIdStr,
            position: position,
            timestamp: currentTime
        }));

        emit ViolationReported(droneIdStr, position, currentTime);
    }

    // Helper function to convert uint to string
    function uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // Helper function to convert string to uint
    function stringToUint(string memory s) internal pure returns (uint256) {
        bytes memory b = bytes(s);
        uint256 result = 0;
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            require(c >= 48 && c <= 57, "Invalid character in drone ID");
            result = result * 10 + (c - 48);
        }
        return result;
    }

    function getViolationsCount() public view returns (uint256) {
        return violations.length;
    }

    function getViolation(uint256 index) public view returns (string memory, string memory, uint256) {
        require(index < violations.length, "Indice non valido");
        Violation memory v = violations[index];
        return (v.droneID, v.position, v.timestamp);
    }

    // 🔹 Restituisce tutte le posizioni di un drone specifico
    function getViolationsByDrone(string memory targetDroneID) public view returns (string[] memory positions, uint256[] memory timestamps) {
        uint256 count = 0;

        // Conta quante violazioni ha questo drone
        for (uint256 i = 0; i < violations.length; i++) {
            if (keccak256(bytes(violations[i].droneID)) == keccak256(bytes(targetDroneID))) {
                count++;
            }
        }

        // Alloca gli array di output
        positions = new string[](count);
        timestamps = new uint256[](count);

        uint256 j = 0;
        for (uint256 i = 0; i < violations.length; i++) {
            if (keccak256(bytes(violations[i].droneID)) == keccak256(bytes(targetDroneID))) {
                positions[j] = violations[i].position;
                timestamps[j] = violations[i].timestamp;
                j++;
            }
        }

        return (positions, timestamps);
    }

    // 🔹 Restituisce tutte le violazioni (droneID + posizione + timestamp)
    function getAllViolations() public view returns (string[] memory droneIDs, string[] memory positions, uint256[] memory timestamps) {
        uint256 len = violations.length;
        droneIDs = new string[](len);
        positions = new string[](len);
        timestamps = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            droneIDs[i] = violations[i].droneID;
            positions[i] = violations[i].position;
            timestamps[i] = violations[i].timestamp;
        }

        return (droneIDs, positions, timestamps);
    }
}
