# Manual testing — 190 Scorecard tile navigation

Dev server: http://localhost:3011

- [ ] Analyze a repo with sufficient data (e.g. `facebook/react`) and view the results.
- [ ] Hover a score-badge tile (Contributors / Activity / Responsiveness / Security) — cursor is a pointer and the tile shows a focus/hover state.
- [ ] Click **Contributors** tile → results shell switches to the Contributors tab.
- [ ] Click **Activity** tile → switches to the Activity tab.
- [ ] Click **Responsiveness** tile → switches to the Responsiveness tab.
- [ ] Click **Security** tile → switches to the Security tab.
- [ ] Tab-key through the tiles — each is keyboard focusable and activates on Enter/Space.
- [ ] Screen reader (or `aria-label` inspection) announces each as "Open <dimension> tab".
- [ ] Reach / Attention / Engagement tiles remain non-interactive (unchanged).
- [ ] Community lens pill still toggles the lens filter as before (unchanged).
- [ ] Existing "see Recommendations tab" link still works.

**Signoff:**
- Tester: _______
- Date: _______
