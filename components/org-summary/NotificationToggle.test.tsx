import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { NotificationToggle } from './NotificationToggle'

describe('NotificationToggle', () => {
  const originalNotification = globalThis.Notification

  afterEach(() => {
    Object.defineProperty(globalThis, 'Notification', { value: originalNotification, writable: true, configurable: true })
  })

  function mockNotification(permission: string, requestPermission?: () => Promise<string>) {
    const mock = vi.fn() as unknown as typeof Notification
    Object.defineProperty(mock, 'permission', { value: permission, configurable: true })
    if (requestPermission) {
      ;(mock as { requestPermission: () => Promise<string> }).requestPermission = requestPermission
    }
    Object.defineProperty(globalThis, 'Notification', { value: mock, writable: true, configurable: true })
  }

  it('renders a checkbox defaulting to off', () => {
    mockNotification('default')
    render(<NotificationToggle enabled={false} onChange={vi.fn()} />)
    const cb = screen.getByLabelText(/completion notification/i) as HTMLInputElement
    expect(cb.checked).toBe(false)
  })

  it('shows checked when enabled', () => {
    mockNotification('granted')
    render(<NotificationToggle enabled={true} onChange={vi.fn()} />)
    const cb = screen.getByLabelText(/completion notification/i) as HTMLInputElement
    expect(cb.checked).toBe(true)
  })

  it('calls onChange(false) when toggling off', () => {
    mockNotification('granted')
    const onChange = vi.fn()
    render(<NotificationToggle enabled={true} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/completion notification/i))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('requests permission and enables when granted', async () => {
    mockNotification('default', () => Promise.resolve('granted'))
    const onChange = vi.fn()
    render(<NotificationToggle enabled={false} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/completion notification/i))
    await vi.waitFor(() => { expect(onChange).toHaveBeenCalledWith(true) })
  })

  it('shows denied state without re-prompting', () => {
    mockNotification('denied')
    const onChange = vi.fn()
    render(<NotificationToggle enabled={false} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/completion notification/i))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('(blocked)')).toBeInTheDocument()
  })
})
