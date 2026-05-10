/**
 * Map style + offline tuning constants.
 *
 * Phase 1.5 ships two inline MapLibre styles backed by ESRI's keyless XYZ
 * raster tile services:
 *   - `SATELLITE_STYLE` : ArcGIS World_Imagery only.
 *   - `HYBRID_STYLE`    : World_Imagery + a labels/places overlay.
 *
 * Why inline JSON (not a hosted style URL)?
 *   - Zero infra. We don't depend on a third-party style host going down.
 *   - Deterministic. The tiles MapLibre downloads at runtime are exactly
 *     the ones it pre-fetches into the offline pack — no surprises.
 *   - Cross-platform. The same JS object is consumed by `mapStyle={...}` on
 *     iOS and Android.
 *
 * Offline downloads need a string URL because MapLibre's native
 * `OfflineManager.createPack` fetches the style from the URL on the native
 * side. We bundle the SAME satellite style as an Android asset and refer
 * to it via the `asset://` scheme (handled natively by MapLibre). When iOS
 * is added later, the same file will live in the iOS bundle and the same
 * URL will resolve via the same scheme (MapLibre handles this uniformly).
 *
 * IMPORTANT: when you change `SATELLITE_STYLE` here, also update the
 * matching JSON file at:
 *   `android/app/src/main/assets/styles/gcs-satellite-style.json`
 * (a tiny reproduction of the same source/layer block — see the file).
 */

const ESRI_SAT_TPL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const ESRI_HYBRID_OVERLAY_TPL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

/** Esri World Topo — terrain / situational awareness basemap. */
const ESRI_TOPO_TPL =
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';

const ESRI_TOPO_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, FAO, NOAA, USGS';

/** OSM raster tiles — street reference (respect OSM tile usage policy). */
const OSM_STREET_TPL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP';

const ESRI_HYBRID_ATTRIBUTION =
  'Boundaries &copy; Esri &mdash; National Geographic, DeLorme, HERE, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC';

/**
 * MapLibre style spec is enormous; we type the exported style as a plain
 * object so the wrapper doesn't accidentally couple to a transitive type
 * shape we don't control. The shape we hand-roll below conforms to the
 * v8 style spec subset MapLibre actually consumes for raster maps.
 */
export type MapLibreStyle = Record<string, unknown>;

/** Ambient/offline tile cap. ESRI 256px raster averages ~10–12 KB; 50k tiles ≈ 500–600 MB. */
export const MAP_CACHE_TILE_LIMIT = 50_000;

/** Ambient cache hard ceiling in bytes (mirror of the 50k tile cap, used by setMaximumAmbientCacheSize). */
export const MAP_AMBIENT_CACHE_BYTES = 500 * 1024 * 1024;

/** MapLibre prefetch window above the current zoom (smoother zoom-out feel). */
export const MAP_PREFETCH_ZOOM_DELTA = 4;

/** Max raster zoom we expose. ESRI World Imagery serves tiles up to z=19 worldwide. */
export const MAP_MAX_RASTER_ZOOM = 19;

/** Animated camera follow durations (ms). Tuned for satellite raster smoothness. */
export const FOLLOW_TICK_DURATION_MS = 110;
export const FOLLOW_TICK_DURATION_DEGRADED_MS = 220;

/**
 * Max camera follow commands per second (RN bridge + MapLibre). Independent of
 * sim tick Hz — higher telemetry rates are absorbed here.
 */
export const FOLLOW_CAMERA_MAX_HZ = 12;

/** Max FlightTrail ShapeSource commits per second (polygon redraw cost). */
export const FLIGHT_TRAIL_REDRAW_MAX_HZ = 12;

/**
 * Max DroneMarker coordinate commits per second (MarkerView → native bridge).
 * Independent of telemetry tick Hz; heading still tracks every frame on UI thread via Reanimated.
 */
export const DRONE_MARKER_POSITION_MAX_HZ = 15;

/**
 * Mission-planning survey preview path — MapLibre LineStrings with tens of thousands
 * of vertices routinely crash or freeze native map surfaces on mid-tier phones.
 * Display-only cap; {@link SURVEY_MAX_PATH_POINTS} still governs generation.
 */
export const MISSION_PLANNING_PATH_MAX_VERTICES = 2500;

export const SATELLITE_STYLE: MapLibreStyle = {
  version: 8,
  name: 'GCS Satellite',
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [ESRI_SAT_TPL],
      tileSize: 256,
      minzoom: 0,
      maxzoom: MAP_MAX_RASTER_ZOOM,
      attribution: ESRI_ATTRIBUTION,
      scheme: 'xyz',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {'background-color': '#000814'},
    },
    {
      id: 'esri-imagery',
      type: 'raster',
      source: 'esri-imagery',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 1,
        'raster-fade-duration': 180,
      },
    },
  ],
};

export const TERRAIN_STYLE: MapLibreStyle = {
  version: 8,
  name: 'GCS Terrain',
  sources: {
    'esri-topo': {
      type: 'raster',
      tiles: [ESRI_TOPO_TPL],
      tileSize: 256,
      minzoom: 0,
      maxzoom: MAP_MAX_RASTER_ZOOM,
      attribution: ESRI_TOPO_ATTRIBUTION,
      scheme: 'xyz',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {'background-color': '#0a1628'},
    },
    {
      id: 'esri-topo',
      type: 'raster',
      source: 'esri-topo',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 1,
        'raster-fade-duration': 160,
      },
    },
  ],
};

