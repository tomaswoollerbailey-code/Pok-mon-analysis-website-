import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A fake `gh` answers the three calls scripts/next-run.sh makes, so the chain logic runs without GitHub.
const dir = mkdtempSync(join(tmpdir(), 'next-run-'));
const log = join(dir, 'dispatched.log');
writeFileSync(join(dir, 'gh'), `#!/usr/bin/env bash
case "$*" in
  *"actions/runs/"*"run_started_at"*) echo "$FAKE_STARTED" ;;
  *"workflows/update-data.yml/runs"*) echo "$FAKE_OLDER" ;;
  "workflow run"*) echo "$*" >> "$FAKE_LOG" ;;
esac
`);
chmodSync(join(dir, 'gh'), 0o755);

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
function run(startedMinutesAgo: number, olderActive: number) {
  writeFileSync(log, '');
  const r = spawnSync('bash', ['scripts/next-run.sh'], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GITHUB_REPOSITORY: 'o/r', RUN_ID: '100', FAKE_STARTED: minutesAgo(startedMinutesAgo), FAKE_OLDER: String(olderActive), FAKE_LOG: log },
  });
  return { code: r.status, out: r.stdout + r.stderr, dispatched: readFileSync(log, 'utf8').trim() };
}

describe('next-run.sh', () => {
  it('starts the next run after the pause', () => {
    const r = run(31, 0);
    expect(r.code).toBe(0);
    expect(r.dispatched).toBe('workflow run update-data.yml --ref main');
  });

  it('refuses to loop when the pause environment has no wait timer', () => {
    const r = run(2, 0);
    expect(r.code).toBe(1);
    expect(r.out).toContain('no wait timer');
    expect(r.dispatched).toBe('');
  });

  it('leaves the chain to an older active run', () => {
    const r = run(31, 1);
    expect(r.code).toBe(0);
    expect(r.dispatched).toBe('');
  });
});
