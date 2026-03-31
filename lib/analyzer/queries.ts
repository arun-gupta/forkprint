export const REPO_OVERVIEW_QUERY = `
  query RepoOverview($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      name
      description
      createdAt
      primaryLanguage {
        name
      }
      stargazerCount
      forkCount
      watchers {
        totalCount
      }
      issues(states: OPEN) {
        totalCount
      }
    }
    rateLimit {
      remaining
      resetAt
    }
  }
`

export const REPO_ACTIVITY_QUERY = `
  query RepoActivity(
    $owner: String!
    $name: String!
    $since30: GitTimestamp!
    $since90: GitTimestamp!
    $prsOpenedQuery: String!
    $prsMergedQuery: String!
    $issuesClosedQuery: String!
  ) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            recent30: history(since: $since30) {
              totalCount
            }
            recent90: history(since: $since90) {
              totalCount
            }
          }
        }
      }
    }
    prsOpened: search(query: $prsOpenedQuery, type: ISSUE) {
      issueCount
    }
    prsMerged: search(query: $prsMergedQuery, type: ISSUE) {
      issueCount
    }
    issuesClosed: search(query: $issuesClosedQuery, type: ISSUE) {
      issueCount
    }
    rateLimit {
      remaining
      resetAt
    }
  }
`
