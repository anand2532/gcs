#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { expectedNativeFromPackage, getRootDir } from './version-sync-lib.mjs';

const root = getRootDir();
const { version, buildCode } = expectedNativeFromPackage();

const gradlePath = join(root, 'android/app/build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${buildCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
writeFileSync(gradlePath, gradle, 'utf8');

const pbxPath = join(root, 'ios/GCS.xcodeproj/project.pbxproj');
let pbx = readFileSync(pbxPath, 'utf8');
pbx = pbx.replace(
  /MARKETING_VERSION = [^;\n]+;/g,
  `MARKETING_VERSION = "${version}";`,
);
pbx = pbx.replace(
  /CURRENT_PROJECT_VERSION = \d+;/g,
  `CURRENT_PROJECT_VERSION = ${buildCode};`,
);
writeFileSync(pbxPath, pbx, 'utf8');

console.log(`Synced native versions: ${version} (build ${buildCode})`);
