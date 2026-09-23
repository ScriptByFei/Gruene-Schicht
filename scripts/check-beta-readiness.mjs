import { readFileSync } from 'node:fs'

function parseEnv(contents) {
  return Object.fromEntries(contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
    }))
}

export function validateBetaEnvironment(values) {
  const errors = []
  const required = [
    'VITE_NEON_AUTH_URL',
    'VITE_NEON_DATA_API_URL',
    'VITE_APP_ENV',
    'VITE_REGISTRATION_ENABLED',
    'VITE_LEGAL_OPERATOR_NAME',
    'VITE_LEGAL_CONTACT_EMAIL',
  ]

  for (const key of required) {
    if (!values[key]) errors.push(`${key} fehlt.`)
  }
  if (values.VITE_APP_ENV && values.VITE_APP_ENV !== 'beta') {
    errors.push('VITE_APP_ENV muss für die Beta "beta" sein.')
  }
  if (values.VITE_REGISTRATION_ENABLED && values.VITE_REGISTRATION_ENABLED !== 'false') {
    errors.push('Die geschlossene Beta muss mit deaktivierter Registrierung starten.')
  }
  if (values.VITE_NEON_AUTH_URL && !/^https:\/\/[^/]+\.neonauth\.[^/]+\.(?:aws|azure)\.neon\.tech\/[^/?#]+\/auth$/.test(values.VITE_NEON_AUTH_URL)) {
    errors.push('VITE_NEON_AUTH_URL muss auf den Managed-Better-Auth-Endpunkt zeigen.')
  }
  if (values.VITE_NEON_DATA_API_URL && !/^https:\/\/[^/]+\.apirest\.[^/]+\.(?:aws|azure)\.neon\.tech\/[^/?#]+\/rest\/v1$/.test(values.VITE_NEON_DATA_API_URL)) {
    errors.push('VITE_NEON_DATA_API_URL muss auf den Neon-Data-API-Endpunkt zeigen.')
  }
  if (values.VITE_LEGAL_OPERATOR_NAME && /your legal|platzhalter|todo/i.test(values.VITE_LEGAL_OPERATOR_NAME)) {
    errors.push('Der rechtlich Verantwortliche ist noch ein Platzhalter.')
  }
  if (values.VITE_LEGAL_CONTACT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.VITE_LEGAL_CONTACT_EMAIL)) {
    errors.push('Der Datenschutzkontakt ist keine gültige E-Mail-Adresse.')
  }
  for (const key of Object.keys(values)) {
    if (key.startsWith('VITE_') && /SERVICE_ROLE|SECRET/.test(key)) {
      errors.push(`${key} wäre im Browser öffentlich und ist deshalb verboten.`)
    }
  }
  return errors
}

function main() {
  const envPath = process.argv[2]
  if (!envPath) {
    console.error('Aufruf: npm run beta:check -- <pfad-zur-beta-env>')
    process.exitCode = 1
    return
  }
  const values = { ...process.env, ...parseEnv(readFileSync(envPath, 'utf8')) }
  const errors = validateBetaEnvironment(values)
  if (errors.length) {
    console.error(`Beta-Freigabe blockiert:\n- ${errors.join('\n- ')}`)
    process.exitCode = 1
    return
  }
  console.log('Beta-Umgebung ist technisch freigabebereit. Eine Veröffentlichung erfolgt weiterhin nur bewusst manuell.')
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main()
