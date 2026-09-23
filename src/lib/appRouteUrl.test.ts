import { describe, expect, it } from 'vitest'
import { appRouteUrl } from './appRouteUrl'

describe('appRouteUrl', () => {
  it('uses ordinary paths during local development', () => {
    expect(appRouteUrl('/dashboard', '/')).toBe('/dashboard')
  })

  it('keeps GitHub Pages navigation on the project root', () => {
    expect(appRouteUrl('/dashboard', '/Gruene-Schicht/')).toBe('/Gruene-Schicht/#/dashboard')
    expect(appRouteUrl('/admin', '/Gruene-Schicht/')).toBe('/Gruene-Schicht/#/admin')
  })
})
