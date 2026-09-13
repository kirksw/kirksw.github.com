import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const output = await mkdtemp(join(tmpdir(), 'astro-test-'));
const fixtureDir = 'src/content/posts/__test-mdx-fixture';
await mkdir(fixtureDir);
await writeFile(join(fixtureDir, 'index.mdx'), `---\ntitle: MDX fixture\ndate: 2024-01-01\ndraft: false\ntags: [test]\n---\n\nexport const greeting = "Rendered MDX expression";\n\n## Fixture heading\n\n<span>{greeting}</span>\n\nThis fixture proves MDX compilation.\n`);
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
try {
  run('npm', ['run', 'build', '--', '--outDir', output]);
  run(process.execPath, ['--test', 'tests/site.test.mjs'], { ...process.env, BUILD_DIR: output });
  run(process.execPath, ['scripts/validate-content.mjs', output]);
} finally {
  await rm(output, { recursive: true, force: true });
  await rm(fixtureDir, { recursive: true, force: true });
}
