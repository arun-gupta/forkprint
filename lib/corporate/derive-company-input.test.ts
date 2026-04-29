import { describe, expect, it } from 'vitest'
import { deriveCompanyInput } from './derive-company-input'

describe('deriveCompanyInput', () => {
  it('derives orgHandle and .com emailDomain from a name-only input', () => {
    expect(deriveCompanyInput('microsoft')).toEqual({
      companyName: 'microsoft',
      orgHandle: 'microsoft',
      emailDomain: 'microsoft.com',
    })
  })

  it('strips .com suffix for orgHandle and preserves emailDomain as-is', () => {
    expect(deriveCompanyInput('microsoft.com')).toEqual({
      companyName: 'microsoft.com',
      orgHandle: 'microsoft',
      emailDomain: 'microsoft.com',
    })
  })

  it('strips .io suffix for orgHandle and preserves emailDomain', () => {
    expect(deriveCompanyInput('hashicorp.io')).toEqual({
      companyName: 'hashicorp.io',
      orgHandle: 'hashicorp',
      emailDomain: 'hashicorp.io',
    })
  })

  it('strips .org suffix for orgHandle and preserves emailDomain', () => {
    expect(deriveCompanyInput('redhat.org')).toEqual({
      companyName: 'redhat.org',
      orgHandle: 'redhat',
      emailDomain: 'redhat.org',
    })
  })

  it('strips .net suffix for orgHandle and preserves emailDomain', () => {
    expect(deriveCompanyInput('netapp.net')).toEqual({
      companyName: 'netapp.net',
      orgHandle: 'netapp',
      emailDomain: 'netapp.net',
    })
  })

  it('strips .dev suffix for orgHandle and preserves emailDomain', () => {
    expect(deriveCompanyInput('gitpod.dev')).toEqual({
      companyName: 'gitpod.dev',
      orgHandle: 'gitpod',
      emailDomain: 'gitpod.dev',
    })
  })

  it('normalises input to lowercase before derivation', () => {
    expect(deriveCompanyInput('Microsoft')).toEqual({
      companyName: 'Microsoft',
      orgHandle: 'microsoft',
      emailDomain: 'microsoft.com',
    })
    expect(deriveCompanyInput('MICROSOFT')).toEqual({
      companyName: 'MICROSOFT',
      orgHandle: 'microsoft',
      emailDomain: 'microsoft.com',
    })
  })

  it('trims leading and trailing whitespace before derivation', () => {
    expect(deriveCompanyInput('  microsoft  ')).toEqual({
      companyName: '  microsoft  ',
      orgHandle: 'microsoft',
      emailDomain: 'microsoft.com',
    })
  })

  it('preserves an input that contains a dot but is not a known TLD suffix', () => {
    expect(deriveCompanyInput('awslabs.something')).toEqual({
      companyName: 'awslabs.something',
      orgHandle: 'awslabs.something',
      emailDomain: 'awslabs.something',
    })
  })

  it('appends .com for inputs with no dot (not a known domain)', () => {
    expect(deriveCompanyInput('awslabs')).toEqual({
      companyName: 'awslabs',
      orgHandle: 'awslabs',
      emailDomain: 'awslabs.com',
    })
  })
})
