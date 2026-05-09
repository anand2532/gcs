#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join } from 'path';
import { expectedNativeFromPackage, getRootDir } from './version-sync-lib.mjs';

function stripQuotes(s) {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1);
  }
  return t;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const root = getRootDir();
const { version: expectedVersion, buildCode: expectedBuild } =
  expectedNativeFromPackage();

const gradlePath = join(root, 'android/app/build.gradle');
const gradle = readFileSync(gradlePath, 'utf8');
const vcMatch = /versionCode\s+(\d+)/.exec(gradle);
const vnMatch = /versionName\s+"([^"]*)"/.exec(gradle);
if (!vcMatch || !vnMatch) {
  fail(`verify-native-version: could not parse ${gradlePath}`);
}
const gradleCode = Number(vcMatch[1]);
const gradleName = vnMatch[1];
if (gradleName !== expectedVersion) {
  fail(
    `verify-native-version: android versionName "${gradleName}" !== package.json "${expectedVersion}". Run: npm run version:sync`,
  );
}
if (gradleCode !== expectedBuild) {
  fail(
    `verify-native-version: android versionCode ${gradleCode} !== expected ${expectedBuild} (from semver). Run: npm run version:sync`,
  );
}

const pbxPath = join(root, 'ios/GCS.xcodeproj/project.pbxproj');
const pbx = readFileSync(pbxPath, 'utf8');
const marketingMatches = [...pbx.matchAll(/MARKETING_VERSION = ([^;\n]+);/g)].map(
  (m) => stripQuotes(m[1]),
);
const currentMatches = [...pbx.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map(
  (m) => Number(m[1]),
);
if (marketingMatches.length === 0 || currentMatches.length === 0) {
  fail(`verify-native-version: could not parse ${pbxPath}`);
}
const uniq = (arr) => [...new Set(arr)];
if (uniq(marketingMatches).length !== 1) {
  fail(
    `verify-native-version: inconsistent MARKETING_VERSION values in pbxproj: ${marketingMatches.join(', ')}`,
  );
}
if (uniq(currentMatches).length !== 1) {
  fail(
    `verify-native-version: inconsistent CURRENT_PROJECT_VERSION values in pbxproj: ${currentMatches.join(', ')}`,
  );
}
const iosMarketing = marketingMatches[0];
const iosCurrent = currentMatches[0];
if (iosMarketing !== expectedVersion) {
  fail(
    `verify-native-version: iOS MARKETING_VERSION "${iosMarketing}" !== package.json "${expectedVersion}". Run: npm run version:sync`,
  );
}
if (iosCurrent !== expectedBuild) {
  fail(
    `verify-native-version: iOS CURRENT_PROJECT_VERSION ${iosCurrent} !== expected ${expectedBuild}. Run: npm run version:sync`,
  );
}

console.log(`Native versions match package.json ${expectedVersion} (build ${expectedBuild}).`);
