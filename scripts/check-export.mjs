import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const required = ['dist/index.html', 'dist/favicon.svg', 'dist/social-card.png', 'README.md', 'DESIGN.md', 'artifacts/validation.md', 'artifacts/mobile.png', 'artifacts/desktop.png', 'artifacts/keyboard-focus.png', 'artifacts/api-unavailable.png', 'artifacts/design-probe.json', 'artifacts/interaction-results.json', 'package.json', 'package-lock.json'];
for (const file of required) assert((await stat(file)).size > 0, `${file} must exist and be nonempty`);
const html = await readFile('dist/index.html', 'utf8');
for (const pattern of [/<title>[^<]+<\/title>/, /rel="icon"/, /name="description"/, /property="og:title"/, /property="og:image"/]) assert(pattern.test(html));
const refs = [...html.matchAll(/(?:src|href|content)="([^\"]+)"/g)].map(m => m[1]).filter(x => /^(\.\/|assets\/|fonts\/)/.test(x));
for (const ref of refs) assert((await stat(resolve('dist', ref))).size > 0, `Missing relative asset ${ref}`);
assert(!/(?:src|href)="\/(?!\/)/.test(html), 'Export must not use root-relative assets');
const distAssets = await readdir('dist/assets');
for (const file of distAssets.filter(x => x.endsWith('.css'))) {
  const cssPath = resolve('dist/assets', file);
  const css = await readFile(cssPath, 'utf8');
  for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
    const value = match[1].replace(/["']/g, '');
    assert(!value.startsWith('/'), 'CSS assets must be relative');
    assert((await stat(resolve(dirname(cssPath), value))).size > 0);
  }
}
const png = await readFile('dist/social-card.png');
assert.equal(png.subarray(1, 4).toString(), 'PNG');
assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
for (const [file, width, height] of [['mobile.png',390,844], ['desktop.png',1440,900], ['keyboard-focus.png',390,844], ['api-unavailable.png',1440,900]]) {
  const screenshot = await readFile(`artifacts/${file}`);
  assert.equal(screenshot.subarray(1,4).toString(), 'PNG');
  assert.equal(screenshot.readUInt32BE(16), width); assert.equal(screenshot.readUInt32BE(20), height);
}
for (const name of ['dm-sans-latin.woff2', 'ibm-plex-mono-latin-400.woff2']) assert.equal((await readFile(`dist/fonts/${name}`)).subarray(0, 4).toString(), 'wOF2');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);

const groups = ['src', 'public', 'dist', 'scripts', 'artifacts', 'test/fixtures'];
const singleFiles = ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'README.md', 'DESIGN.md', 'NOTICE.md', 'test/economy.test.ts', 'test/production.mjs'];
const files = [];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    assert(!['node_modules', '.git', '.github'].includes(entry.name), `Unwanted directory in ${path}`);
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) await walk(child);
    else { assert(!entry.isSymbolicLink(), `Unexpected symlink ${child}`); files.push(child); }
  }
}
for (const group of groups) await walk(group);
files.push(...singleFiles);
let totalBytes = 0;
const budgets = {};
for (const file of files) {
  const bytes = (await stat(file)).size;
  totalBytes += bytes;
  const group = groups.find(g => file.startsWith(`${g}/`)) || 'root and test scripts';
  budgets[group] = (budgets[group] || 0) + bytes;
}
assert(totalBytes < 8_388_608, `Bundle is too large: ${totalBytes} bytes`);
const output = { totalBytes, limitBytes: 8_388_608, files: files.length, groups: budgets, exportSha256: createHash('sha256').update(html).digest('hex'), checks: 'Required paths, metadata, relative assets, PNG dimensions, WOFF2 headers, matching lockfile, no delivered dependency directories, and size budget passed.' };
await writeFile('artifacts/bundle-check.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
