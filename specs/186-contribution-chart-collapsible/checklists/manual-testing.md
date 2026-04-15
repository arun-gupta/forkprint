# Manual Testing — Issue #186: Collapsible Contribution Chart

Test against `npm run dev` with at least one repository that has many contributors (50+ is ideal for confirming the scroll-saving benefit).

- [ ] Open the Contributors tab. The main **Contribution chart** renders expanded by default (matches prior behavior).
- [ ] The `Hide chart`, `Include/Exclude bots`, `Show/Hide names`, and `Show/Hide numbers` buttons are all visible in the chart actions area.
- [ ] Click **Hide chart**. All contribution bars disappear; only the chart title, description, and toggle remain. The bots/names/numbers sub-controls are hidden.
- [ ] The toggle button now reads **Show chart** and has `aria-pressed="false"` and `aria-expanded="false"`.
- [ ] Click **Show chart**. The bars and all sub-controls reappear. `aria-pressed="true"` and `aria-expanded="true"`.
- [ ] After re-expanding, the previously selected name/number visibility and include-bots state are still in effect.
- [ ] Confirm the Organization chart inside the Contributors Score pane still works independently (its own Show/Hide chart toggle).

## Sign-off

Tested by: arun-gupta
Date: 2026-04-14
