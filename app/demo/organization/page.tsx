import { AuthProvider } from '@/components/auth/AuthContext'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { DemoOrganizationClient } from '@/components/demo/DemoOrganizationClient'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import type { TwoFactorEnforcementSection } from '@/lib/governance/two-factor'
import type { StaleAdminsSection } from '@/lib/governance/stale-admins'
import orgFixture from '@/fixtures/demo/org-ossf.json'

interface OrgFixture extends OrgInventoryResponse {
  generatedAt: string
  governance: {
    twoFactor: TwoFactorEnforcementSection | null
    staleAdmins: StaleAdminsSection | null
  }
  topReposAnalyzed: AnalysisResult[]
}

export const metadata = {
  title: 'RepoPulse — Demo organization',
  description: 'Pre-analyzed inventory and top-repo rollups for the OpenSSF organization, rendered in the RepoPulse results shell. No sign-in required.',
}

export default function DemoOrganizationPage() {
  const fixture = orgFixture as unknown as OrgFixture
  const { generatedAt, governance, topReposAnalyzed, ...response } = fixture

  return (
    <AuthProvider>
      <DemoBanner generatedAt={generatedAt} />
      <DemoOrganizationClient
        response={response}
        governance={governance}
        topReposAnalyzed={topReposAnalyzed}
      />
    </AuthProvider>
  )
}
