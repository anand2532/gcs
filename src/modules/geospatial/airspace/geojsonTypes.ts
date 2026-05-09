/** Minimal GeoJSON shapes for airspace overlays (no external geojson dep). */

export interface GeoJsonPolygonFeature {
  readonly type: 'Feature';
  readonly id?: string;
  readonly properties?: Record<string, unknown>;
  readonly geometry: {
    readonly type: 'Polygon';
    readonly coordinates: readonly [readonly [number, number][]];
  };
}

export interface AirspaceFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: readonly GeoJsonPolygonFeature[];
}
