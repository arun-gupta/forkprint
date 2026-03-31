# Manual Testing Checklist: Repo Input (P1-F01)

**Purpose**: Verify feature behaviour manually before PR submission
**Feature**: [spec.md](../spec.md)

## Setup

- [ ] Run `npm run dev` — app starts without errors
- [ ] Open `http://localhost:3000` in browser

## US1 — Valid input accepted and submitted

- [ ] Enter `facebook/react` → click Analyze → no error shown
- [ ] Enter three repos on separate lines → click Analyze → no error shown
- [ ] Enter `facebook/react, torvalds/linux` (comma-separated) → click Analyze → no error shown
- [ ] Paste `https://github.com/facebook/react` → click Analyze → no error shown
- [ ] Enter `facebook/react` twice → click Analyze → only one slug passed (verify in browser console)
- [ ] Enter `  facebook/react  ` (whitespace padded) → click Analyze → accepted, trimmed

## US2 — Invalid input blocked with inline error

- [ ] Submit empty textarea → inline error appears, no submission
- [ ] Enter `react` (no owner) → click Analyze → inline error appears
- [ ] Enter `facebook/` (no repo) → click Analyze → inline error appears
- [ ] Enter one valid + one invalid slug → click Analyze → inline error appears
- [ ] Fix invalid input and resubmit → error clears, submission proceeds

## Edge Cases

- [ ] Enter `https://github.com/facebook` (URL missing repo) → inline error appears
- [ ] Enter only whitespace/blank lines → inline error appears
- [ ] Enter `Facebook/React` and `facebook/react` → both passed (case-sensitive, no dedup)

## Notes

_Sign off below when all items are verified:_

**Tested by**: _______________  **Date**: _______________
