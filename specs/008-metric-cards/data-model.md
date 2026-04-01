# Data Model: Metric Cards

## 1. RepoCardViewModel

The overview-tab representation of one successful repository.

### Fields

- `repo`: canonical `owner/name` slug
- `name`: repository display name or `"unavailable"`
- `description`: repository description or `"unavailable"`
- `createdAt`: ISO timestamp or `"unavailable"`
- `createdAtDisplay`: formatted display string or `"unavailable"`
- `stars`: exact count or `"unavailable"`
- `forks`: exact count or `"unavailable"`
- `watchers`: exact count or `"unavailable"`
- `ecosystemProfile`:
  - `reachTier`
  - `builderEngagementTier`
  - `builderEngagementRate`
  - `attentionTier`
  - `attentionRate`
- `scoreBadges`: array of `ScoreBadgeModel`
- `expandedDetail`: `ExpandedRepoDetail`
- `missingFields`: exact missing-data list from `AnalysisResult`

### Source

Built entirely from one `AnalysisResult` plus shared config.

## 2. ScoreBadgeModel

The compact display contract for one CHAOSS-aligned summary badge on a card.

### Fields

- `category`: one of:
  - `Evolution`
  - `Contribution Dynamics`
  - `Responsiveness`
- `value`: one of:
  - `High`
  - `Medium`
  - `Low`
  - `Not scored yet`
- `tone`: one of:
  - `success`
  - `warning`
  - `danger`
  - `neutral`
- `shortLabel`: compact visible label for card use

### Source

For `P1-F07`, real values may not yet exist. The card model must therefore support explicit interim `Not scored yet` values without guessing.

## 3. ExpandedRepoDetail

The in-place, expanded view for one metric card.

### Fields

- `primaryLanguage`
- `description`
- `createdAt`
- `commits30d`
- `commits90d`
- `releases12mo`
- `prsOpened90d`
- `prsMerged90d`
- `issuesOpen`
- `issuesClosed90d`
- `uniqueCommitAuthors90d`
- `totalContributors`
- `missingFields`

### Behavior

- Uses only values already present in `AnalysisResult`
- Keeps `"unavailable"` explicit
- Does not trigger new requests

## 4. OverviewCardsState

Client-only UI state for the `Overview` tab.

### Fields

- `expandedRepos`: set of repo slugs currently expanded
- `selectedTab`: already managed by the existing results shell

### Behavior

- Expansion state is local to the current analysis view
- Changing tabs must not rerun analysis
- Replacing analysis results resets card expansion safely
