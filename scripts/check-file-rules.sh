#!/usr/bin/env bash
# Hard-rule scanner. Two modes:
#
#   bash scripts/check-file-rules.sh path/to/file [more files...]
#     Per-file warning mode for the post-write hook. Prints any violations
#     found and ALWAYS exits 0 so the agent can keep working and fix on the
#     next iteration.
#
#   bash scripts/check-file-rules.sh --strict path/to/file [more files...]
#   bash scripts/check-file-rules.sh --all
#     Exits non-zero if any violation is found. Used by CI and pre-commit
#     hooks. --all walks the whole repo's source tree.
#
# Rules enforced:
#   1. No em or en dashes in any source file (hyphens only).
#   2. No "Blinklink" or other parent brand references in user-visible
#      paths (app/, components/, locales/, lib/i18n/).

set -u

STRICT=0
ALL=0
FILES=()

for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=1 ;;
    --all) ALL=1; STRICT=1 ;;
    *) FILES+=("$arg") ;;
  esac
done

if [ "$ALL" -eq 1 ]; then
  while IFS= read -r f; do
    FILES+=("$f")
  done < <(
    find app components lib locales types docs scripts \
      \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" -o -name "*.sh" \) \
      -type f \
      2>/dev/null
  )
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  exit 0
fi

ANY_VIOLATIONS=0

check_one() {
  local FILE="$1"
  [ -f "$FILE" ] || return 0

  # Skip files outside checkable extensions
  case "$FILE" in
    *.ts|*.tsx|*.js|*.jsx|*.json|*.md|*.sh) ;;
    *) return 0 ;;
  esac

  # Skip node_modules and .git
  case "$FILE" in
    *node_modules*|*.git*) return 0 ;;
  esac

  # Self-referential exceptions: these files DEFINE the rules and have to
  # quote the forbidden characters / brand name to do so.
  case "$FILE" in
    scripts/check-file-rules.sh) return 0 ;;
    docs/00-rules-and-mode.md) return 0 ;;
    CLAUDE.md) return 0 ;;
  esac

  local VIOLATIONS=""

  # Em or en dash anywhere
  if grep -nE '[—–]' "$FILE" >/dev/null 2>&1; then
    local LINES
    LINES=$(grep -nE '[—–]' "$FILE" | head -3)
    VIOLATIONS="${VIOLATIONS}- Em or en dash detected in $FILE:
${LINES}
"
  fi

  # Parent brand in user-visible paths
  case "$FILE" in
    app/*|components/*|locales/*|lib/i18n/*)
      if grep -niE 'blinklink' "$FILE" >/dev/null 2>&1; then
        local LINES
        LINES=$(grep -niE 'blinklink' "$FILE" | head -3)
        VIOLATIONS="${VIOLATIONS}- Parent brand reference in user-visible file $FILE:
${LINES}
"
      fi
      ;;
  esac

  if [ -n "$VIOLATIONS" ]; then
    ANY_VIOLATIONS=1
    echo "RULE VIOLATION in $FILE:"
    printf "%s" "$VIOLATIONS"
    echo
  fi
}

for f in "${FILES[@]}"; do
  check_one "$f"
done

if [ "$ANY_VIOLATIONS" -eq 1 ] && [ "$STRICT" -eq 1 ]; then
  echo "Hard-rule violations found. Failing." >&2
  exit 1
fi

exit 0
