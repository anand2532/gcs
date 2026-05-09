/**
 * Bundled demonstration restricted footprint (replace with jurisdiction feeds).
 * Coordinates are illustrative only — not for operational navigation.
 */

export const SAMPLE_RESTRICTED_AIRSPACE_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'demo.restricted.corridor',
      properties: {
        kind: 'ADVISORY',
        label: 'Demo advisory zone (illustrative)',
        source: 'bundled-sample',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.22, 28.605],
            [77.235, 28.605],
            [77.235, 28.618],
            [77.22, 28.618],
            [77.22, 28.605],
          ],
        ],
      },
    },
  ],
} as const;
