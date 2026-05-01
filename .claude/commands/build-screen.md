---
description: Invokes the screen-builder subagent for a specific screen with the right context preloaded. Usage - `/build-screen <screen-name>`. Examples - `/build-screen profile`, `/build-screen otp`, `/build-screen settings/language`.
---

Take the screen name argument and:

1. Determine which spec doc covers it:
   - Auth flow (welcome, method, email, otp, invite-code, profile-setup) -> `docs/02-identity-and-onboarding.md`
   - Tab layout, top bar, tenant switcher, drawer, add-tenant -> `docs/03-app-shell.md`
   - Profile, upload composer, video detail, settings, settings sub-screens -> `docs/04-screens.md`
   - Composer (record, edit, preview) -> also `docs/05-video-pipeline.md`

2. Use the Task tool to invoke the `screen-builder` subagent with:
   - The screen name
   - The spec doc path(s) to read
   - Any current navigation state context (which routes already exist)

3. After screen-builder returns, run `/check-rules` to verify hard rules compliance.

4. If rules pass, run `npx tsc --noEmit` to verify TypeScript.

5. Summarize what was built and what's next.
