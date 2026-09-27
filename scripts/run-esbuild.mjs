import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const packageJson = require.resolve('esbuild/package.json');
const executable = path.join(
  path.dirname(packageJson),
  'bin',
  process.platform === 'win32' ? 'esbuild.exe' : 'esbuild'
);
const result = spawnSync(executable, process.argv.slice(2), {
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
