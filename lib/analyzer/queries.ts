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
      pullRequests(states: OPEN) {
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
    $since60: GitTimestamp!
    $since90: GitTimestamp!
    $since180: GitTimestamp!
    $since365: GitTimestamp!
    $prsOpened30Query: String!
    $prsOpened60Query: String!
    $prsOpened90Query: String!
    $prsOpened180Query: String!
    $prsOpened365Query: String!
    $prsMerged30Query: String!
    $prsMerged60Query: String!
    $prsMerged90Query: String!
    $prsMerged180Query: String!
    $prsMerged365Query: String!
    $issuesOpened30Query: String!
    $issuesOpened60Query: String!
    $issuesOpened90Query: String!
    $issuesOpened180Query: String!
    $issuesOpened365Query: String!
    $issuesClosed30Query: String!
    $issuesClosed60Query: String!
    $issuesClosed90Query: String!
    $issuesClosed180Query: String!
    $issuesClosed365Query: String!
    $staleIssues30Query: String!
    $staleIssues60Query: String!
    $staleIssues90Query: String!
    $staleIssues180Query: String!
    $staleIssues365Query: String!
  ) {
    repository(owner: $owner, name: $name) {
      releases(first: 100, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes {
          createdAt
          publishedAt
        }
      }
      defaultBranchRef {
        target {
          ... on Commit {
            recent30: history(since: $since30) {
              totalCount
            }
            recent60: history(since: $since60) {
              totalCount
            }
            recent90: history(since: $since90) {
              totalCount
            }
            recent180: history(since: $since180) {
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
    prsOpened30: search(query: $prsOpened30Query, type: ISSUE) {
      issueCount
    }
    prsOpened60: search(query: $prsOpened60Query, type: ISSUE) {
      issueCount
    }
    prsOpened90: search(query: $prsOpened90Query, type: ISSUE) {
      issueCount
    }
    prsOpened180: search(query: $prsOpened180Query, type: ISSUE) {
      issueCount
    }
    prsOpened365: search(query: $prsOpened365Query, type: ISSUE) {
      issueCount
    }
    prsMerged30: search(query: $prsMerged30Query, type: ISSUE) {
      issueCount
    }
    prsMerged60: search(query: $prsMerged60Query, type: ISSUE) {
      issueCount
    }
    prsMerged90: search(query: $prsMerged90Query, type: ISSUE) {
      issueCount
    }
    prsMerged180: search(query: $prsMerged180Query, type: ISSUE) {
      issueCount
    }
    prsMerged365: search(query: $prsMerged365Query, type: ISSUE) {
      issueCount
    }
    issuesOpened30: search(query: $issuesOpened30Query, type: ISSUE) {
      issueCount
    }
    issuesOpened60: search(query: $issuesOpened60Query, type: ISSUE) {
      issueCount
    }
    issuesOpened90: search(query: $issuesOpened90Query, type: ISSUE) {
      issueCount
    }
    issuesOpened180: search(query: $issuesOpened180Query, type: ISSUE) {
      issueCount
    }
    issuesOpened365: search(query: $issuesOpened365Query, type: ISSUE) {
      issueCount
    }
    issuesClosed30: search(query: $issuesClosed30Query, type: ISSUE) {
      issueCount
    }
    issuesClosed60: search(query: $issuesClosed60Query, type: ISSUE) {
      issueCount
    }
    issuesClosed90: search(query: $issuesClosed90Query, type: ISSUE) {
      issueCount
    }
    issuesClosed180: search(query: $issuesClosed180Query, type: ISSUE) {
      issueCount
    }
    issuesClosed365: search(query: $issuesClosed365Query, type: ISSUE) {
      issueCount
    }
    staleIssues30: search(query: $staleIssues30Query, type: ISSUE) {
      issueCount
    }
    staleIssues60: search(query: $staleIssues60Query, type: ISSUE) {
      issueCount
    }
    staleIssues90: search(query: $staleIssues90Query, type: ISSUE) {
      issueCount
    }
    staleIssues180: search(query: $staleIssues180Query, type: ISSUE) {
      issueCount
    }
    staleIssues365: search(query: $staleIssues365Query, type: ISSUE) {
      issueCount
    }
    recentMergedPullRequests: search(query: $prsMerged365Query, type: ISSUE, first: 100) {
      nodes {
        ... on PullRequest {
          createdAt
          mergedAt
        }
      }
    }
    recentClosedIssues: search(query: $issuesClosed365Query, type: ISSUE, first: 100) {
      nodes {
        ... on Issue {
          createdAt
          closedAt
        }
      }
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

export const REPO_RESPONSIVENESS_QUERY = `
  query RepoResponsiveness(
    $issuesCreated365Query: String!
    $issuesClosed365Query: String!
    $prsCreated365Query: String!
    $prsMerged365Query: String!
    $stalePrs30Query: String!
    $stalePrs60Query: String!
    $stalePrs90Query: String!
    $stalePrs180Query: String!
    $stalePrs365Query: String!
  ) {
    recentCreatedIssues: search(query: $issuesCreated365Query, type: ISSUE, first: 100) {
      nodes {
        ... on Issue {
          createdAt
          author {
            login
          }
          comments(first: 20) {
            totalCount
            nodes {
              createdAt
              author {
                login
              }
            }
          }
        }
      }
    }
    recentClosedIssues: search(query: $issuesClosed365Query, type: ISSUE, first: 100) {
      nodes {
        ... on Issue {
          createdAt
          closedAt
          author {
            login
          }
          comments(first: 20) {
            totalCount
            nodes {
              createdAt
              author {
                login
              }
            }
          }
        }
      }
    }
    recentCreatedPullRequests: search(query: $prsCreated365Query, type: ISSUE, first: 100) {
      nodes {
        ... on PullRequest {
          createdAt
          author {
            login
          }
          comments(first: 20) {
            totalCount
            nodes {
              createdAt
              author {
                login
              }
            }
          }
          reviews(first: 20) {
            totalCount
            nodes {
              createdAt
              author {
                login
              }
            }
          }
        }
      }
    }
    recentMergedPullRequests: search(query: $prsMerged365Query, type: ISSUE, first: 100) {
      nodes {
        ... on PullRequest {
          createdAt
          mergedAt
        }
      }
    }
    staleOpenPullRequests30: search(query: $stalePrs30Query, type: ISSUE) {
      issueCount
    }
    staleOpenPullRequests60: search(query: $stalePrs60Query, type: ISSUE) {
      issueCount
    }
    staleOpenPullRequests90: search(query: $stalePrs90Query, type: ISSUE) {
      issueCount
    }
    staleOpenPullRequests180: search(query: $stalePrs180Query, type: ISSUE) {
      issueCount
    }
    staleOpenPullRequests365: search(query: $stalePrs365Query, type: ISSUE) {
      issueCount
    }
    rateLimit {
      remaining
      resetAt
    }
  }
`
