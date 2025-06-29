// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28; // Using 0.8.28 for built-in overflow/underflow checks

enum PreAuthorizationStatus {
    APPROVED,
    FAILED
}
enum ZoneType {
    RURAL,
    URBAN,
    HOSPITALS,
    MILITARY,
    RESTRICTED
}

interface IDroneIdentityNFT {
    struct AuthorizedPeriod {
        uint8[] daysWeek; // Days of week (0-6)
        uint256 from; // Timestamp
        uint256 to; // Timestamp
    }

    struct Drone {
        string model;
        address operatorId;
        ZoneType[] authorizedZones;
        AuthorizedPeriod[] authorizedPeriods;
    }

    function getDroneInfo(
        uint256 droneId
    ) external view returns (Drone calldata);
}

contract RoutePermission {
    IDroneIdentityNFT public droneNFT;

    struct RouteCharacteristics {
        ZoneType[] zones;
        uint256 altitudeLimit;
    }

    struct RouteRequest {
        uint256 droneId;
        RouteCharacteristics route;
        uint256 startTime;
        uint256 endTime;
        uint8[] daysOfWeek; // 0-6 for days
    }

    struct AuthorizationResponse {
        uint256 droneId;
        PreAuthorizationStatus preauthorizationStatus;
        string reason;
    }

    event RouteAuthorizationRequested(
        uint256 indexed droneId,
        PreAuthorizationStatus status
    );

    constructor(address _droneNFT) {
        droneNFT = IDroneIdentityNFT(_droneNFT);
    }

    function checkRouteAuthorization(
        RouteRequest calldata request
    ) external view returns (AuthorizationResponse memory) {
        try this._validateRoute(request) {
            return
                AuthorizationResponse({
                    droneId: request.droneId,
                    preauthorizationStatus: PreAuthorizationStatus.APPROVED,
                    reason: ""
                });
        } catch Error(string memory reason) {
            return
                AuthorizationResponse({
                    droneId: request.droneId,
                    preauthorizationStatus: PreAuthorizationStatus.FAILED,
                    reason: reason
                });
        } catch {
            return
                AuthorizationResponse({
                    droneId: request.droneId,
                    preauthorizationStatus: PreAuthorizationStatus.FAILED,
                    reason: "Unknown error"
                });
        }
    }

    function _validateRoute(RouteRequest calldata request) external view {
        IDroneIdentityNFT.Drone memory drone = droneNFT.getDroneInfo(
            request.droneId
        );

        // Check authorized zones
        bool authorized = false;
        for (uint i = 0; i < request.route.zones.length; i++) {
            authorized = false;
            for (uint j = 0; j < drone.authorizedZones.length; j++) {
                if (drone.authorizedZones[j] == request.route.zones[i]) {
                    authorized = true;
                    break;
                }
            }
            require(authorized, "Drone not authorized for requested zone");
        }

        // Check authorized periods
        authorized = false;
        for (uint i = 0; i < drone.authorizedPeriods.length; i++) {
            IDroneIdentityNFT.AuthorizedPeriod memory period = drone
                .authorizedPeriods[i];
            if (
                request.startTime >= period.from && request.endTime <= period.to
            ) {
                authorized = true;
                break;
            }
        }

        require(authorized, "Drone not authorized for requested time period");

        // Check days of the week
        authorized = false;
        for (uint i = 0; i < request.daysOfWeek.length; i++) {
            for (uint j = 0; j < drone.authorizedPeriods.length; j++) {
                IDroneIdentityNFT.AuthorizedPeriod memory period = drone
                    .authorizedPeriods[j];
                for (uint k = 0; k < period.daysWeek.length; k++) {
                    if (request.daysOfWeek[i] == period.daysWeek[k]) {
                        authorized = true;
                        break;
                    }
                }
                if (authorized) break;
            }
            require(
                authorized,
                "Drone not authorized for requested days of the week"
            );
        }
    }
}
