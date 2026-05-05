#!/usr/bin/env bash
# Verifies that every locale file has the same key set as en.json.
# Exits non-zero if any locale is out of sync, with a per-locale diff.
#
# Run from repo root:   bash locales/check-parity.sh

set -e

cd "$(dirname "$0")/.."

python3 <<'PY'
import json, sys

with open('locales/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)

def flatten(d, prefix=''):
    out = set()
    for k, v in d.items():
        path = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out |= flatten(v, path)
        else:
            out.add(path)
    return out

en_keys = flatten(en)
status = 0
for lang in ('ar', 'es', 'fr', 'hi'):
    with open(f'locales/{lang}.json', 'r', encoding='utf-8') as f:
        d = json.load(f)
    keys = flatten(d)
    missing = en_keys - keys
    extra = keys - en_keys
    if missing or extra:
        status = 1
        print(f'\n{lang}.json out of sync ({len(missing)} missing, {len(extra)} stale):')
        for k in sorted(missing):
            print(f'  MISSING (will fall back to en): {k}')
        for k in sorted(extra):
            print(f'  STALE  (no longer in en): {k}')
    else:
        print(f'{lang}.json - OK ({len(keys)} keys)')

sys.exit(status)
PY
