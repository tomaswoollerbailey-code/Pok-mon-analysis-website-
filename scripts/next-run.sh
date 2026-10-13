#!/usr/bin/env bash
# Last step of the "Update data" workflow: start the next run, so the data keeps updating even when
# GitHub skips scheduled runs. The job that calls this waits on the "pause" environment first (its wait
# timer is the gap between runs, and waiting uses no runner time).
#
# Needs: GH_TOKEN, GITHUB_REPOSITORY, RUN_ID (this run). Optional: MIN_WAIT_MINUTES (default 15).
set -euo pipefail

min_wait="${MIN_WAIT_MINUTES:-15}"

# 1. Safety: if this run has not waited, the "pause" environment has no wait timer. Starting another run
#    now would loop and hammer Limitless, so stop and say why.
started=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$RUN_ID" --jq .run_started_at)
waited=$(( ( $(date +%s) - $(date -d "$started" +%s) ) / 60 ))
if [ "$waited" -lt "$min_wait" ]; then
  echo "::error::This run started only $waited minutes ago, so the 'pause' environment has no wait timer. Not starting another run (it would loop). Set Settings > Environments > pause > Wait timer to 30 minutes."
  exit 1
fi

# 2. If an older run is still active it will carry the chain on, so don't start a duplicate. (Oldest wins,
#    so two chains merge into one and the chain never ends up with zero runs.)
older=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/update-data.yml/runs?per_page=50" \
  --jq "[.workflow_runs[] | select(.status != \"completed\" and .id < $RUN_ID)] | length")
if [ "$older" -gt 0 ]; then
  echo "An older run is still active and will start the next one."
  exit 0
fi

gh workflow run update-data.yml --ref main
echo "Started the next run."
