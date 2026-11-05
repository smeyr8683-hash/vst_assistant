import { existsSync, mkdirSync, copyFileSync, writeFileSync, chmodSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 14)) {
  console.error('Install Node.js 22.14+ (or a newer supported LTS) from https://nodejs.org, then retry.'); process.exit(1);
}
const nativeRequire = createRequire(import.meta.url);
try { const { DatabaseSync } = nativeRequire('node:sqlite'); const test = new DatabaseSync(':memory:'); test.close(); }
catch { console.error('This Node.js installation does not provide node:sqlite. Use Node.js 22.14+ or newer LTS.'); process.exit(1); }
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw new Error(`${path.basename(command)} failed. Check the message above and retry setup. Existing settings and database were preserved.`);
}
try {
  console.log('VST Assistant Team 0.2.0 — installs dependencies and creates HTTPS certificates for THIS computer.');
  console.log('Certificate trust installation may ask for your computer password / Windows approval. Enter it only in the local system prompt.');
  if (!existsSync('.env.local')) { copyFileSync('.env.example', '.env.local'); chmodSync('.env.local', 0o600); }
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci'], { shell: process.platform === 'win32' });
  const found = spawnSync('mkcert', ['-version'], { encoding: 'utf8' });
  let mkcert = 'mkcert';
  if (found.status !== 0) {
    const platforms = {darwin:'darwin',win32:'windows',linux:'linux'};
    const architectures = {arm64:'arm64',x64:'amd64'};
    const platform = platforms[process.platform], arch = architectures[process.arch];
    if (!platform || !arch) throw new Error('Unsupported platform. Install mkcert manually from https://github.com/FiloSottile/mkcert and retry.');
    mkdirSync('.tools', { recursive: true });
    const name = `mkcert-v1.4.4-${platform}-${arch}${platform === 'windows' ? '.exe' : ''}`;
    mkcert = path.resolve('.tools', name);
    if (!existsSync(mkcert)) {
      console.log('Downloading mkcert from its official GitHub release...');
      const response = await fetch(`https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/${name}`, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error(`mkcert download failed: HTTP ${response.status}`);
      writeFileSync(mkcert + '.download', Buffer.from(await response.arrayBuffer()), { mode: 0o700 });
      renameSync(mkcert + '.download', mkcert);
    }
    chmodSync(mkcert, 0o700);
  }
  run(mkcert, ['-install']);
  mkdirSync('certificates', { recursive: true, mode: 0o700 });
  if (!existsSync('certificates/localhost.pem') || !existsSync('certificates/localhost-key.pem')) {
    run(mkcert, ['-key-file', 'certificates/localhost-key.pem', '-cert-file', 'certificates/localhost.pem', 'localhost', '127.0.0.1', '::1']);
    chmodSync('certificates/localhost-key.pem', 0o600);
  }
  console.log('\nSetup complete. Fill your own Meta IDs in .env.local (see FACEBOOK_SETUP_KM.md).');
  console.log('Run npm run check:local, then npm run start:local. URL: https://localhost:3443');
} catch(error) { console.error('\nSETUP STOPPED:', error.message); process.exit(1); }
