import {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';

import {SURVEY_PATH_DEBOUNCE_MS} from '../../../core/constants/missionPlanning';
import {type GeoPoint} from '../../../core/types/geo';
import {
  PlanningMode,
  type PlannedMissionDraft,
  type SurveyConfig,
} from '../../../core/types/missionPlanning';
import {validateMissionOperational} from '../../../modules/geospatial';
import {
  addPoint as appendPolygonVertex,
  buildRoutePreview,
  generateSurveyPath,
  initialPolygonEditorState,
  insertPointAtNearestSegment,
  missionSimulationAdapter,
  movePoint as movePolygonVertex,
  redo,
  removePoint as removePolygonVertex,
  setMagneticSnap as applyMagneticSnapEditor,
  setSnapToGrid as applyGridSnapEditor,
  undo,
  type PolygonEditorState,
} from '../../../modules/mission-planning';
import {MissionPlanningDraftStore} from '../../../modules/persistence/schemas';
import {simulationEngine} from '../../../modules/simulation';

interface MissionPlanningState {
  readonly editor: PolygonEditorState;
  readonly survey: SurveyConfig;
  readonly takeoff?: GeoPoint;
  readonly landing?: GeoPoint;
  readonly enabled: boolean;
}

type MissionPlanningAction =
  | {type: 'toggleEnabled'}
  | {type: 'add'; point: GeoPoint}
  | {type: 'insert'; point: GeoPoint}
  | {type: 'move'; index: number; point: GeoPoint}
  | {type: 'remove'; index: number}
  | {type: 'undo'}
  | {type: 'redo'}
  | {type: 'setTakeoff'; point: GeoPoint}
  | {type: 'setLanding'; point: GeoPoint}
  | {type: 'setSpacing'; value: number}
  | {type: 'setOverlap'; value: number}
  | {type: 'setAltitude'; value: number}
  | {type: 'setGridSnap'; value: boolean}
  | {type: 'setMagneticSnap'; value: boolean}
  | {type: 'hydrate'; draft: PlannedMissionDraft};

const INITIAL_SURVEY: SurveyConfig = {
  altitudeM: 55,
  spacingM: 20,
  overlapPct: 70,
  speedMps: 10,
};

function reducer(
  state: MissionPlanningState,
  action: MissionPlanningAction,
): MissionPlanningState {
  switch (action.type) {
    case 'toggleEnabled':
      return {...state, enabled: !state.enabled};
    case 'add':
      return {...state, editor: appendPolygonVertex(state.editor, action.point)};
    case 'insert':
      return {
        ...state,
        editor: insertPointAtNearestSegment(state.editor, action.point),
      };
    case 'move':
      return {
        ...state,
        editor: movePolygonVertex(state.editor, action.index, action.point),
      };
    case 'remove':
      return {...state, editor: removePolygonVertex(state.editor, action.index)};
    case 'undo':
      return {...state, editor: undo(state.editor)};
    case 'redo':
      return {...state, editor: redo(state.editor)};
    case 'setTakeoff':
      return {...state, takeoff: action.point};
    case 'setLanding':
      return {...state, landing: action.point};
    case 'setSpacing':
      return {...state, survey: {...state.survey, spacingM: action.value}};
    case 'setOverlap':
      return {...state, survey: {...state.survey, overlapPct: action.value}};
    case 'setAltitude':
      return {...state, survey: {...state.survey, altitudeM: action.value}};
    case 'setGridSnap':
      return {...state, editor: applyGridSnapEditor(state.editor, action.value)};
    case 'setMagneticSnap':
      return {...state, editor: applyMagneticSnapEditor(state.editor, action.value)};
    case 'hydrate':
      return {
        ...state,
        enabled: true,
        editor: {
          ...state.editor,
          points: action.draft.polygon,
        },
        takeoff: action.draft.takeoff,
        landing: action.draft.landing,
        survey: action.draft.survey,
      };
    default:
      return state;
  }
}

export function useMissionPlanning() {
  const [state, dispatch] = useReducer(reducer, {
    editor: initialPolygonEditorState(),
    survey: INITIAL_SURVEY,
    enabled: false,
  });

  const [pathGenPolygon, setPathGenPolygon] = useState<
    readonly GeoPoint[]
  >(() => state.editor.points);
  const [pathGenSurvey, setPathGenSurvey] = useState<SurveyConfig>(
    () => state.survey,
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setPathGenPolygon(state.editor.points);
    }, SURVEY_PATH_DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
    };
  }, [state.editor.points]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPathGenSurvey(state.survey);
    }, SURVEY_PATH_DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
    };
  }, [state.survey]);

  const generatedPath = useMemo(
    () => generateSurveyPath(pathGenPolygon, pathGenSurvey),
    [pathGenPolygon, pathGenSurvey],
  );

  const preview = useMemo(() => buildRoutePreview(generatedPath), [generatedPath]);
  const validation = useMemo(
    () =>
      validateMissionOperational(
        state.editor.points,
        generatedPath,
        state.survey,
      ),
    [state.editor.points, generatedPath, state.survey],
  );

  const draft: PlannedMissionDraft = useMemo(
    () => ({
      id: 'draft.local',
      name: 'Tactical Survey Draft',
      mode: PlanningMode.PolygonSurvey,
      polygon: state.editor.points,
      takeoff: state.takeoff,
      landing: state.landing,
      survey: state.survey,
      generatedPath,
      validation,
      updatedAt: Date.now(),
    }),
    [
      generatedPath,
      state.editor.points,
      state.landing,
      state.survey,
      state.takeoff,
      validation,
    ],
  );

  const draftRef = useRef(draft);
  const validationRef = useRef(validation);
  draftRef.current = draft;
  validationRef.current = validation;

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const saved = MissionPlanningDraftStore.load();
    if (saved) {
      dispatch({type: 'hydrate', draft: saved});
      setPathGenPolygon(saved.polygon);
      setPathGenSurvey(saved.survey);
    }
  }, []);

  useEffect(() => {
    if (!state.enabled) {
      return;
    }
    const handle = setTimeout(() => {
      MissionPlanningDraftStore.save(draft);
    }, 200);
    return () => {
      clearTimeout(handle);
    };
  }, [draft, state.enabled]);

  const toggleEnabled = useCallback(() => {
    dispatch({type: 'toggleEnabled'});
  }, []);

  const addPoint = useCallback((point: GeoPoint) => {
    dispatch({type: 'add', point});
  }, []);

  const insertPoint = useCallback((point: GeoPoint) => {
    dispatch({type: 'insert', point});
  }, []);

  const movePointCb = useCallback((index: number, point: GeoPoint) => {
    dispatch({type: 'move', index, point});
  }, []);

  const removePointCb = useCallback((index: number) => {
    dispatch({type: 'remove', index});
  }, []);

  const removeLastPoint = useCallback(() => {
    const idx = stateRef.current.editor.points.length - 1;
    if (idx >= 0) {
      dispatch({type: 'remove', index: idx});
    }
  }, []);

  const undoCb = useCallback(() => {
    dispatch({type: 'undo'});
  }, []);

  const redoCb = useCallback(() => {
    dispatch({type: 'redo'});
  }, []);

  const setTakeoff = useCallback((point: GeoPoint) => {
    dispatch({type: 'setTakeoff', point});
  }, []);

  const setLanding = useCallback((point: GeoPoint) => {
    dispatch({type: 'setLanding', point});
  }, []);

  const setSpacing = useCallback((value: number) => {
    dispatch({type: 'setSpacing', value});
  }, []);

  const setOverlap = useCallback((value: number) => {
    dispatch({type: 'setOverlap', value});
  }, []);

  const setAltitude = useCallback((value: number) => {
    dispatch({type: 'setAltitude', value});
  }, []);

  const setGridSnap = useCallback((value: boolean) => {
    dispatch({type: 'setGridSnap', value});
  }, []);

  const setMagneticSnap = useCallback((value: boolean) => {
    dispatch({type: 'setMagneticSnap', value});
  }, []);

  const runPreviewInSimulation = useCallback((): void => {
    const v = validationRef.current;
    const d = draftRef.current;
    if (!v.valid || d.generatedPath.length < 2) {
      return;
    }
    const mission = missionSimulationAdapter.toMission(d);
    simulationEngine.loadMission(mission);
    simulationEngine.start();
  }, []);

  const persistDraftNow = useCallback(() => {
    MissionPlanningDraftStore.save(draftRef.current);
  }, []);

  const actions = useMemo(
    () => ({
      toggleEnabled,
      addPoint,
      insertPoint,
      movePoint: movePointCb,
      removePoint: removePointCb,
      removeLastPoint,
      undo: undoCb,
      redo: redoCb,
      setTakeoff,
      setLanding,
      setSpacing,
      setOverlap,
      setAltitude,
      setGridSnap,
      setMagneticSnap,
      runPreviewInSimulation,
      persistDraftNow,
    }),
    [
      toggleEnabled,
      addPoint,
      insertPoint,
      movePointCb,
      removePointCb,
      removeLastPoint,
      undoCb,
      redoCb,
      setTakeoff,
      setLanding,
      setSpacing,
      setOverlap,
      setAltitude,
      setGridSnap,
      setMagneticSnap,
      runPreviewInSimulation,
      persistDraftNow,
    ],
  );

  return {
    state,
    draft,
    generatedPath,
    preview,
    validation,
    actions,
  };
}
