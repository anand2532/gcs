import packageJson from '../../../package.json';

/** Semantic version from root package.json (single source of truth). */
export const APP_VERSION: string = packageJson.version;
