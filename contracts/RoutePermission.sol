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

struct Drone {
    string serialNumber;
    string model;
    uint8 droneType;
    string[] certHashes;
    ZoneType[] permittedZones;
    string[] ownerHistory;
    string maintenanceHash;
    uint8 status;
}

interface IDroneIdentityNFT {
    function getDroneData(uint256 tokenId) external view returns (Drone memory);
}

error DroneNotActive();
error NoRouteZonesSpecified();
error DroneNotAuthorizedForZone();

contract RoutePermission {
    IDroneIdentityNFT public droneNFT;
    // log of authorization requests
    mapping(uint256 => AuthorizationRequestLog) public authorizationLogs;
    uint256[] public allAuthorizationRequests;

    struct AuthorizationRequestLog {
        uint256 droneId;
        PreAuthorizationStatus preauthorizationStatus;
        string reason;
        uint256 timestamp;
        RouteCharacteristics route;
    }

    struct RouteCharacteristics {
        ZoneType[] zones;
        uint256 altitudeLimit; // Placeholder for future use
    }

    struct RouteRequest {
        uint256 droneId;
        RouteCharacteristics route;
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
    ) public view returns (AuthorizationResponse memory) {
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

    function requestRouteAuthorization(
        RouteRequest calldata request
    ) external returns (AuthorizationResponse memory) {
        AuthorizationResponse memory resp = checkRouteAuthorization(request);
        authorizationLogs[block.timestamp] = AuthorizationRequestLog({
            droneId: resp.droneId,
            preauthorizationStatus: resp.preauthorizationStatus,
            reason: resp.reason,
            timestamp: block.timestamp,
            route: request.route
        });
        allAuthorizationRequests.push(block.timestamp);
        emit RouteAuthorizationRequested(
            resp.droneId,
            resp.preauthorizationStatus
        );
        return resp;
    }

    function _validateRoute(RouteRequest calldata request) external view {
        Drone memory droneData = droneNFT.getDroneData(request.droneId);

        uint8 status = droneData.status;
        ZoneType[] memory permittedZones = droneData.permittedZones;

        // Now you can use the 'status' and 'permittedZones' variables
        if (status != 0) {
            revert DroneNotActive();
        }

        if (request.route.zones.length == 0) {
            revert NoRouteZonesSpecified();
        }

        for (uint i = 0; i < request.route.zones.length; i++) {
            bool zoneOk = false;
            for (uint j = 0; j < permittedZones.length; j++) {
                if (request.route.zones[i] == permittedZones[j]) {
                    zoneOk = true;
                    break;
                }
            }
            if (!zoneOk) {
                revert DroneNotAuthorizedForZone();
            }
        }
    }

    function getAuthorizationLog(
        uint256 timestamp
    ) external view returns (AuthorizationRequestLog memory) {
        return authorizationLogs[timestamp];
    }

    function getAllAuthorizationLogs()
        external
        view
        returns (AuthorizationRequestLog[] memory)
    {
        uint256 logCount = allAuthorizationRequests.length;
        AuthorizationRequestLog[] memory logs = new AuthorizationRequestLog[](
            logCount
        );
        for (uint256 i = 0; i < logCount; i++) {
            logs[i] = authorizationLogs[allAuthorizationRequests[i]];
        }
        return logs;
    }
}
