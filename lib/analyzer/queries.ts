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
    $since365: GitTimestamp!
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
            recent365Commits: history(first: 100, since: $since365) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                authoredDate
                author {
                  name
                  email
                  user {
                    login
                  }
                }
              }
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

export const REPO_COMMIT_HISTORY_PAGE_QUERY = `
  query RepoCommitHistoryPage(
    $owner: String!
    $name: String!
    $since365: GitTimestamp!
    $after: String!
  ) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            recent365Commits: history(first: 100, since: $since365, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                authoredDate
                author {
                  name
                  email
                  user {
                    login
                  }
                }
              }
            }
          }
        }
      }
    }
    rateLimit {
      remaining
      resetAt
    }
  }
`