export const STREET_STYLE: MapLibreStyle = {
  version: 8,
  name: 'GCS Street',
  sources: {
    osm: {
      type: 'raster',
      tiles: [OSM_STREET_TPL],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: OSM_ATTRIBUTION,
      scheme: 'xyz',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {'background-color': '#1a1f28'},
    },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 1,
        'raster-fade-duration': 140,
      },
    },
  ],
};

/** Dimmed imagery + dark field — tactical night / high-contrast outdoor use. */
export const TACTICAL_STYLE: MapLibreStyle = {
  version: 8,
  name: 'GCS Tactical',
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [ESRI_SAT_TPL],
      tileSize: 256,
      minzoom: 0,
      maxzoom: MAP_MAX_RASTER_ZOOM,
      attribution: ESRI_ATTRIBUTION,
      scheme: 'xyz',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {'background-color': '#050508'},
    },
    {
      id: 'esri-imagery',
      type: 'raster',
      source: 'esri-imagery',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 0.82,
        'raster-fade-duration': 200,
        'raster-brightness-max': 0.95,
        'raster-saturation': 0.55,
      },
    },
  ],
};

export const HYBRID_STYLE: MapLibreStyle = {
  version: 8,
  name: 'GCS Hybrid',
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [ESRI_SAT_TPL],
      tileSize: 256,
      minzoom: 0,
      maxzoom: MAP_MAX_RASTER_ZOOM,
      attribution: ESRI_ATTRIBUTION,
      scheme: 'xyz',
    },
    'esri-overlay': {
      type: 'raster',
      tiles: [ESRI_HYBRID_OVERLAY_TPL],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 13,
      attribution: ESRI_HYBRID_ATTRIBUTION,
      scheme: 'xyz',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {'background-color': '#000814'},
    },
    {
      id: 'esri-imagery',
      type: 'raster',
      source: 'esri-imagery',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 1,
        'raster-fade-duration': 180,
      },
    },
    {
      id: 'esri-overlay',
      type: 'raster',
      source: 'esri-overlay',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 0.85,
        'raster-fade-duration': 220,
      },
    },
  ],
};

export const MAP_STYLE_VARIANTS = {
  satellite: SATELLITE_STYLE,
  hybrid: HYBRID_STYLE,
  street: STREET_STYLE,
  terrain: TERRAIN_STYLE,
  tactical: TACTICAL_STYLE,
} as const;

export type MapStyleVariant = keyof typeof MAP_STYLE_VARIANTS;

/** UI cycle order for the map style FAB. */
export const MAP_STYLE_CYCLE_ORDER: readonly MapStyleVariant[] = [
  'satellite',
  'hybrid',
  'street',
  'terrain',
  'tactical',
] as const;

/**
 * Native-bundled style URLs used at *runtime* (live map) AND at *download
 * time* (offline pack creation). Reading the style from the APK asset path
 * avoids:
 *   1. JSON.stringify on every render of the JS-side MapView wrapper.
 *   2. Drift between the live map and the offline pack — both consume the
 *      *exact same* bytes off disk.
 *
 * The mirrored JSON lives at:
 *   `android/app/src/main/assets/styles/gcs-satellite-style.json`
 *   `android/app/src/main/assets/styles/gcs-hybrid-style.json`
 */
export const SATELLITE_STYLE_URL = 'asset://styles/gcs-satellite-style.json';
export const HYBRID_STYLE_URL = 'asset://styles/gcs-hybrid-style.json';
export const STREET_STYLE_URL = 'asset://styles/gcs-street-style.json';
export const TERRAIN_STYLE_URL = 'asset://styles/gcs-terrain-style.json';
export const TACTICAL_STYLE_URL = 'asset://styles/gcs-tactical-style.json';

export const MAP_STYLE_URL_VARIANTS: Record<MapStyleVariant, string> = {
  satellite: SATELLITE_STYLE_URL,
  hybrid: HYBRID_STYLE_URL,
  street: STREET_STYLE_URL,
  terrain: TERRAIN_STYLE_URL,
  tactical: TACTICAL_STYLE_URL,
};

/** Default offline pack style — satellite imagery is the primary field baseline. */
export const OFFLINE_STYLE_URL = SATELLITE_STYLE_URL;

export const MAP_DEFAULTS = {
  /**
   * Fallback camera if no persisted state. New Delhi — India Gate, the demo
   * sim's home pad. Pilot can pan/zoom and the new camera will be persisted
   * for next launch.
   */
  initialCenter: {lat: 28.6129, lon: 77.2295},
  initialZoom: 16,
  /** Camera follow zoom (slightly tighter than initial). */
  followZoom: 17,
  /** Camera follow pitch in degrees — gives the cinematic feel. */
  followPitch: 40,
  /** Animation duration when recentring, ms. */
  recenterDurationMs: 600,
} as const;

/** Default min/max zooms used by the "Download visible area" pre-fetch. */
export const OFFLINE_PREFETCH_DEFAULTS = {
  minZoom: 12,
  maxZoom: 18,
} as const;
