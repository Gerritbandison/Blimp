import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateNinjaOneCredentials, syncNinjaOneDevices } from '../ninjaone'
import type { NinjaOneConfig } from '../ninjaone'

const config: NinjaOneConfig = {
  instanceUrl: 'app.ninjarmm.com',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  syncFrequency: '15 minutes',
  enabledFeatures: ['Endpoint inventory sync'],
}

describe('NinjaOne integration utility', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('validateNinjaOneCredentials resolves ok', async () => {
    const promise = validateNinjaOneCredentials(config)
    vi.advanceTimersByTime(1500)
    const result = await promise
    expect(result.ok).toBe(true)
  })

  it('syncNinjaOneDevices returns an array of assets', async () => {
    const promise = syncNinjaOneDevices('intg-ninja')
    vi.advanceTimersByTime(2000)
    const assets = await promise

    expect(Array.isArray(assets)).toBe(true)
    expect(assets.length).toBeGreaterThan(0)
  })

  it('synced assets have correct detectionSource', async () => {
    const promise = syncNinjaOneDevices('intg-ninja')
    vi.advanceTimersByTime(2000)
    const assets = await promise

    assets.forEach((a) => {
      expect(a.detectionSource).toBe('NinjaOne')
    })
  })

  it('synced asset ids are prefixed with integration id', async () => {
    const promise = syncNinjaOneDevices('intg-xyz')
    vi.advanceTimersByTime(2000)
    const assets = await promise

    assets.forEach((a) => {
      expect(a.id).toMatch(/^intg-xyz-ninja-/)
    })
  })
})
