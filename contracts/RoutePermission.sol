// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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
        uint8[] daysWeek;  // Days of the week (0-6)
        uint256 from;      // Start timestamp
        uint256 to;        // End timestamp
    }

    function getDronePermissions(
        uint256 tokenId
    ) external view returns (
        ZoneType[] memory,
        AuthorizedPeriod[] memory
    );
}

contract RoutePermission {
    IDroneIdentityNFT public droneNFT;

    struct RouteCharacteristics {
        ZoneType[] zones;
        uint256 altitudeLimit; // Unused in this logic, placeholder for future use
    }

    struct RouteRequest {
        uint256 droneId;
        RouteCharacteristics route;
        uint256 startTime;
        uint256 endTime;
        uint8[] daysOfWeek; // 0-6 representing days
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

    // Funzione di sola lettura che fa la validazione senza emettere eventi
    function checkRouteAuthorization(
        RouteRequest calldata request
    ) public view returns (AuthorizationResponse memory) {
        try this._validateRoute(request) {
            return AuthorizationResponse({
                droneId: request.droneId,
                preauthorizationStatus: PreAuthorizationStatus.APPROVED,
                reason: ""
            });
        } catch Error(string memory reason) {
            return AuthorizationResponse({
                droneId: request.droneId,
                preauthorizationStatus: PreAuthorizationStatus.FAILED,
                reason: reason
            });
        } catch {
            return AuthorizationResponse({
                droneId: request.droneId,
                preauthorizationStatus: PreAuthorizationStatus.FAILED,
                reason: "Unknown error"
            });
        }
    }

    // Funzione esterna che emette eventi e richiama la checkRouteAuthorization
    function requestRouteAuthorization(
        RouteRequest calldata request
    ) external returns (AuthorizationResponse memory) {
        AuthorizationResponse memory resp = checkRouteAuthorization(request);
        emit RouteAuthorizationRequested(resp.droneId, resp.preauthorizationStatus);
        return resp;
    }

    // Funzione view usata internamente per validare la richiesta (lancia require se fallisce)
    function _validateRoute(
        RouteRequest calldata request
    ) external view {
        (
            ZoneType[] memory authorizedZones,
            IDroneIdentityNFT.AuthorizedPeriod[] memory authorizedPeriods
        ) = droneNFT.getDronePermissions(request.droneId);

        // Validate zones
        for (uint i = 0; i < request.route.zones.length; i++) {
            bool zoneOk = false;
            for (uint j = 0; j < authorizedZones.length; j++) {
                if (request.route.zones[i] == authorizedZones[j]) {
                    zoneOk = true;
                    break;
                }
            }
            require(zoneOk, "Drone not authorized for requested zone");
        }

        // Validate time period
        bool timeOk = false;
        for (uint i = 0; i < authorizedPeriods.length; i++) {
            if (
                request.startTime >= authorizedPeriods[i].from &&
                request.endTime <= authorizedPeriods[i].to
            ) {
                timeOk = true;
                break;
            }
        }
        require(timeOk, "Drone not authorized for requested time period");

        // Validate days of the week
        for (uint i = 0; i < request.daysOfWeek.length; i++) {
            bool dayOk = false;
            for (uint j = 0; j < authorizedPeriods.length; j++) {
                for (uint k = 0; k < authorizedPeriods[j].daysWeek.length; k++) {
                    if (request.daysOfWeek[i] == authorizedPeriods[j].daysWeek[k]) {
                        dayOk = true;
                        break;
                    }
                }
                if (dayOk) break;
            }
            require(dayOk, "Drone not authorized for requested day");
        }
    }
}
