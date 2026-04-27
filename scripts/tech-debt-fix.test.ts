import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted ensures these mocks are initialized before the vi.mock factories run.
const { mockExecSync, mockExistsSync, mockReadFileSync, mockWriteFileSync } = vi.hoisted(() => ({
  mockExecSync: vi.fn().mockReturnValue(''),
  mockExistsSync: vi.fn().mockReturnValue(false),
  mockReadFileSync: vi.fn().mockReturnValue('// source content'),
  mockWriteFileSync: vi.fn(),
}))

vi.mock('child_process', () => ({
  default: { execSync: mockExecSync },
  execSync: mockExecSync,
}))
vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}))

import {
  type Finding,
  openMissingTestsPR,
  openSourceFixPR,
  partitionFindings,
  testFilePath,
} from './tech-debt-fix'

const mockFinding = (overrides: Partial<Finding> = {}): Finding => ({
  id: 'DRY-1',
  category: 'DRY',
  file: 'lib/foo.ts',
  lineStart: 1,
  lineEnd: 10,
  description: 'Duplicated logic',
  severity: 'fix-now',
  confidence: 'high',
  recommendation: 'Extract a shared helper',
  ...overrides,
})

beforeEach(() => {
  // Default stubs: all git/shell commands succeed, source files are readable,
  // test files do not yet exist.
  mockExecSync.mockReset()
  mockExecSync.mockReturnValue('')
  mockExistsSync.mockReset()
  mockExistsSync.mockReturnValue(false)
  mockReadFileSync.mockReset()
  mockReadFileSync.mockReturnValue('// source content')
  mockWriteFileSync.mockReset()
})

// ---------------------------------------------------------------------------
// testFilePath
// ---------------------------------------------------------------------------

describe('testFilePath', () => {
  it('converts a .ts source path to a .test.ts path', () => {
    expect(testFilePath('lib/foo/bar.ts')).toBe('lib/foo/bar.test.ts')
  })

  it('converts a .tsx source path to a .test.ts path', () => {
    expect(testFilePath('app/components/Button.tsx')).toBe('app/components/Button.test.ts')
  })
})

// ---------------------------------------------------------------------------
// partitionFindings
// ---------------------------------------------------------------------------

describe('partitionFindings', () => {
  it('places DRY findings in sourceCandidates', () => {
    const { sourceCandidates, testCandidates } = partitionFindings([mockFinding({ category: 'DRY' })])
    expect(sourceCandidates).toHaveLength(1)
    expect(testCandidates).toHaveLength(0)
  })

  it('places CONSISTENCY and PATTERNS findings in sourceCandidates', () => {
    const findings = [
      mockFinding({ id: 'C-1', category: 'CONSISTENCY' }),
      mockFinding({ id: 'P-1', category: 'PATTERNS' }),
    ]
    const { sourceCandidates } = partitionFindings(findings)
    expect(sourceCandidates).toHaveLength(2)
  })

  it('places MISSING_TESTS findings in testCandidates', () => {
    const { sourceCandidates, testCandidates } = partitionFindings([
      mockFinding({ category: 'MISSING_TESTS' }),
    ])
    expect(sourceCandidates).toHaveLength(0)
    expect(testCandidates).toHaveLength(1)
  })

  it('excludes low-confidence findings from both buckets', () => {
    const { sourceCandidates, testCandidates } = partitionFindings([
      mockFinding({ category: 'DRY', confidence: 'low' }),
      mockFinding({ category: 'MISSING_TESTS', confidence: 'medium' }),
    ])
    expect(sourceCandidates).toHaveLength(0)
    expect(testCandidates).toHaveLength(0)
  })

  it('excludes fix-soon and low-priority findings from both buckets', () => {
    const { sourceCandidates, testCandidates } = partitionFindings([
      mockFinding({ category: 'DRY', severity: 'fix-soon' }),
      mockFinding({ category: 'MISSING_TESTS', severity: 'low-priority' }),
    ])
    expect(sourceCandidates).toHaveLength(0)
    expect(testCandidates).toHaveLength(0)
  })

  it('returns empty buckets for empty input', () => {
    const { sourceCandidates, testCandidates } = partitionFindings([])
    expect(sourceCandidates).toHaveLength(0)
    expect(testCandidates).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// openSourceFixPR — early-return and branch-skip behaviour
// ---------------------------------------------------------------------------

describe('openSourceFixPR', () => {
  it('returns without touching git when sourceCandidates is empty', async () => {
    await openSourceFixPR('pat', [], 'main', '2026-01-01', '')
    expect(mockExecSync).not.toHaveBeenCalled()
  })

  it('skips PR creation and logs when branch already exists on remote', async () => {
    // Default: mockExecSync returns '' → run() does not throw → branch exists path taken
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await openSourceFixPR('pat', [mockFinding()], 'main', '2026-01-01', '42')

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('already exists, skipping'))
    // Only the ls-remote call should have happened before the early return
    expect(mockExecSync.mock.calls.every((c: unknown[]) => String(c[0]).includes('ls-remote'))).toBe(true)
    stderrSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// openMissingTestsPR — early-return, branch-skip, and file-existence behaviour
// ---------------------------------------------------------------------------

describe('openMissingTestsPR', () => {
  it('returns without touching git when testCandidates is empty', async () => {
    await openMissingTestsPR('pat', [], 'main', '2026-01-01', '')
    expect(mockExecSync).not.toHaveBeenCalled()
  })

  it('skips PR creation and logs when branch already exists on remote', async () => {
    // Default: mockExecSync returns '' → run() does not throw → branch exists path taken
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await openMissingTestsPR(
      'pat',
      [mockFinding({ category: 'MISSING_TESTS' })],
      'main',
      '2026-01-01',
      '42',
    )

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('already exists, skipping'))
    stderrSpy.mockRestore()
  })

  it('skips writing a test file and does not open PR when target path already exists', async () => {
    // ls-remote throws → branch does not exist → proceed; file exists → skip writing
    mockExecSync.mockImplementation((cmd: unknown) => {
      if (String(cmd).includes('ls-remote')) throw new Error('ref not found')
      return ''
    })
    mockExistsSync.mockReturnValue(true) // test file already exists

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'import { describe, it, expect } from "vitest"\n' } }],
      }),
    }) as typeof global.fetch

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await openMissingTestsPR(
      'pat',
      [mockFinding({ category: 'MISSING_TESTS', file: 'lib/foo.ts' })],
      'main',
      '2026-01-01',
      '42',
    )

    expect(mockWriteFileSync).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'))
    stderrSpy.mockRestore()
  })
})
