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
      licenseInfo {
        spdxId
        name
      }
      docReadmeMd: object(expression: "HEAD:README.md") { ... on Blob { text } }
      docReadmeLower: object(expression: "HEAD:readme.md") { ... on Blob { text } }
      docReadmeRst: object(expression: "HEAD:README.rst") { ... on Blob { text } }
      docReadmeTxt: object(expression: "HEAD:README.txt") { ... on Blob { text } }
      docReadmePlain: object(expression: "HEAD:README") { ... on Blob { text } }
      docLicense: object(expression: "HEAD:LICENSE") { ... on Blob { oid } }
      docLicenseMd: object(expression: "HEAD:LICENSE.md") { ... on Blob { oid } }
      docLicenseTxt: object(expression: "HEAD:LICENSE.txt") { ... on Blob { oid } }
      docCopying: object(expression: "HEAD:COPYING") { ... on Blob { oid } }
      docContributing: object(expression: "HEAD:CONTRIBUTING.md") { ... on Blob { oid } }
      docContributingRst: object(expression: "HEAD:CONTRIBUTING.rst") { ... on Blob { oid } }
      docContributingTxt: object(expression: "HEAD:CONTRIBUTING.txt") { ... on Blob { oid } }
      docCodeOfConduct: object(expression: "HEAD:CODE_OF_CONDUCT.md") { ... on Blob { oid } }
      docCodeOfConductRst: object(expression: "HEAD:CODE_OF_CONDUCT.rst") { ... on Blob { oid } }
      docCodeOfConductTxt: object(expression: "HEAD:CODE_OF_CONDUCT.txt") { ... on Blob { oid } }
      docLicenseRst: object(expression: "HEAD:LICENSE.rst") { ... on Blob { oid } }
      docSecurity: object(expression: "HEAD:SECURITY.md") { ... on Blob { oid } }
      docSecurityRst: object(expression: "HEAD:SECURITY.rst") { ... on Blob { oid } }
      docChangelog: object(expression: "HEAD:CHANGELOG.md") { ... on Blob { oid } }
      docChangelogPlain: object(expression: "HEAD:CHANGELOG") { ... on Blob { oid } }
      docChanges: object(expression: "HEAD:CHANGES.md") { ... on Blob { oid } }
      docChangesRst: object(expression: "HEAD:CHANGES.rst") { ... on Blob { oid } }
      docHistory: object(expression: "HEAD:HISTORY.md") { ... on Blob { oid } }
      docNews: object(expression: "HEAD:NEWS.md") { ... on Blob { oid } }
      workflowDir: object(expression: "HEAD:.github/workflows") {
        ... on Tree {
          entries {
            name
            object {
              ... on Blob { text }
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

// ─── Two-pass activity queries ──────────────────────────────────────────────
//
// Pass 1: Commit history + releases — lightweight, stays well under
//         GitHub's RESOURCE_LIMITS_EXCEEDED threshold.
// Pass 2: Search-based PR/issue counts — may trigger RESOURCE_LIMITS_EXCEEDED
//         on repos with large PR/issue volumes, but pass 1 data is preserved.

export const REPO_COMMIT_AND_RELEASES_QUERY = `
  query RepoCommitAndReleases(
    $owner: String!
    $name: String!
    $since30: GitTimestamp!
    $since60: GitTimestamp!
    $since90: GitTimestamp!
    $since180: GitTimestamp!
    $since365: GitTimestamp!
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
                message
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

export const REPO_ACTIVITY_COUNTS_QUERY = `
  query RepoActivityCounts(
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
                message
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

// ─── Two-pass responsiveness queries ─────────────────────────────────────────
//
// Pass 1: Lightweight metadata — fetches issues/PRs with timestamps, author,
// comment/review counts, and node IDs. No nested comment/review nodes.
// This stays well under GitHub's RESOURCE_LIMITS_EXCEEDED threshold even for
// very large repos like kubernetes/kubernetes.
//
// Pass 2: Targeted detail — uses node IDs from pass 1 to fetch comment/review
// nodes only for the items that need them. Batched in groups of 10.

export const REPO_RESPONSIVENESS_METADATA_QUERY = `
  query RepoResponsivenessMetadata(
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
          id
          createdAt
          author {
            login
          }
          comments {
            totalCount
          }
        }
      }
    }
    recentClosedIssues: search(query: $issuesClosed365Query, type: ISSUE, first: 100) {
      nodes {
        ... on Issue {
          id
          createdAt
          closedAt
          author {
            login
          }
          comments {
            totalCount
          }
        }
      }
    }
    recentCreatedPullRequests: search(query: $prsCreated365Query, type: ISSUE, first: 100) {
      nodes {
        ... on PullRequest {
          id
          createdAt
          author {
            login
          }
          comments {
            totalCount
          }
          reviews {
            totalCount
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

/**
 * Builds a pass-2 detail query to fetch comments/reviews for specific nodes.
 * Uses aliases (node0, node1, ...) to batch multiple node lookups in one query.
 */
export function buildResponsivenessDetailQuery(
  nodeIds: Array<{ id: string; type: 'issue' | 'pr' }>,
): string {
  const aliases = nodeIds.map((item, i) => {
    const commentFragment = `
      comments(first: 20) {
        totalCount
        nodes {
          createdAt
          author { login }
        }
      }`
    const reviewFragment = item.type === 'pr' ? `
      reviews(first: 20) {
        totalCount
        nodes {
          createdAt
          author { login }
        }
      }` : ''

    return `
      node${i}: node(id: ${JSON.stringify(item.id)}) {
        ... on Issue {
          id
          createdAt
          author { login }
          ${commentFragment}
        }
        ... on PullRequest {
          id
          createdAt
          author { login }
          ${commentFragment}
          ${reviewFragment}
        }
      }`
  }).join('\n')

  return `{
    ${aliases}
    rateLimit { remaining resetAt }
  }`
}
