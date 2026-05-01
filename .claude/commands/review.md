---
description: Invokes the qa-reviewer subagent on the latest changes (or a specified path). Returns a structured audit report.
---

Use the Task tool to invoke the `qa-reviewer` subagent. Pass it a clear scope:

- If the user provided a path argument, ask qa-reviewer to review that path.
- Otherwise, ask qa-reviewer to review all files changed in the last commit (use `git diff --name-only HEAD~1 HEAD` to get the list, or all uncommitted changes via `git diff --name-only`).

After the qa-reviewer returns its report, summarize the verdict (PASS, PASS_WITH_WARNINGS, or FAIL) and ask the user whether to apply fixes.

If the verdict is FAIL, do not move to the next phase. Apply fixes first, then re-review.
