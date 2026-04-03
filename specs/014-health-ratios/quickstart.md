# Quickstart: Health Ratios

## Goal

Ship `P1-F11` so users can:
- see contributor-composition ratios in `Contributors`
- compare ecosystem, activity, and contributor ratios in a dedicated `Health Ratios` tab
- trust unavailable values and ratio formulas

## Suggested Build Order

1. Add shared ratio definitions and sorting helpers
2. Extend analyzer outputs for contributor-composition ratio inputs if needed
3. Surface repeat/new contributor ratios in `Contributors`
4. Add the `Health Ratios` tab and grouped sortable table
5. Add tooltip/help text, unavailable rendering, and consistency tests
6. Complete manual testing and documentation updates

## Verification Commands

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

## Manual QA Focus

- `Contributors` shows repeat/new contributor ratios without rerunning analysis
- `Health Ratios` groups rows by category and sorts correctly
- unavailable table values render as `—`
- ratio values match the same repository’s values in their home tabs
- mobile layout remains readable for the ratio table
