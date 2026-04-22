export interface CNCFFieldConfig {
  id: string
  label: string
  weight: number
  homeTab?: string
}

export interface CNCFHumanFieldConfig {
  id: string
  label: string
  explanatoryNote: string
}

export const CNCF_AUTO_FIELDS: CNCFFieldConfig[] = [
  { id: 'contributor-diversity', label: 'Contributor Diversity', weight: 15, homeTab: 'contributors' },
  { id: 'license', label: 'License', weight: 12, homeTab: 'overview' },
  { id: 'coc', label: 'Code of Conduct', weight: 10, homeTab: 'documentation' },
  { id: 'contributing', label: 'Contributing Guide', weight: 10, homeTab: 'documentation' },
  { id: 'roadmap', label: 'Roadmap', weight: 10, homeTab: 'documentation' },
  { id: 'security', label: 'Security Policy', weight: 8, homeTab: 'security' },
  { id: 'maintainers', label: 'Maintainers File', weight: 8, homeTab: 'documentation' },
  { id: 'adopters', label: 'Adopters', weight: 7, homeTab: 'documentation' },
  { id: 'landscape', label: 'CNCF Landscape Listing', weight: 5 },
  { id: 'lfx', label: 'LFX Insights Listing', weight: 0 },
  { id: 'project-activity', label: 'Project Activity', weight: 0, homeTab: 'activity' },
]

export const CNCF_ALLOWED_SPDX_IDS = new Set([
  'Apache-2.0',
  'MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MPL-2.0',
])

export const CNCF_HUMAN_FIELDS: CNCFHumanFieldConfig[] = [
  {
    id: 'why-cncf',
    label: 'Why CNCF?',
    explanatoryNote:
      "Name a specific governance benefit (vendor-neutral, multi-stakeholder control), a concrete CNCF technical context this project fits into (adjacent projects, TAGs, working groups), and why now is the right time (adoption threshold, need for multi-company contributors, commercial entanglement). Avoid: 'visibility' or 'adoption' in the abstract. Fatal: stating that the primary motive is commercial exposure — ErieCanal wrote 'used as part of our commercial offerings' and was rejected 6-0.",
  },
  {
    id: 'benefit-to-landscape',
    label: 'Benefit to CNCF Landscape',
    explanatoryNote:
      "Answer from the ecosystem's perspective, not the project's. What was absent or broken in the CNCF landscape before this project? Name at least two existing CNCF projects that become more complete or more valuable in combination with yours. Do not repeat your 'Why CNCF?' answer — reviewers notice when these two fields are interchangeable.",
  },
  {
    id: 'cloud-native-fit',
    label: 'Cloud Native Fit and Integration',
    explanatoryNote:
      "Name specific CNCF projects and describe the technical relationship for each: data plane / control plane, API consumer, OpenTelemetry emitter, plugin extension, etc. 'Runs on Kubernetes' is the minimum acceptable statement and will be challenged by reviewers. The strongest answers name 4–8 CNCF projects with a one-line architectural relationship each. Leaving this field sparse is the single most common reason reviewers ask for more information in comments.",
  },
  {
    id: 'business-separation',
    label: 'Business / Product Separation',
    explanatoryNote:
      "If a commercial product exists: (1) name it explicitly, (2) explain governance separation (separate roadmap, release cadence, or steering), (3) explain how the commercial product uses the OSS project — ideally through extension points, not as a direct distribution. Reference model: Envoy. Fatal: writing that the commercial and OSS versions have 'the same functionality' — this was a documented factor in the Reloader rejection.",
  },
  {
    id: 'similar-projects',
    label: 'Similar Projects and Overlap',
    explanatoryNote:
      "Name every CNCF project a reviewer could find by searching the landscape for your category. For each, write one sentence explaining the architectural or capability difference. Claiming 'no overlap' when obvious comparators exist damages credibility. If an independent third-party benchmark or security assessment exists, cite it — Cedar Policy's Trail of Bits report was one of the strongest overlap answers in the corpus.",
  },
  {
    id: 'tag-engagement',
    label: 'TAG Domain Technical Review',
    explanatoryNote:
      "Select the TAG matching your project's domain (see the recommended TAG surfaced above). Present at a TAG meeting before the TOC vote — this is treated as a soft prerequisite and has a documented impact on approval rate. Contact the TAG chairs on CNCF Slack to request a slot. All 7 rejected projects in our analysis (github.com/cncf/sandbox, gitvote/failed label) had zero TAG engagement; nearly all approved projects had presented before or during the vote.",
  },
  {
    id: 'cncf-contacts',
    label: 'CNCF Contacts',
    explanatoryNote:
      "Name a specific person in the CNCF ecosystem — a TOC member, TAG lead, or CNCF Ambassador — who knows the project and is willing to facilitate a TAG presentation. A named contact significantly accelerates the review process. If no relationship exists yet, engaging with the relevant TAG (above) before submitting will create one. Projects with zero contacts listed have longer review cycles.",
  },
  {
    id: 'license-exception',
    label: 'License Exception Required?',
    explanatoryNote:
      "If any dependency uses a license not on the CNCF allowlist, answer Yes and list the dependency and license. Proactive disclosure is valued — KAI Scheduler faced a mid-review IP allegation and passed because they responded within days with full transparency. Silence on known IP issues is a rejection risk.",
  },
  {
    id: 'contact-email',
    label: 'Application Contact Email(s)',
    explanatoryNote:
      'Provide at least one email for the primary submitter. This is administrative — it does not affect the vote.',
  },
  {
    id: 'signatory',
    label: 'Signatory Information',
    explanatoryNote:
      'Provide the legal entity name and representative who will sign the CNCF project contribution agreement. This is the organization (company or individual) taking legal responsibility for the IP donation.',
  },
  {
    id: 'trademark-ip',
    label: 'Trademark and IP Policy',
    explanatoryNote:
      "Acknowledge that the project will comply with CNCF's IP policy and trademark guidelines. If the project name includes a trademark (e.g., a database name), note how it is handled — CloudNativePG removed 'PostgreSQL' from its name to avoid trademark issues.",
  },
]
