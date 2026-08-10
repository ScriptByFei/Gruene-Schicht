import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearOfflineCache, readOfflineCache, writeOfflineCache } from './offlineCache'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('offline cache', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createMemoryStorage() })
  })

  it('keeps cached data separated by user', () => {
    writeOfflineCache('user-a', 'calendar', { year: 2026 })

    expect(readOfflineCache('user-a', 'calendar')).toEqual({ year: 2026 })
    expect(readOfflineCache('user-b', 'calendar')).toBeNull()
  })

  it('clears only the selected user cache', () => {
    writeOfflineCache('user-a', 'identity', 'A')
    writeOfflineCache('user-b', 'identity', 'B')

    clearOfflineCache('user-a')

    expect(readOfflineCache('user-a', 'identity')).toBeNull()
    expect(readOfflineCache('user-b', 'identity')).toBe('B')
  })

  it('ignores malformed storage values', () => {
    window.localStorage.setItem('gruene-schicht:v1:user-a:identity', '{broken')
    expect(readOfflineCache('user-a', 'identity')).toBeNull()
  })
})
