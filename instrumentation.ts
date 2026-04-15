export async function register() {
  const { assertDevPatNotInProduction } = await import('@/lib/auth/dev-pat')
  assertDevPatNotInProduction()

  if (process.env.NODE_ENV === 'development') {
    const { installLogger } = await import('@/lib/debug/logger')
    installLogger()
  }
}
