import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateIntuneCredentials, syncIntuneDevices } from '../intune'
import type { IntuneConfig } from '../intune'

const config: IntuneConfig = {
  tenantId: 'test-tenant',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  syncFrequency: '15 minutes',
  enabledFeatures: ['Device inventory sync'],
}

describe('Intune integration utility', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('validateIntuneCredentials resolves ok after delay', async () => {
    const promise = validateIntuneCredentials(config)
    vi.advanceTimersByTime(1800)
    const result = await promise
    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('syncIntuneDevices returns an array of assets', async () => {
    const promise = syncIntuneDevices('intg-1')
    vi.advanceTimersByTime(2200)
    const assets = await promise

    expect(Array.isArray(assets)).toBe(true)
    expect(assets.length).toBeGreaterThan(0)

    const first = assets[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('serial')
    expect(first.detectionSource).toBe('Microsoft Intune')
  })

  it('each synced asset id is prefixed with the integration id', async () => {
    const promise = syncIntuneDevices('intg-abc')
    vi.advanceTimersByTime(2200)
    const assets = await promise

    assets.forEach((a) => {
      expect(a.id).toMatch(/^intg-abc-/)
    })
  })

  it('synced assets have required fields', async () => {
    const promise = syncIntuneDevices('intg-1')
    vi.advanceTimersByTime(2200)
    const assets = await promise

    for (const asset of assets) {
      expect(asset.status).toBe('Deployed')
      expect(asset.currency).toBe('USD')
      expect(asset.tag).toBeTruthy()
    }
  })
})
