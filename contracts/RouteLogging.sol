// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

enum RouteStatus {
    NORMAL,
    DEVIATED
}

enum ZoneType {
    RURAL,
    URBAN,
    HOSPITALS,
    MILITARY,
    RESTRICTED
}

struct RoutePoint {
    int256 latitude;
    int256 longitude;
}

struct RouteLog {
    uint256 timestamp;
    uint256 droneId;
    address utmAuthorizer;
    ZoneType[] zones;
    RoutePoint startPoint;
    RoutePoint endPoint;
    RoutePoint[] route; // Full route as array of points
    uint256 startTime;
    uint256 endTime;
    RouteStatus status;
}

error InvalidDroneId();
error InvalidUTMAuthorizer();
error ZonesRequired();
error RouteRequired();
error InvalidTimeRange();
error LogDoesNotExist();
error InvalidLimitRange();

contract RouteLogging {
    event RouteLogged(
        uint256 indexed logId,
        uint256 timestamp,
        uint256 droneId,
        address utmAuthorizer,
        ZoneType[] zones,
        RoutePoint startPoint,
        RoutePoint endPoint,
        RoutePoint[] route,
        uint256 startTime,
        uint256 endTime,
        RouteStatus status
    );

    RouteLog[] public logs;

    struct LogRequest {
        uint256 droneId;
        address utmAuthorizer;
        ZoneType[] zones;
        RoutePoint startPoint;
        RoutePoint endPoint;
        RoutePoint[] route;
        uint256 startTime;
        uint256 endTime;
        RouteStatus status;
    }

    function validateLogRequest(LogRequest memory request) public pure {
        if (request.droneId == 0) revert InvalidDroneId();
        if (request.utmAuthorizer == address(0)) revert InvalidUTMAuthorizer();
        if (request.zones.length == 0) revert ZonesRequired();
        if (request.route.length == 0) revert RouteRequired();
        if (request.startTime >= request.endTime) revert InvalidTimeRange();
    }

    function logRoute(
        uint256 droneId,
        address utmAuthorizer,
        ZoneType[] calldata zones,
        RoutePoint calldata startPoint,
        RoutePoint calldata endPoint,
        RoutePoint[] calldata route,
        uint256 startTime,
        uint256 endTime,
        RouteStatus status
    ) external returns (uint256) {
        // Validate input data
        LogRequest memory request = LogRequest({
            droneId: droneId,
            utmAuthorizer: utmAuthorizer,
            zones: zones,
            startPoint: startPoint,
            endPoint: endPoint,
            route: route,
            startTime: startTime,
            endTime: endTime,
            status: status
        });
        validateLogRequest(request);

        RouteLog memory newLog = RouteLog({
            timestamp: block.timestamp,
            droneId: droneId,
            utmAuthorizer: utmAuthorizer,
            zones: zones,
            startPoint: startPoint,
            endPoint: endPoint,
            route: route,
            startTime: startTime,
            endTime: endTime,
            status: status
        });

        logs.push(newLog);
        uint256 logId = logs.length - 1;

        emit RouteLogged(
            logId,
            newLog.timestamp,
            droneId,
            utmAuthorizer,
            zones,
            startPoint,
            endPoint,
            route,
            startTime,
            endTime,
            status
        );

        return logId;
    }

    // Get a specific log by ID
    function getLog(uint256 logId) external view returns (RouteLog memory) {
        if (logId >= logs.length) revert LogDoesNotExist();
        return logs[logId];
    }

    // Get the total number of logs
    function getLogsCount() external view returns (uint256) {
        return logs.length;
    }

    // Get all log IDs for a given droneId
    function getLogsOfDrone(
        uint256 droneId
    ) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].droneId == droneId) {
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].droneId == droneId) {
                result[idx++] = i;
            }
        }
        return result;
    }

    // Paginated version to avoid gas limit issues with large datasets
    function getLogsOfDronePaginated(
        uint256 droneId,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory logIds, uint256 total) {
        if (limit == 0 || limit > 100) revert InvalidLimitRange();

        // First count total matches
        uint256 count = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].droneId == droneId) {
                count++;
            }
        }

        if (count == 0 || offset >= count) {
            return (new uint256[](0), count);
        }

        // Calculate actual return size
        uint256 returnSize = count - offset;
        if (returnSize > limit) {
            returnSize = limit;
        }

        uint256[] memory result = new uint256[](returnSize);
        uint256 matchIndex = 0;
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < logs.length && resultIndex < returnSize; i++) {
            if (logs[i].droneId == droneId) {
                if (matchIndex >= offset) {
                    result[resultIndex++] = i;
                }
                matchIndex++;
            }
        }

        return (result, count);
    }

    // Get all droneIds a UTM has authorized (unique)
    function getDronesAuthorizedByUTM(
        address utm
    ) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](logs.length);
        uint256 count = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].utmAuthorizer == utm) {
                bool exists = false;
                for (uint256 j = 0; j < count; j++) {
                    if (temp[j] == logs[i].droneId) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    temp[count++] = logs[i].droneId;
                }
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        return result;
    }

    // Enhanced version with gas limit protection
    function getDronesAuthorizedByUTMSafe(
        address utm,
        uint256 maxResults
    ) external view returns (uint256[] memory, bool hasMore) {
        if (maxResults == 0 || maxResults > 50) revert InvalidLimitRange();

        uint256[] memory temp = new uint256[](maxResults);
        uint256 count = 0;
        bool reachedLimit = false;

        for (uint256 i = 0; i < logs.length && count < maxResults; i++) {
            if (logs[i].utmAuthorizer == utm) {
                bool exists = false;
                for (uint256 j = 0; j < count; j++) {
                    if (temp[j] == logs[i].droneId) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    temp[count++] = logs[i].droneId;
                }
            }
        }

        // Check if there are more results beyond the limit
        if (count == maxResults) {
            for (uint256 i = 0; i < logs.length; i++) {
                if (logs[i].utmAuthorizer == utm) {
                    bool exists = false;
                    for (uint256 j = 0; j < count; j++) {
                        if (temp[j] == logs[i].droneId) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        reachedLimit = true;
                        break;
                    }
                }
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }

        return (result, reachedLimit);
    }

    // Get zones of a logId
    function getZonesOfLog(
        uint256 logId
    ) external view returns (ZoneType[] memory) {
        if (logId >= logs.length) revert LogDoesNotExist();
        return logs[logId].zones;
    }
}
