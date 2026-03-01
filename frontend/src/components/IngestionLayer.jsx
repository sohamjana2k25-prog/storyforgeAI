import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { ingestURL, ingestYoutube, uploadFileToS3, ingestPDF, analyzeContent, MOCK } from '../services/api.js'
import { isConfigured } from '../config/aws.js'

const FileIcon = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const LinkIcon = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
)
const YoutubeIcon = () => (
  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.64 12.64 0 00-8.64 0A4.83 4.83 0 013.41 6.69C2 9.12 2 12 2 12s0 2.88 1.41 5.31a4.83 4.83 0 003.77 2.75 12.64 12.64 0 008.64 0 4.83 4.83 0 003.77-2.75C22 14.88 22 12 22 12s0-2.88-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
  </svg>
)

const AUDIENCE_OPTIONS = ['General Public', 'Gen Z', 'Corporate / B2B', 'Students', 'Tech Enthusiasts', 'Small Business Owners', 'Healthcare', 'Finance Pros']
const TONE_OPTIONS = ['Sarcastic', 'Factual', 'Humorous', 'Critical', 'Inspirational', 'Educational', 'Casual', 'Formal']

export default function IngestionLayer({ onComplete }) {
  const [inputType, setInputType] = useState('url') // url | pdf | youtube
  const [urlInput, setUrlInput] = useState('')
  const [audience, setAudience] = useState([])
  const [tone, setTone] = useState([])
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError] = useState('')
  const [useMock] = useState(!isConfigured())

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) setUploadedFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  const toggleAudience = (a) => setAudience(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  const toggleTone = (t) => setTone(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleProcess = async () => {
    setLoading(true)
    setError('')
    
    try {
      if (useMock) {
        // Demo mode without real AWS
        setLoadingStep('Extracting content...')
        await new Promise(r => setTimeout(r, 1200))
        setLoadingStep('Running Amazon Comprehend analysis...')
        await new Promise(r => setTimeout(r, 1000))
        setLoadingStep('Generating insights with Amazon Bedrock...')
        await new Promise(r => setTimeout(r, 1400))
        
        onComplete({
          rawText: 'Sample extracted content about AI and the future of work...',
          analysis: MOCK.analysis,
          inputType,
          source: urlInput || uploadedFile?.name || 'youtube',
          audience,
          tone,
        })
        return
      }

      let extractedText = ''
      
      if (inputType === 'url') {
        setLoadingStep('Fetching URL content...')
        const res = await ingestURL(urlInput)
        extractedText = res.text
      } else if (inputType === 'pdf') {
        setLoadingStep('Uploading PDF to S3...')
        const s3Key = await uploadFileToS3(uploadedFile, setUploadProgress)
        setLoadingStep('Extracting text with Amazon Textract...')
        const res = await ingestPDF(s3Key)
        extractedText = res.text
      } else if (inputType === 'youtube') {
        setLoadingStep('Transcribing with Amazon Transcribe...')
        const res = await ingestYoutube(urlInput)
        extractedText = res.text
      }

      setLoadingStep('Analyzing with Amazon Comprehend + Bedrock...')
      const analysis = await analyzeContent(extractedText, { targetAudience: audience.join(','), tone: tone.join(',') })

      onComplete({ rawText: extractedText, analysis, inputType, source: urlInput || uploadedFile?.name, audience, tone })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Processing failed. Check your AWS config.')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  const canProcess = (inputType !== 'pdf' ? urlInput.trim() : uploadedFile) && audience.length > 0

  return (
    <div className="animate-in">
      <div className="mb-8">
        <div className="tag tag-neon mb-4">STEP 01 — INGESTION LAYER</div>
        <h2 className="text-3xl font-display font-bold text-white mb-2">Feed the machine</h2>
        <p style={{ color: 'var(--ghost)' }}>Drop your content source. Our AI will extract, analyze, and understand it.</p>
      </div>

      {useMock && (
        <div className="mb-6 rounded-lg p-3 flex gap-2 text-xs" style={{ background: 'rgba(184,255,87,0.06)', border: '1px solid rgba(184,255,87,0.3)', color: 'var(--acid)' }}>
          <span>⚡</span>
          <span>Demo mode active — configure AWS tokens for real processing. All pipelines will use mock data.</span>
        </div>
      )}

      {/* Input Type Selector */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { id: 'url', icon: <LinkIcon />, label: 'Blog URL', sub: 'Any article or webpage' },
          { id: 'pdf', icon: <FileIcon />, label: 'PDF Upload', sub: 'Research papers, docs' },
          { id: 'youtube', icon: <YoutubeIcon />, label: 'YouTube', sub: 'Video transcript' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => { setInputType(opt.id); setUrlInput(''); setUploadedFile(null) }}
            className="panel panel-hover p-4 text-left transition-all"
            style={{
              borderColor: inputType === opt.id ? 'var(--neon)' : 'var(--border)',
              background: inputType === opt.id ? 'rgba(0,229,255,0.05)' : 'var(--panel)',
            }}
          >
            <div className="mb-3" style={{ color: inputType === opt.id ? 'var(--neon)' : 'var(--ghost)' }}>{opt.icon}</div>
            <div className="font-display font-semibold text-sm text-white">{opt.label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>{opt.sub}</div>
          </button>
        ))}
      </div>

      {/* Input Area */}
      {inputType === 'pdf' ? (
        <div {...getRootProps()} className={`upload-zone p-10 text-center mb-6 ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          {uploadedFile ? (
            <div>
              <div className="text-4xl mb-3">📄</div>
              <p className="font-display text-white font-semibold">{uploadedFile.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ghost)' }}>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: 'var(--neon)' }} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">📁</div>
              <p className="font-display text-white font-semibold">{isDragActive ? 'Drop it!' : 'Drag & drop your PDF'}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ghost)' }}>or click to browse — max 10MB</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6">
          <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>
            {inputType === 'youtube' ? 'YOUTUBE_URL' : 'BLOG_URL'}
          </label>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder={inputType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://yourcompany.com/blog/post...'}
            className="w-full px-4 py-3 rounded-lg text-sm font-mono outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
          />
        </div>
      )}

      {/* Target Audience */}
      <div className="mb-6">
        <label className="block text-xs font-mono mb-3" style={{ color: 'var(--ghost)' }}>TARGET_AUDIENCE <span className="opacity-50">(select all that apply)</span></label>
        <div className="flex flex-wrap gap-2">
          {AUDIENCE_OPTIONS.map(a => (
            <button
              key={a}
              onClick={() => toggleAudience(a)}
              className="px-3 py-1.5 rounded-full text-xs font-mono transition-all"
              style={{
                background: audience.includes(a) ? 'rgba(0,229,255,0.15)' : 'var(--surface)',
                border: `1px solid ${audience.includes(a) ? 'rgba(0,229,255,0.5)' : 'var(--border)'}`,
                color: audience.includes(a) ? 'var(--neon)' : 'var(--ghost)',
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="mb-8">
        <label className="block text-xs font-mono mb-3" style={{ color: 'var(--ghost)' }}>CONTENT_TONE</label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => toggleTone(t)}
              className="px-3 py-1.5 rounded-full text-xs font-mono transition-all"
              style={{
                background: tone.includes(t) ? 'rgba(255,107,53,0.15)' : 'var(--surface)',
                border: `1px solid ${tone.includes(t) ? 'rgba(255,107,53,0.5)' : 'var(--border)'}`,
                color: tone.includes(t) ? 'var(--fire)' : 'var(--ghost)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg p-3 text-xs font-mono" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
          ❌ {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mb-6 panel p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="status-dot" style={{ background: 'var(--neon)' }} />
            <span className="text-sm font-mono" style={{ color: 'var(--neon)' }}>{loadingStep}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full shimmer" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      <button
        onClick={handleProcess}
        disabled={!canProcess || loading}
        className="btn-fire w-full py-4 font-display text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
      >
        {loading ? 'Processing...' : '⚡ Extract & Analyze Content →'}
      </button>

      {!canProcess && (
        <p className="text-center text-xs mt-3" style={{ color: 'var(--ghost)' }}>
          {inputType === 'pdf' ? 'Upload a PDF' : 'Enter a URL'} and select at least one audience
        </p>
      )}
    </div>
  )
}
