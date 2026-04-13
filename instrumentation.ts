export async function register() {
  if (process.env.NODE_ENV === 'development') {
    const { installLogger } = await import('@/lib/debug/logger')
    installLogger()
  }
}
