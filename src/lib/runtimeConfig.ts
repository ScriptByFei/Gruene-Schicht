export const runtimeConfig = {
  appEnvironment: import.meta.env.VITE_APP_ENV ?? 'local',
  registrationEnabled: import.meta.env.VITE_REGISTRATION_ENABLED === 'true',
  legalOperatorName: (import.meta.env.VITE_LEGAL_OPERATOR_NAME ?? '').trim(),
  legalContactEmail: (import.meta.env.VITE_LEGAL_CONTACT_EMAIL ?? '').trim(),
}

export const legalNoticeComplete = Boolean(
  runtimeConfig.legalOperatorName && runtimeConfig.legalContactEmail
)
