// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDroneIdentityNFT {
    function ownerOf(uint256 tokenId) external view returns (address);

    function totalSupply() external view returns (uint256);
}

interface IOperator {
    function penalizeOperator(
        address payable operator,
        uint256 penalty
    ) external payable;
}

contract ViolationsAlerting {
    struct Violation {
        string droneID;
        string position;
        uint256 timestamp;
    }

    Violation[] public violations;
    IDroneIdentityNFT public droneRegistry;
    IOperator public operatorContract;
    uint256 public penaltyAmount; // Penalty amount for each violation

    event ViolationReported(
        string indexed droneID,
        string position,
        uint256 timestamp
    );

    constructor(
        address _droneRegistry,
        address _operatorContract,
        uint256 _penaltyAmount
    ) {
        droneRegistry = IDroneIdentityNFT(_droneRegistry);
        operatorContract = IOperator(_operatorContract);
        penaltyAmount = _penaltyAmount;
    }

    modifier onlyRegisteredDrone(uint256 droneId) {
        require(
            isDroneRegistered(droneId),
            "Drone is not registered on the blockchain"
        );
        _;
    }

    function isDroneRegistered(uint256 droneId) public view returns (bool) {
        try droneRegistry.ownerOf(droneId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    function reportViolation(
        uint256 droneId,
        string memory position
    ) public onlyRegisteredDrone(droneId) {
        uint256 currentTime = block.timestamp;

        // Convert droneId to string for storage
        string memory droneIdStr = uintToString(droneId);

        // take the owner of the drone
        address droneOwner = droneRegistry.ownerOf(droneId);

        violations.push(
            Violation({
                droneID: droneIdStr,
                position: position,
                timestamp: currentTime
            })
        );

        emit ViolationReported(droneIdStr, position, currentTime);

        operatorContract.penalizeOperator(payable(droneOwner), penaltyAmount);
    }

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

    function getViolation(
        uint256 index
    ) public view returns (string memory, string memory, uint256) {
        require(index < violations.length, "Invalid index");
        Violation memory v = violations[index];
        return (v.droneID, v.position, v.timestamp);
    }

    function getViolationsByDrone(
        string memory targetDroneID
    )
        public
        view
        returns (string[] memory positions, uint256[] memory timestamps)
    {
        uint256 count = 0;

        for (uint256 i = 0; i < violations.length; i++) {
            if (
                keccak256(bytes(violations[i].droneID)) ==
                keccak256(bytes(targetDroneID))
            ) {
                count++;
            }
        }

        positions = new string[](count);
        timestamps = new uint256[](count);

        uint256 j = 0;
        for (uint256 i = 0; i < violations.length; i++) {
            if (
                keccak256(bytes(violations[i].droneID)) ==
                keccak256(bytes(targetDroneID))
            ) {
                positions[j] = violations[i].position;
                timestamps[j] = violations[i].timestamp;
                j++;
            }
        }

        return (positions, timestamps);
    }

    function getAllViolations()
        public
        view
        returns (
            string[] memory droneIDs,
            string[] memory positions,
            uint256[] memory timestamps
        )
    {
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
