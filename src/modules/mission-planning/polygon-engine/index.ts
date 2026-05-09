import {type GeoPoint} from '../../../core/types/geo';
import {magneticSnap, nearestSegmentIndex, snapToGrid} from '../geometry';

export interface PolygonEditorState {
  readonly points: readonly GeoPoint[];
  readonly selectedIndex: number | null;
  readonly undoStack: readonly GeoPoint[][];
  readonly redoStack: readonly GeoPoint[][];
  readonly snapToGrid: boolean;
  readonly magneticSnap: boolean;
}

export function initialPolygonEditorState(): PolygonEditorState {
  return {
    points: [],
    selectedIndex: null,
    undoStack: [],
    redoStack: [],
    snapToGrid: false,
    magneticSnap: true,
  };
}

export function addPoint(state: PolygonEditorState, point: GeoPoint): PolygonEditorState {
  const next = normalizePoint(point, state.points, state.snapToGrid, state.magneticSnap);
  return pushState(state, [...state.points, next], state.points.length);
}

export function insertPointAtNearestSegment(
  state: PolygonEditorState,
  point: GeoPoint,
): PolygonEditorState {
  if (state.points.length < 2) {
    return addPoint(state, point);
  }
  const idx = nearestSegmentIndex(point, state.points);
  const next = normalizePoint(point, state.points, state.snapToGrid, state.magneticSnap);
  const points = [...state.points];
  points.splice(idx + 1, 0, next);
  return pushState(state, points, idx + 1);
}

export function movePoint(
  state: PolygonEditorState,
  index: number,
  point: GeoPoint,
): PolygonEditorState {
  if (index < 0 || index >= state.points.length) {
    return state;
  }
  const points = [...state.points];
  points[index] = normalizePoint(point, state.points, state.snapToGrid, state.magneticSnap);
  return {...state, points, selectedIndex: index};
}

export function removePoint(state: PolygonEditorState, index: number): PolygonEditorState {
  if (index < 0 || index >= state.points.length) {
    return state;
  }
  const points = [...state.points];
  points.splice(index, 1);
  return pushState(state, points, null);
}

export function undo(state: PolygonEditorState): PolygonEditorState {
  if (state.undoStack.length === 0) {
    return state;
  }
  const previous = state.undoStack[state.undoStack.length - 1]!;
  return {
    ...state,
    points: previous,
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, [...state.points]],
    selectedIndex: null,
  };
}

export function redo(state: PolygonEditorState): PolygonEditorState {
  if (state.redoStack.length === 0) {
    return state;
  }
  const next = state.redoStack[state.redoStack.length - 1]!;
  return {
    ...state,
    points: next,
    redoStack: state.redoStack.slice(0, -1),
    undoStack: [...state.undoStack, [...state.points]],
    selectedIndex: null,
  };
}

export function setSnapToGrid(state: PolygonEditorState, enabled: boolean): PolygonEditorState {
  return {...state, snapToGrid: enabled};
}

export function setMagneticSnap(state: PolygonEditorState, enabled: boolean): PolygonEditorState {
  return {...state, magneticSnap: enabled};
}

function pushState(
  state: PolygonEditorState,
  points: readonly GeoPoint[],
  selectedIndex: number | null,
): PolygonEditorState {
  return {
    ...state,
    points,
    selectedIndex,
    undoStack: [...state.undoStack, [...state.points]].slice(-100),
    redoStack: [],
  };
}

function normalizePoint(
  point: GeoPoint,
  candidates: readonly GeoPoint[],
  useGrid: boolean,
  useMagnetic: boolean,
): GeoPoint {
  let next = point;
  if (useGrid) {
    next = snapToGrid(next);
  }
  if (useMagnetic) {
    next = magneticSnap(next, candidates);
  }
  return next;
}

