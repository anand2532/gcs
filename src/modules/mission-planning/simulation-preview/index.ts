import {type GeoPosition} from '../../../core/types/geo';
import {type Mission, WaypointKind} from '../../../core/types/mission';
import {type MissionSimulationAdapter, type PlannedMissionDraft} from '../../../core/types/missionPlanning';

export const missionSimulationAdapter: MissionSimulationAdapter = {
  toMission(draft: PlannedMissionDraft): Mission {
    const home: GeoPosition = {
      lat: draft.takeoff?.lat ?? draft.polygon[0]?.lat ?? 0,
      lon: draft.takeoff?.lon ?? draft.polygon[0]?.lon ?? 0,
      altMsl: 216,
      altRel: 0,
    };
    const waypoints = [
      {
        id: 'takeoff',
        kind: WaypointKind.Takeoff,
        position: {...home, altMsl: home.altMsl + draft.survey.altitudeM, altRel: draft.survey.altitudeM},
        acceptanceRadius: 4,
      },
      ...draft.generatedPath.map((p, idx) => ({
        id: `path.${idx}`,
        kind: WaypointKind.Waypoint,
        position: {
          lat: p.lat,
          lon: p.lon,
          altMsl: home.altMsl + p.altRel,
          altRel: p.altRel,
        },
        acceptanceRadius: 6,
      })),
      {
        id: 'land',
        kind: WaypointKind.Land,
        position: {
          lat: draft.landing?.lat ?? home.lat,
          lon: draft.landing?.lon ?? home.lon,
          altMsl: home.altMsl,
          altRel: 0,
        },
        acceptanceRadius: 4,
      },
    ];
    return {
      id: `planned.${draft.id}`,
      name: draft.name,
      home,
      waypoints,
      defaultCruiseSpeed: draft.survey.speedMps,
    };
  },
};

