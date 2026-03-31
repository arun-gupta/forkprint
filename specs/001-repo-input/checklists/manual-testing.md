# Manual Testing Checklist: Repo Input (P1-F01)

**Purpose**: Verify feature behaviour manually before PR submission
**Feature**: [spec.md](../spec.md)

## Setup

- [x] Run `npm run dev` — app starts without errors
- [x] Open `http://localhost:3000` in browser

## US1 — Valid input accepted and submitted

- [x] Enter `facebook/react` → click Analyze → no error shown
- [x] Enter three repos on separate lines → click Analyze → no error shown
- [x] Enter `facebook/react, torvalds/linux` (comma-separated) → click Analyze → no error shown
- [x] Paste `https://github.com/facebook/react` → click Analyze → no error shown
- [x] Enter `facebook/react` twice → click Analyze → only one slug passed (verify in browser console)
- [x] Enter `  facebook/react  ` (whitespace padded) → click Analyze → accepted, trimmed

## US2 — Invalid input blocked with inline error

- [x] Submit empty textarea → inline error appears, no submission
- [x] Enter `react` (no owner) → click Analyze → inline error appears
- [x] Enter `facebook/` (no repo) → click Analyze → inline error appears
- [x] Enter one valid + one invalid slug → click Analyze → inline error appears
- [x] Fix invalid input and resubmit → error clears, submission proceeds

## Edge Cases

- [x] Enter `https://github.com/facebook` (URL missing repo) → inline error appears
- [x] Enter only whitespace/blank lines → inline error appears
- [x] Enter `Facebook/React` and `facebook/react` → both passed (case-sensitive, no dedup)

## Notes

_Sign off below when all items are verified:_

**Tested by**: arun-gupta  **Date**: 2026-03-31
