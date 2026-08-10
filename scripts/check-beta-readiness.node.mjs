import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateBetaEnvironment } from './check-beta-readiness.mjs'

const valid = {
  VITE_APP_ENV: 'beta',
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  VITE_REGISTRATION_ENABLED: 'false',
  VITE_LEGAL_OPERATOR_NAME: 'Beispiel Betrieb GmbH',
  VITE_LEGAL_CONTACT_EMAIL: 'datenschutz@example.de',
}

test('accepts a closed beta without frontend secrets', () => {
  assert.deepEqual(validateBetaEnvironment(valid), [])
})

test('blocks public signup and frontend service keys', () => {
  const errors = validateBetaEnvironment({
    ...valid,
    VITE_REGISTRATION_ENABLED: 'true',
    VITE_SUPABASE_SERVICE_ROLE_KEY: 'secret',
  })
  assert.equal(errors.length, 2)
})

test('blocks localhost and incomplete legal details', () => {
  const errors = validateBetaEnvironment({
    ...valid,
    VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
    VITE_LEGAL_OPERATOR_NAME: 'TODO',
  })
  assert.equal(errors.length, 2)
})
