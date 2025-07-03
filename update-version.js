#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Usage: node update-version.js <version>');
  process.exit(1);
}

// Update package.json
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Updated package.json to version ${newVersion}`);

// Update src/version.ts
const versionTsPath = path.join(__dirname, 'src', 'version.ts');
const versionTsContent = `export const version = '${newVersion}'; \n`;
fs.writeFileSync(versionTsPath, versionTsContent);
console.log(`Updated src/version.ts to version ${newVersion}`); 