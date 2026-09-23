import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateBetaEnvironment } from './check-beta-readiness.mjs'

const valid = {
  VITE_APP_ENV: 'beta',
  VITE_NEON_AUTH_URL: 'https://ep-example.neonauth.c-5.eu-central-1.aws.neon.tech/neondb/auth',
  VITE_NEON_DATA_API_URL: 'https://ep-example.apirest.c-5.eu-central-1.aws.neon.tech/neondb/rest/v1',
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
    VITE_NEON_DATABASE_SECRET: 'postgresql://secret',
  })
  assert.equal(errors.length, 2)
})

test('blocks localhost and incomplete legal details', () => {
  const errors = validateBetaEnvironment({
    ...valid,
    VITE_NEON_AUTH_URL: 'http://127.0.0.1:54321',
    VITE_LEGAL_OPERATOR_NAME: 'TODO',
  })
  assert.equal(errors.length, 2)
})
