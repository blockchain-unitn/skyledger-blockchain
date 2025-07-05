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
    function getDroneData(uint256 tokenId)
        external
        view
        returns (Drone memory); // <--- Ora restituisce un singolo struct Drone
}

contract RoutePermission {
    IDroneIdentityNFT public droneNFT;

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

    function checkRouteAuthorization(RouteRequest calldata request) public view returns (AuthorizationResponse memory) {
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

    function requestRouteAuthorization(RouteRequest calldata request) external returns (AuthorizationResponse memory) {
        AuthorizationResponse memory resp = checkRouteAuthorization(request);
        emit RouteAuthorizationRequested(resp.droneId, resp.preauthorizationStatus);
        return resp;
    }

    function _validateRoute(RouteRequest calldata request) external view {

        Drone memory droneData = droneNFT.getDroneData(request.droneId);

        uint8 status = droneData.status;
        ZoneType[] memory permittedZones = droneData.permittedZones;

        // Now you can use the 'status' and 'permittedZones' variables
        require(status == 0, "Drone is not active"); // Assuming 0 means active

        require(request.route.zones.length > 0, "No route zones specified");


        for (uint i = 0; i < request.route.zones.length; i++) {
            bool zoneOk = false;
            for (uint j = 0; j < permittedZones.length; j++) {
                if (request.route.zones[i] == permittedZones[j]) {
                    zoneOk = true;
                    break;
                }
            }
            require(zoneOk, "Drone not authorized for requested zone");
        }
    }
}