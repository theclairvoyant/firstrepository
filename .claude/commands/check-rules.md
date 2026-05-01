---
description: Greps the codebase for forbidden patterns (em dashes, en dashes, "blinklink" in user-visible files, emoji, raw hex). Reports findings. Does not modify files.
---

Run the following checks and report any findings as a structured list:

1. Em dashes and en dashes:
   ```bash
   ! grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.json' --include='*.md' -E '[–—]' . --exclude-dir=node_modules --exclude-dir=.git
   ```

2. Blinklink references in user-visible paths:
   ```bash
   ! grep -rn --include='*.ts' --include='*.tsx' --include='*.json' -i 'blinklink' app/ components/ locales/ lib/i18n/ 2>/dev/null
   ```

3. Raw hex codes outside the theme directory:
   ```bash
   ! grep -rn --include='*.ts' --include='*.tsx' -E '#[0-9a-fA-F]{3,8}' app/ components/ lib/ --exclude-dir='lib/theme' 2>/dev/null
   ```

4. Console.log / console.warn / console.error in source:
   ```bash
   ! grep -rn --include='*.ts' --include='*.tsx' -E 'console\.(log|warn|error)' app/ components/ lib/ 2>/dev/null
   ```

5. `any` types and ts-ignore in source:
   ```bash
   ! grep -rn --include='*.ts' --include='*.tsx' -E ': any|@ts-ignore|@ts-nocheck' app/ components/ lib/ 2>/dev/null
   ```

6. Run TypeScript compiler:
   ```bash
   ! npx tsc --noEmit
   ```

After running all checks, summarize: how many violations of each type, which files are most affected, and whether the codebase passes the rules.

If any em dashes or "blinklink" references in user-visible paths are found, mark the codebase as FAILING and list each occurrence with the exact file:line reference.
