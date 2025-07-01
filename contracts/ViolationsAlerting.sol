// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ViolationsAlerting {
    struct Violation {
        string droneID;
        string position;
        uint256 timestamp;
    }

    Violation[] public violations;

    event ViolationReported(
        string indexed droneID,
        string position,
        uint256 timestamp
    );

    function reportViolation(string memory droneID, string memory position) public {
        uint256 currentTime = block.timestamp;

        violations.push(Violation({
            droneID: droneID,
            position: position,
            timestamp: currentTime
        }));

        emit ViolationReported(droneID, position, currentTime);
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
