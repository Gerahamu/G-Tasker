import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { loadConfigFromFile } from 'vite';

const configPath = fileURLToPath(new URL('../../vite.config.ts', import.meta.url));

test('web builds use root assets while desktop builds keep local relative assets', async () => {
  const web = await loadConfigFromFile({ command: 'build', mode: 'production' }, configPath);
  const desktop = await loadConfigFromFile({ command: 'build', mode: 'desktop' }, configPath);
  assert.equal(web.config.base, '/');
  assert.equal(web.config.build.outDir, 'dist');
  assert.equal(desktop.config.base, './');
  assert.equal(desktop.config.build.outDir, 'dist-desktop');
});

test('local development server has a stable, explicit address', async () => {
  const loaded = await loadConfigFromFile({ command: 'serve', mode: 'development' }, configPath);

  assert.ok(loaded);
  assert.deepEqual(loaded.config.server, {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  });
});

test('production preview has a stable, explicit address', async () => {
  const loaded = await loadConfigFromFile({ command: 'serve', mode: 'production' }, configPath);

  assert.ok(loaded);
  assert.deepEqual(loaded.config.preview, {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  });
});

test('Windows launcher delegates to the checked local startup script', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url)));
  const launcher = await readFile(new URL('../../Start G-Tasker.cmd', import.meta.url), 'utf8');
  const startupScript = await readFile(new URL('../../scripts/start-local.ps1', import.meta.url), 'utf8');

  assert.match(packageJson.scripts['start:local'], /scripts\\start-local\.ps1/i);
  assert.match(launcher, /SCRIPT_DIR=%~dp0/i);
  assert.match(launcher, /%SCRIPT_DIR%scripts\\start-local\.ps1/i);
  assert.match(startupScript, /strict port 5173/i);
  assert.match(startupScript, /Port 5173 is occupied by another process\./i);
  assert.match(startupScript, /netstat\.exe/i);
  assert.match(startupScript, /Start-Process/i);
});
