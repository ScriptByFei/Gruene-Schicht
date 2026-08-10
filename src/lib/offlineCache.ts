const CACHE_PREFIX = 'gruene-schicht:v1'
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000

interface CacheEnvelope<T> {
  savedAt: string
  value: T
}

function storageKey(userId: string, key: string) {
  return `${CACHE_PREFIX}:${userId}:${key}`
}

export function writeOfflineCache<T>(userId: string, key: string, value: T): void {
  try {
    const envelope: CacheEnvelope<T> = {
      savedAt: new Date().toISOString(),
      value,
    }
    window.localStorage.setItem(storageKey(userId, key), JSON.stringify(envelope))
  } catch {
    // Offline storage can be disabled or full. The online app must still work.
  }
}

export function readOfflineCache<T>(userId: string, key: string): T | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId, key))
    if (!raw) return null

    const envelope = JSON.parse(raw) as CacheEnvelope<T>
    const savedAt = Date.parse(envelope.savedAt)
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_CACHE_AGE_MS) {
      window.localStorage.removeItem(storageKey(userId, key))
      return null
    }
    return envelope.value
  } catch {
    return null
  }
}

export function clearOfflineCache(userId: string): void {
  try {
    const prefix = `${CACHE_PREFIX}:${userId}:`
    const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
      window.localStorage.key(index)
    )
    keys.forEach((key) => {
      if (key?.startsWith(prefix)) window.localStorage.removeItem(key)
    })
  } catch {
    // Logging out must succeed even if storage is unavailable.
  }
}
