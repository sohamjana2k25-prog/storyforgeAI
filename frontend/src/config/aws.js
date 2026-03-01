// AWS Configuration - loaded from localStorage or env vars
// All tokens are stored client-side in localStorage for demo purposes
// In production, use Cognito auth flow

const CONFIG_KEY = 'contentforge_aws_config'

export const getAWSConfig = () => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  
  return {
    region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
    sessionToken: import.meta.env.VITE_AWS_SESSION_TOKEN || '',
    apiGatewayUrl: import.meta.env.VITE_API_GATEWAY_URL || '',
    s3Bucket: import.meta.env.VITE_S3_BUCKET || '',
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  }
}

export const saveAWSConfig = (config) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  // Reload so environment is fresh
  window.__awsConfig = config
}

export const clearAWSConfig = () => {
  localStorage.removeItem(CONFIG_KEY)
  window.__awsConfig = null
}

export const isConfigured = () => {
  const cfg = getAWSConfig()
  return !!(cfg.accessKeyId && cfg.secretAccessKey && cfg.apiGatewayUrl)
}

export const getAuthHeaders = () => {
  const cfg = getAWSConfig()
  return {
    'x-aws-access-key': cfg.accessKeyId,
    'x-aws-secret-key': cfg.secretAccessKey,
    'x-aws-session-token': cfg.sessionToken,
    'x-aws-region': cfg.region,
    'Content-Type': 'application/json',
  }
}

export default getAWSConfig
