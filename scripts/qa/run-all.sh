#!/usr/bin/env bash
# Orchestrates the launch QA suite. Use BASE_URL to target preview/staging/production.
set -uo pipefail
BASE_URL="${BASE_URL:-https://enduserprivacy.com}"
export BASE_URL
cd "$(dirname "$0")/../.."

mkdir -p scripts/qa
echo "=== EUP launch QA against ${BASE_URL} ==="

declare -A RESULTS

run() {
  local name="$1"; shift
  echo
  echo "--- ${name} ---"
  if "$@"; then RESULTS[$name]="PASS"; else RESULTS[$name]="FAIL"; fi
}

run "crawl"          node scripts/qa/crawl-routes.mjs
run "links"          node scripts/qa/link-audit.mjs
run "content"        node scripts/qa/content-audit.mjs
run "pricing-drift"  node scripts/check-pricing-drift.mjs
run "gating-leak"    node scripts/scan-gating-leaks.mjs

echo
echo "=== SUMMARY ==="
fail=0
for k in "${!RESULTS[@]}"; do
  printf "  %-16s %s\n" "$k" "${RESULTS[$k]}"
  [[ "${RESULTS[$k]}" == "FAIL" ]] && fail=1
done
exit $fail
