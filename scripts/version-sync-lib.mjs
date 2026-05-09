import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

export function getRootDir() {
  return rootDir;
}

export function loadPackageJson() {
  const raw = readFileSync(join(rootDir, 'package.json'), 'utf8');
  return JSON.parse(raw);
}

export function semverToBuildCode(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!m) {
    throw new Error(
      `Invalid semver "${version}" — expected MAJOR.MINOR.PATCH (digits only).`,
    );
  }
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  return major * 10000 + minor * 100 + patch;
}

export function expectedNativeFromPackage() {
  const pkg = loadPackageJson();
  const version = pkg.version;
  const buildCode = semverToBuildCode(version);
  return { version, buildCode };
}
