# Quickstart: Results Shell

## Goal

Verify that the app now has a stable shell with header, GitHub link, analysis panel, and tabs that can host current and future result views.

## Scenarios

### 1. Initial load

1. Run `npm run dev`
2. Open `http://localhost:3000`
3. Confirm:
   - header/banner is visible
   - GitHub repo link is visible in the header
   - repo input and analyze controls are visible in a stable analysis panel
   - tabs are visible even before analysis

### 2. Analyze once, switch tabs

1. Submit one or more repositories
2. Confirm:
   - analysis runs once
   - switching tabs changes the visible content
   - tab switching does not trigger another analysis request

### 3. Placeholder tabs

1. Open placeholder tabs such as `Comparison` or `Metrics`
2. Confirm:
   - they show intentional placeholder or coming-soon content
   - the shell remains usable
   - switching back to an implemented tab preserves the current analysis state
