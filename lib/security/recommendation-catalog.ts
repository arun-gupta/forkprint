import type { RiskLevel, RecommendationCategoryKey, RecommendationSource } from './analysis-result'

export interface RecommendationCatalogEntry {
  key: string
  source: RecommendationSource
  title: string
  riskLevel: RiskLevel
  groupCategory: RecommendationCategoryKey
  whyItMatters: string
  remediation: string
  remediationHint: string | null
  docsUrl: string | null
  directCheckMapping: string | null
  /** Cross-cutting tags for filtering (e.g. "governance") */
  tags?: string[]
}

export interface RecommendationCategoryDefinition {
  key: RecommendationCategoryKey
  label: string
  order: number
}

const SCORECARD_DOCS_BASE = 'https://github.com/ossf/scorecard/blob/main/docs/checks.md'

export const CATEGORY_DEFINITIONS: RecommendationCategoryDefinition[] = [
  { key: 'critical_issues', label: 'Critical Issues', order: 1 },
  { key: 'quick_wins', label: 'Quick Wins', order: 2 },
  { key: 'workflow_hardening', label: 'Workflow Hardening', order: 3 },
  { key: 'best_practices', label: 'Best Practices', order: 4 },
]

export const RECOMMENDATION_CATALOG: RecommendationCatalogEntry[] = [
  // --- Critical risk Scorecard checks ---
  {
    key: 'Dangerous-Workflow',
    source: 'scorecard',
    title: 'Fix dangerous GitHub Actions workflow patterns',
    riskLevel: 'Critical',
    groupCategory: 'critical_issues',
    whyItMatters: 'Dangerous workflow patterns like untrusted code checkouts and script injection can allow attackers to execute arbitrary code in your CI/CD pipeline.',
    remediation: 'Avoid using pull_request_target with explicit checkouts. Prevent untrusted context variables from flowing into executable code in workflow scripts.',
    remediationHint: 'Replace `pull_request_target` triggers with `pull_request` where possible, and never pass user-controlled inputs directly into `run:` steps.',
    docsUrl: `${SCORECARD_DOCS_BASE}#dangerous-workflow`,
    directCheckMapping: null,
  },
  {
    key: 'Webhooks',
    source: 'scorecard',
    title: 'Secure webhook configurations with token authentication',
    riskLevel: 'Critical',
    groupCategory: 'critical_issues',
    whyItMatters: 'Webhooks without secret token authentication allow unauthorized parties to send forged payloads, potentially triggering unintended actions.',
    remediation: 'Enable secret token authentication in all webhook settings to verify payload authenticity.',
    remediationHint: 'Set a webhook secret in repository Settings > Webhooks and validate the `X-Hub-Signature-256` header in your webhook handler.',
    docsUrl: `${SCORECARD_DOCS_BASE}#webhooks`,
    directCheckMapping: null,
  },

  // --- High risk Scorecard checks ---
  {
    key: 'Branch-Protection',
    source: 'scorecard',
    title: 'Enforce branch protection on the default branch',
    riskLevel: 'High',
    groupCategory: 'workflow_hardening',
    whyItMatters: 'Without branch protection, anyone with write access can push directly to the default branch, bypassing code review and status checks.',
    remediation: 'Enable branch protection rules requiring pull request reviews and passing status checks before merging.',
    remediationHint: 'Go to Settings > Branches > Add rule for your default branch. Require at least 1 reviewer and enable "Require status checks to pass."',
    docsUrl: `${SCORECARD_DOCS_BASE}#branch-protection`,
    directCheckMapping: 'branch_protection',
    tags: ['governance'],
  },
  {
    key: 'Binary-Artifacts',
    source: 'scorecard',
    title: 'Remove binary artifacts from the repository',
    riskLevel: 'High',
    groupCategory: 'best_practices',
    whyItMatters: 'Binary artifacts checked into the repository cannot be easily audited for malicious content and undermine reproducible builds.',
    remediation: 'Remove binary files from the repository and implement build-from-source processes to ensure reproducible builds.',
    remediationHint: 'Delete checked-in binaries (`.exe`, `.dll`, `.so`, `.jar`) and add them to `.gitignore`. Build artifacts from source in CI.',
    docsUrl: `${SCORECARD_DOCS_BASE}#binary-artifacts`,
    directCheckMapping: null,
    tags: ['supply-chain'],
  },
  {
    key: 'Code-Review',
    source: 'scorecard',
    title: 'Require code review before merging pull requests',
    riskLevel: 'High',
    groupCategory: 'workflow_hardening',
    whyItMatters: 'Without mandatory code review, unreviewed changes can introduce bugs, vulnerabilities, or malicious code into the codebase.',
    remediation: 'Implement mandatory code reviews for all changes. Require at least one approval before merging, including from administrators.',
    remediationHint: 'Enable "Require pull request reviews before merging" in branch protection rules and set minimum reviewers to 1+.',
    docsUrl: `${SCORECARD_DOCS_BASE}#code-review`,
    directCheckMapping: null,
    tags: ['governance'],
  },
  {
    key: 'Dependency-Update-Tool',
    source: 'scorecard',
    title: 'Enable automated dependency updates',
    riskLevel: 'High',
    groupCategory: 'quick_wins',
    whyItMatters: 'Without automated dependency updates, known vulnerabilities in dependencies go unpatched, increasing the attack surface over time.',
    remediation: 'Enable Dependabot or Renovate to automatically create pull requests for dependency updates.',
    remediationHint: 'Create `.github/dependabot.yml` with update schedules for your package ecosystems.',
    docsUrl: `${SCORECARD_DOCS_BASE}#dependency-update-tool`,
    directCheckMapping: 'dependabot',
    tags: ['supply-chain', 'quick-win'],
  },
  {
    key: 'Signed-Releases',
    source: 'scorecard',
    title: 'Sign release artifacts to attest provenance',
    riskLevel: 'High',
    groupCategory: 'best_practices',
    whyItMatters: 'Unsigned releases cannot be verified for authenticity, making it possible for attackers to distribute tampered artifacts.',
    remediation: 'Sign releases using PGP or minisign. Attach signature files and publish SLSA provenance files with each release.',
    remediationHint: 'Use `gpg --sign` or `cosign` to sign release artifacts, and attach `.sig` or `.pem` files to GitHub releases.',
    docsUrl: `${SCORECARD_DOCS_BASE}#signed-releases`,
    directCheckMapping: null,
    tags: ['supply-chain'],
  },
  {
    key: 'Token-Permissions',
    source: 'scorecard',
    title: 'Restrict GitHub Actions token permissions',
    riskLevel: 'High',
    groupCategory: 'workflow_hardening',
    whyItMatters: 'Overly broad workflow token permissions increase the blast radius if a workflow is compromised, allowing attackers to modify code, create releases, or access secrets.',
    remediation: 'Set top-level permissions to read-only and declare write permissions only at the job level when necessary.',
    remediationHint: 'Add `permissions: read-all` at the top of workflow files and grant specific write permissions per job.',
    docsUrl: `${SCORECARD_DOCS_BASE}#token-permissions`,
    directCheckMapping: null,
    tags: ['supply-chain'],
  },
  {
    key: 'Vulnerabilities',
    source: 'scorecard',
    title: 'Fix known vulnerabilities in dependencies',
    riskLevel: 'High',
    groupCategory: 'best_practices',
    whyItMatters: 'Open, unfixed vulnerabilities in the codebase or dependencies expose the project and its users to known exploits.',
    remediation: 'Fix vulnerabilities promptly by updating affected dependencies. Document ignored vulnerabilities with clear rationale.',
    remediationHint: 'Run `npm audit fix` or equivalent for your ecosystem, and review GitHub Security Advisories for your repository.',
    docsUrl: `${SCORECARD_DOCS_BASE}#vulnerabilities`,
    directCheckMapping: null,
  },
  {
    key: 'Maintained',
    source: 'scorecard',
    title: 'Maintain regular development activity',
    riskLevel: 'High',
    groupCategory: 'best_practices',
    whyItMatters: 'A project without recent commits or issue activity may be abandoned, leaving known issues and vulnerabilities unaddressed.',
    remediation: 'Maintain regular development cycles with commits and issue triage. Archive the project if it is no longer actively developed.',
    remediationHint: null,
    docsUrl: `${SCORECARD_DOCS_BASE}#maintained`,
    directCheckMapping: null,
  },

  // --- Medium risk Scorecard checks ---
  {
    key: 'Fuzzing',
    source: 'scorecard',
    title: 'Adopt fuzz testing to find edge-case bugs',
    riskLevel: 'Medium',
    groupCategory: 'best_practices',
    whyItMatters: 'Fuzz testing discovers edge-case bugs and memory safety issues that unit tests miss, reducing the risk of exploitable crashes.',
    remediation: 'Integrate with OSS-Fuzz, deploy ClusterFuzzLite, or implement language-specific fuzzing functions.',
    remediationHint: 'For Go: add `func FuzzXxx` tests. For C/C++: integrate with OSS-Fuzz. For JS/TS: use `jsfuzz` or `jazzer.js`.',
    docsUrl: `${SCORECARD_DOCS_BASE}#fuzzing`,
    directCheckMapping: null,
  },
  {
    key: 'Pinned-Dependencies',
    source: 'scorecard',
    title: 'Pin dependencies to specific versions by hash',
    riskLevel: 'Medium',
    groupCategory: 'workflow_hardening',
    whyItMatters: 'Mutable dependency references (tags, branches, version ranges) can be silently changed upstream, enabling supply chain attacks.',
    remediation: 'Pin Dockerfile base images by digest, use lock files, and pin GitHub Actions to full commit SHAs instead of tags.',
    remediationHint: 'Replace `uses: actions/checkout@v4` with `uses: actions/checkout@<full-sha>` in workflow files.',
    docsUrl: `${SCORECARD_DOCS_BASE}#pinned-dependencies`,
    directCheckMapping: null,
    tags: ['supply-chain'],
  },
  {
    key: 'SAST',
    source: 'scorecard',
    title: 'Enable static application security testing (SAST)',
    riskLevel: 'Medium',
    groupCategory: 'best_practices',
    whyItMatters: 'Without SAST, source code vulnerabilities like injection flaws and buffer overflows go undetected until runtime exploitation.',
    remediation: 'Integrate CodeQL via GitHub Actions or another SAST tool into your CI/CD pipeline to scan code on every pull request.',
    remediationHint: 'Enable GitHub Code Scanning with CodeQL by adding the `github/codeql-action/analyze` step to your CI workflow.',
    docsUrl: `${SCORECARD_DOCS_BASE}#sast`,
    directCheckMapping: null,
  },
  {
    key: 'Security-Policy',
    source: 'scorecard',
    title: 'Add a security vulnerability disclosure policy',
    riskLevel: 'Medium',
    groupCategory: 'quick_wins',
    whyItMatters: 'Without a SECURITY.md, security researchers have no clear way to report vulnerabilities responsibly, increasing the chance of public disclosure without a fix.',
    remediation: 'Create a SECURITY.md file in the repository root with vulnerability reporting instructions, contact methods, and expected response timelines.',
    remediationHint: 'Create `SECURITY.md` with sections: Reporting a Vulnerability, Contact, Response Timeline. GitHub also supports private vulnerability reporting.',
    docsUrl: `${SCORECARD_DOCS_BASE}#security-policy`,
    directCheckMapping: 'security_policy',
    tags: ['governance', 'quick-win', 'compliance'],
  },
  {
    key: 'Packaging',
    source: 'scorecard',
    title: 'Publish packages through official registries',
    riskLevel: 'Medium',
    groupCategory: 'best_practices',
    whyItMatters: 'Publishing through official package registries with automated workflows ensures artifacts are built from reviewed source code.',
    remediation: 'Publish via GitHub Packages or language-specific registries using automated release workflows.',
    remediationHint: null,
    docsUrl: `${SCORECARD_DOCS_BASE}#packaging`,
    directCheckMapping: null,
    tags: ['supply-chain'],
  },

  // --- Low risk Scorecard checks ---
  {
    key: 'CI-Tests',
    source: 'scorecard',
    title: 'Run automated tests on pull requests',
    riskLevel: 'Low',
    groupCategory: 'quick_wins',
    whyItMatters: 'Without automated tests on pull requests, regressions and bugs can be merged undetected.',
    remediation: 'Add test scripts and integrate with a CI platform (GitHub Actions, Jenkins, CircleCI) to run tests on every pull request.',
    remediationHint: 'Add a GitHub Actions workflow with `on: pull_request` that runs your test suite.',
    docsUrl: `${SCORECARD_DOCS_BASE}#ci-tests`,
    directCheckMapping: 'ci_cd',
    tags: ['quick-win'],
  },
  {
    key: 'License',
    source: 'scorecard',
    title: 'Add a recognized open-source license',
    riskLevel: 'Low',
    groupCategory: 'quick_wins',
    whyItMatters: 'Without a license file, the default copyright applies and users cannot legally use, modify, or distribute the code.',
    remediation: 'Add a LICENSE file to the repository root using an SPDX-recognized identifier. Consider FSF/OSI-approved licenses.',
    remediationHint: 'Create a `LICENSE` file at the repo root. Use `choosealicense.com` to pick an appropriate license.',
    docsUrl: `${SCORECARD_DOCS_BASE}#license`,
    directCheckMapping: null,
    tags: ['governance', 'compliance'],
  },

  // --- Direct checks ---
  {
    key: 'security_policy',
    source: 'direct_check',
    title: 'Add a SECURITY.md vulnerability disclosure policy',
    riskLevel: 'Medium',
    groupCategory: 'quick_wins',
    whyItMatters: 'Without a SECURITY.md, security researchers have no clear way to report vulnerabilities responsibly.',
    remediation: 'Create a SECURITY.md file with vulnerability reporting instructions, contact methods, and expected response timelines.',
    remediationHint: 'Create `SECURITY.md` at the repo root with sections for reporting process, contact info, and response expectations.',
    docsUrl: null,
    directCheckMapping: null,
    tags: ['governance', 'quick-win', 'compliance'],
  },
  {
    key: 'dependabot',
    source: 'direct_check',
    title: 'Enable automated dependency updates',
    riskLevel: 'High',
    groupCategory: 'quick_wins',
    whyItMatters: 'Without automated dependency updates, known vulnerabilities in dependencies go unpatched over time.',
    remediation: 'Enable Dependabot or Renovate to automatically create pull requests for dependency updates.',
    remediationHint: 'Create `.github/dependabot.yml` with update schedules for your package ecosystems.',
    docsUrl: null,
    directCheckMapping: null,
    tags: ['supply-chain', 'quick-win'],
  },
  {
    key: 'ci_cd',
    source: 'direct_check',
    title: 'Add CI/CD workflows for automated testing',
    riskLevel: 'Low',
    groupCategory: 'quick_wins',
    whyItMatters: 'Without CI/CD, code changes are not automatically tested, increasing the risk of shipping bugs and regressions.',
    remediation: 'Add GitHub Actions workflows for automated testing and CI/CD to catch issues before they reach production.',
    remediationHint: 'Create `.github/workflows/ci.yml` with a workflow that runs your test suite on push and pull_request events.',
    docsUrl: null,
    directCheckMapping: null,
    tags: ['quick-win'],
  },
  {
    key: 'branch_protection',
    source: 'direct_check',
    title: 'Enable branch protection on the default branch',
    riskLevel: 'High',
    groupCategory: 'workflow_hardening',
    whyItMatters: 'Without branch protection, anyone with write access can push directly to the default branch, bypassing review.',
    remediation: 'Enable branch protection rules on the default branch to enforce code review before merging.',
    remediationHint: 'Go to Settings > Branches > Add rule for your default branch. Require at least 1 reviewer.',
    docsUrl: null,
    directCheckMapping: null,
    tags: ['governance'],
  },
]

const catalogMap = new Map(RECOMMENDATION_CATALOG.map((e) => [e.key, e]))

export function getCatalogEntry(key: string): RecommendationCatalogEntry | undefined {
  return catalogMap.get(key)
}
