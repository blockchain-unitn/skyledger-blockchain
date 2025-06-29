// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../contracts/RoutePermission.sol"; // Import RoutePermission to use its enums

contract MockDroneIdentityNFT {
    mapping(uint256 => IDroneIdentityNFT.Drone) public drones;
    // A utility struct to help set AuthorizedPeriod for tests
    struct TestAuthorizedPeriod {
        uint256 from;
        uint256 to;
        uint8[] daysWeek; // Days of week (0-6)
    }
    // function to map TestAuthorizedPeriod to AuthorizedPeriod
    function mapTestAuthorizedPeriodToAuthorizedPeriod(
        TestAuthorizedPeriod calldata testPeriod
    ) internal pure returns (IDroneIdentityNFT.AuthorizedPeriod memory) {
        return IDroneIdentityNFT.AuthorizedPeriod({
            daysWeek: testPeriod.daysWeek,
            from: testPeriod.from,
            to: testPeriod.to
        });
    }

    // Optimized setDroneDetails to reduce gas usage
    function setDroneDetails(
        uint256 _droneId,
        string calldata _model,
        address _operatorId,
        ZoneType[] calldata _authorizedZones,
        TestAuthorizedPeriod[] calldata _testAuthorizedPeriods
    ) external {
        IDroneIdentityNFT.Drone storage drone = drones[_droneId];

        // Directly assign calldata string to storage (cheaper than memory)
        drone.model = _model;
        drone.operatorId = _operatorId;

        // Clear and set authorizedZones efficiently
        delete drone.authorizedZones;
        drone.authorizedZones = _authorizedZones;

        // Clear and set authorizedPeriods efficiently
        delete drone.authorizedPeriods;
        for (uint256 i = 0; i < _testAuthorizedPeriods.length; i++) {
            drone.authorizedPeriods.push(
                mapTestAuthorizedPeriodToAuthorizedPeriod(_testAuthorizedPeriods[i])
            );
        }
    }

    function getDroneInfo(
        uint256 droneId
    ) external view returns (IDroneIdentityNFT.Drone memory) {
        return drones[droneId];
    }
}