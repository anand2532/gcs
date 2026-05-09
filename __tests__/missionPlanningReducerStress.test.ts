/**
 * Stress rapid polygon edits without mounting React — guards undo/redo integrity.
 */

import {
  addPoint,
  initialPolygonEditorState,
  redo,
  undo,
  type PolygonEditorState,
} from '../src/modules/mission-planning';

describe('polygon editor stress', () => {
  it('survives alternating undo/redo bursts', () => {
    let editor: PolygonEditorState = initialPolygonEditorState();
    const p = {lat: 28.61, lon: 77.22};
    for (let i = 0; i < 80; i++) {
      editor = addPoint(editor, {
        lat: p.lat + i * 1e-6,
        lon: p.lon + i * 1e-6,
      });
    }
    for (let k = 0; k < 200; k++) {
      editor = undo(editor);
      editor = redo(editor);
    }
    expect(editor.points.length).toBe(80);
  });
});
