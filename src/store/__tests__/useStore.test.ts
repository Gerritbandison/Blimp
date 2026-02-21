import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useStore } from '../useStore'

// Reset Zustand store state before each test
beforeEach(() => {
  useStore.setState({
    assets: [],
    apps: [],
    people: [],
    activityLog: [],
    notifications: [],
    toasts: [],
    currentUserName: 'Test User',
    currentUserRole: 'Admin',
  })
})

describe('useStore — asset actions', () => {
  it('addAsset adds an asset to the list', () => {
    const { result } = renderHook(() => useStore())
    const asset = {
      id: 'a1', tag: 'BL-001', name: 'Test Laptop', type: 'Laptop' as const,
      make: 'Dell', model: 'XPS 15', serial: 'SN001', status: 'In Stock' as const,
      location: 'London', purchaseDate: '2024-01-01', warrantyExpiry: '2027-01-01',
      cost: 1500, currency: 'USD',
    }
    act(() => { result.current.addAsset(asset) })
    expect(result.current.assets).toHaveLength(1)
    expect(result.current.assets[0].id).toBe('a1')
  })

  it('deleteAsset removes an asset by id', () => {
    const asset = {
      id: 'a2', tag: 'BL-002', name: 'Delete Me', type: 'Laptop' as const,
      make: 'HP', model: 'EliteBook', serial: 'SN002', status: 'In Stock' as const,
      location: 'London', purchaseDate: '2024-01-01', warrantyExpiry: '2027-01-01',
      cost: 1200, currency: 'USD',
    }
    useStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useStore())
    act(() => { result.current.deleteAsset('a2') })
    expect(result.current.assets).toHaveLength(0)
  })

  it('updateAsset patches only the specified fields', () => {
    const asset = {
      id: 'a3', tag: 'BL-003', name: 'Original Name', type: 'Laptop' as const,
      make: 'Apple', model: 'MBP', serial: 'SN003', status: 'In Stock' as const,
      location: 'London', purchaseDate: '2024-01-01', warrantyExpiry: '2027-01-01',
      cost: 2000, currency: 'USD',
    }
    useStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useStore())
    act(() => { result.current.updateAsset('a3', { name: 'Updated Name', status: 'Deployed' }) })
    expect(result.current.assets[0].name).toBe('Updated Name')
    expect(result.current.assets[0].status).toBe('Deployed')
    expect(result.current.assets[0].make).toBe('Apple') // unchanged
  })
})

describe('useStore — activity log', () => {
  it('addActivity uses currentUserName by default', () => {
    useStore.setState({ activityLog: [], currentUserName: 'Alice Admin' })
    const { result } = renderHook(() => useStore())
    act(() => {
      result.current.addActivity({ action: 'Test Action', module: 'Assets' })
    })
    const [entry] = result.current.activityLog
    expect(entry.user).toBe('Alice Admin')
    expect(entry.action).toBe('Test Action')
  })

  it('addActivity respects explicit user override', () => {
    useStore.setState({ activityLog: [], currentUserName: 'Alice Admin' })
    const { result } = renderHook(() => useStore())
    act(() => {
      result.current.addActivity({ action: 'System Import', user: 'System', module: 'Assets' })
    })
    expect(result.current.activityLog[0].user).toBe('System')
  })

  it('caps activityLog at 500 entries', () => {
    const existing = Array.from({ length: 500 }, (_, i) => ({
      id: `e${i}`, timestamp: new Date().toISOString(), action: 'Old', user: 'Bot',
    }))
    useStore.setState({ activityLog: existing })

    const { result } = renderHook(() => useStore())
    act(() => { result.current.addActivity({ action: 'New Entry' }) })
    expect(result.current.activityLog).toHaveLength(500)
    expect(result.current.activityLog[0].action).toBe('New Entry')
  })
})

describe('useStore — identity', () => {
  it('setCurrentUserName updates the stored name', () => {
    const { result } = renderHook(() => useStore())
    act(() => { result.current.setCurrentUserName('Bob Finance') })
    expect(result.current.currentUserName).toBe('Bob Finance')
  })

  it('setCurrentUserRole updates the stored role', () => {
    const { result } = renderHook(() => useStore())
    act(() => { result.current.setCurrentUserRole('Finance') })
    expect(result.current.currentUserRole).toBe('Finance')
  })
})

describe('useStore — toasts', () => {
  it('addToast adds a message', () => {
    const { result } = renderHook(() => useStore())
    act(() => { result.current.addToast({ type: 'success', message: 'Done!' }) })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Done!')
  })

  it('removeToast removes by id', () => {
    const { result } = renderHook(() => useStore())
    act(() => { result.current.addToast({ type: 'info', message: 'Hello' }) })
    const id = result.current.toasts[0].id
    act(() => { result.current.removeToast(id) })
    expect(result.current.toasts).toHaveLength(0)
  })
})
