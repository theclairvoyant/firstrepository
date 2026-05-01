#!/usr/bin/env bash
# Post-write hook. Greps the just-written file for forbidden patterns.
# Returns nonzero only as a warning - does not block (Claude can fix on next iteration).

set -u
FILE="${1:-}"
[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

# Skip files outside source dirs
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md) ;;
  *) exit 0 ;;
esac

# Skip node_modules and .git
case "$FILE" in
  *node_modules*|*.git*) exit 0 ;;
esac

VIOLATIONS=""

# Check for em/en dashes
if grep -nE '[—–]' "$FILE" >/dev/null 2>&1; then
  LINES=$(grep -nE '[—–]' "$FILE" | head -3)
  VIOLATIONS="${VIOLATIONS}- Em or en dash detected in $FILE:\n${LINES}\n"
fi

# Check for blinklink in user-visible paths
case "$FILE" in
  app/*|components/*|locales/*|lib/i18n/*)
    if grep -niE 'blinklink' "$FILE" >/dev/null 2>&1; then
      LINES=$(grep -niE 'blinklink' "$FILE" | head -3)
      VIOLATIONS="${VIOLATIONS}- Parent brand reference in user-visible file $FILE:\n${LINES}\n"
    fi
    ;;
esac

if [ -n "$VIOLATIONS" ]; then
  echo "RULE WARNINGS for $FILE:"
  printf "%b" "$VIOLATIONS"
  echo "(These are warnings. Fix them before next phase.)"
fi

exit 0
