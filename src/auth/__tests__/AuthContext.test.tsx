import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../AuthContext'

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

// Each test needs room for the 400ms simulated login delay
const TIMEOUT = 3000

describe('AuthContext', () => {
  beforeEach(() => { localStorage.clear() })

  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('logs in with valid demo credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    let res: Awaited<ReturnType<typeof result.current.login>> = { ok: false }
    await act(async () => { res = await result.current.login('admin@blimp.io', 'admin123') })
    expect(res.ok).toBe(true)
    expect(res.user?.role).toBe('Admin')
    expect(result.current.isAuthenticated).toBe(true)
  }, TIMEOUT)

  it('rejects invalid password', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    let res: Awaited<ReturnType<typeof result.current.login>> = { ok: true }
    await act(async () => { res = await result.current.login('admin@blimp.io', 'wrongpass') })
    expect(res.ok).toBe(false)
    expect(res.error).toBeTruthy()
    expect(result.current.isAuthenticated).toBe(false)
  }, TIMEOUT)

  it('rejects unknown email', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    let res: Awaited<ReturnType<typeof result.current.login>> = { ok: true }
    await act(async () => { res = await result.current.login('nobody@example.com', 'pass') })
    expect(res.ok).toBe(false)
  }, TIMEOUT)

  it('logs out correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => { await result.current.login('admin@blimp.io', 'admin123') })
    act(() => { result.current.logout() })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('blimp-auth')).toBeNull()
  }, TIMEOUT)

  it('persists session to localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => { await result.current.login('finance@blimp.io', 'finance123') })
    const stored = localStorage.getItem('blimp-auth')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!) as { isAuthenticated: boolean; user: { role: string } }
    expect(parsed.isAuthenticated).toBe(true)
    expect(parsed.user.role).toBe('Finance')
  }, TIMEOUT)

  it('email matching is case-insensitive', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    let res: Awaited<ReturnType<typeof result.current.login>> = { ok: false }
    await act(async () => { res = await result.current.login('ADMIN@BLIMP.IO', 'admin123') })
    expect(res.ok).toBe(true)
  }, TIMEOUT)

  it('locks account after 5 failed attempts', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    for (let i = 0; i < 5; i++) {
      await act(async () => { await result.current.login('admin@blimp.io', 'wrong') })
    }
    let res: Awaited<ReturnType<typeof result.current.login>> = { ok: true }
    await act(async () => { res = await result.current.login('admin@blimp.io', 'admin123') })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/too many|locked/i)
  }, 12000)
})
