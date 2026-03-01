import React, { useState } from 'react'
import { saveAWSConfig, getAWSConfig, clearAWSConfig } from '../config/aws.js'
import { healthCheck } from '../services/api.js'

const EyeIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const LockIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)

const REGIONS = [
  'ap-south-1', 'us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'
]

export default function TokenConfig({ onConfigured, onClose }) {
  const existing = getAWSConfig()
  const [form, setForm] = useState({
    region: existing.region || 'ap-south-1',
    accessKeyId: existing.accessKeyId || '',
    secretAccessKey: existing.secretAccessKey || '',
    sessionToken: existing.sessionToken || '',
    apiGatewayUrl: existing.apiGatewayUrl || '',
    s3Bucket: existing.s3Bucket || '',
    userPoolId: existing.userPoolId || '',
    userPoolClientId: existing.userPoolClientId || '',
  })
  const [showSecret, setShowSecret] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [activeTab, setActiveTab] = useState('credentials')

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    saveAWSConfig(form)
    onConfigured && onConfigured(form)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    saveAWSConfig(form)
    const result = await healthCheck()
    setTesting(false)
    setTestResult(result)
  }

  const handleClear = () => {
    clearAWSConfig()
    setForm({ region: 'ap-south-1', accessKeyId: '', secretAccessKey: '', sessionToken: '', apiGatewayUrl: '', s3Bucket: '', userPoolId: '', userPoolClientId: '' })
    setTestResult(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,5,8,0.92)', backdropFilter: 'blur(12px)' }}>
      <div className="panel w-full max-w-2xl animate-in" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)' }}>
                <LockIcon />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-white">AWS Configuration</h2>
                <p className="text-xs" style={{ color: 'var(--ghost)' }}>Connect your AWS account to power AI features</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl">×</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5" style={{ background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
            {['credentials', 'endpoints', 'cognito'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 px-3 rounded-md text-xs font-mono font-medium transition-all capitalize"
                style={{
                  background: activeTab === tab ? 'var(--panel)' : 'transparent',
                  color: activeTab === tab ? 'var(--neon)' : 'var(--ghost)',
                  border: activeTab === tab ? '1px solid var(--border)' : '1px solid transparent',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {activeTab === 'credentials' && (
            <>
              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>AWS_REGION</label>
                <select
                  value={form.region}
                  onChange={e => update('region', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono text-white outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                >
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>AWS_ACCESS_KEY_ID</label>
                <input
                  type="text"
                  value={form.accessKeyId}
                  onChange={e => update('accessKeyId', e.target.value)}
                  placeholder="AKIA..."
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                />
              </div>

              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>AWS_SECRET_ACCESS_KEY</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={form.secretAccessKey}
                    onChange={e => update('secretAccessKey', e.target.value)}
                    placeholder="Your secret access key"
                    className="w-full px-4 py-3 pr-12 rounded-lg text-sm font-mono outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                    style={{ color: 'var(--ghost)' }}
                  >
                    <EyeIcon />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>
                  AWS_SESSION_TOKEN <span className="opacity-50">(optional — for temporary credentials / STS)</span>
                </label>
                <input
                  type="password"
                  value={form.sessionToken}
                  onChange={e => update('sessionToken', e.target.value)}
                  placeholder="Paste STS session token if using temporary credentials"
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                />
              </div>

              <div className="rounded-lg p-3 flex gap-2 text-xs" style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.2)', color: '#ff9966' }}>
                <span>⚠️</span>
                <span>Never share these credentials. For a hackathon, use an IAM user with limited permissions. Credentials are stored in localStorage — use env vars in production.</span>
              </div>
            </>
          )}

          {activeTab === 'endpoints' && (
            <>
              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>API_GATEWAY_URL</label>
                <input
                  type="text"
                  value={form.apiGatewayUrl}
                  onChange={e => update('apiGatewayUrl', e.target.value)}
                  placeholder="https://xxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod"
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--ghost)' }}>Found in API Gateway console → Stages → Invoke URL</p>
              </div>

              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>S3_BUCKET_NAME</label>
                <input
                  type="text"
                  value={form.s3Bucket}
                  onChange={e => update('s3Bucket', e.target.value)}
                  placeholder="contentforge-uploads-xxxx"
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                />
              </div>
            </>
          )}

          {activeTab === 'cognito' && (
            <>
              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>COGNITO_USER_POOL_ID</label>
                <input
                  type="text"
                  value={form.userPoolId}
                  onChange={e => update('userPoolId', e.target.value)}
                  placeholder="ap-south-1_XXXXXXXXX"
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                />
              </div>
              <div>
                <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>COGNITO_CLIENT_ID</label>
                <input
                  type="text"
                  value={form.userPoolClientId}
                  onChange={e => update('userPoolClientId', e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                />
              </div>
              <div className="rounded-lg p-4 text-sm" style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', color: 'var(--ghost)' }}>
                <p className="font-mono text-xs mb-2" style={{ color: 'var(--neon)' }}>HOW COGNITO WORKS IN THIS APP</p>
                <p>Cognito handles user auth → issues JWT tokens → used to authorize API Gateway calls via Cognito Authorizer. STS provides temporary credentials for direct S3 uploads from the browser.</p>
              </div>
            </>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`rounded-lg p-3 text-xs font-mono ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}
              style={{ background: testResult.ok ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${testResult.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
              {testResult.ok ? '✅ Connection successful! API Gateway is responding.' : `❌ ${testResult.error}`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
          <button onClick={handleClear} className="text-xs font-mono opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--ghost)' }}>
            Clear saved config
          </button>
          <div className="flex gap-3">
            <button onClick={handleTest} disabled={testing} className="btn-neon text-xs">
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button onClick={handleSave} className="btn-fire text-xs">
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
