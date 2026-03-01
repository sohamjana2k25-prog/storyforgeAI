import React, { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import IngestionLayer from './components/IngestionLayer.jsx'
import PersonalizationLayer from './components/PersonalizationLayer.jsx'
import PipelineSelector from './components/PipelineSelector.jsx'
import GenerationView from './components/GenerationView.jsx'
import CalendarView from './components/CalendarView.jsx'
import TokenConfig from './components/TokenConfig.jsx'
import { isConfigured } from './config/aws.js'

const STEPS = [
  { id: 0, label: 'Ingest', shortLabel: '01' },
  { id: 1, label: 'Persona', shortLabel: '02' },
  { id: 2, label: 'Pipeline', shortLabel: '03' },
  { id: 3, label: 'Generate', shortLabel: '04' },
  { id: 4, label: 'Distribute', shortLabel: '05' },
]

const AWS_SERVICES = [
  { name: 'Bedrock', status: 'active' },
  { name: 'Comprehend', status: 'active' },
  { name: 'Textract', status: 'active' },
  { name: 'Transcribe', status: 'active' },
  { name: 'S3', status: 'active' },
  { name: 'Lambda', status: 'active' },
]

function StepProgress({ current }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono font-bold transition-all ${
                i < current ? 'step-done' : i === current ? 'step-active' : 'step-inactive'
              }`}
            >
              {i < current ? '✓' : step.shortLabel}
            </div>
            <span className={`text-xs font-mono hidden sm:block transition-colors ${
              i === current ? 'text-white' : 'opacity-40 text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-px mx-2 transition-colors" style={{
              background: i < current ? 'var(--acid)' : 'var(--border)'
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function Header({ onConfigClick, configured }) {
  return (
    <header className="border-b" style={{ borderColor: 'var(--border)', background: 'rgba(10,13,20,0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 40 }}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'var(--neon)', color: 'var(--void)' }}>
            CF
          </div>
          <div>
            <span className="font-display font-bold text-white text-lg leading-none">ContentForge</span>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="status-dot" style={{ background: 'var(--acid)', width: '6px', height: '6px' }} />
              <span className="text-xs font-mono" style={{ color: 'var(--ghost)' }}>AWS AI 4 Bharat Hackathon</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AWS Service badges - hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            {AWS_SERVICES.slice(0, 3).map(s => (
              <span key={s.name} className="tag text-xs px-2" style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', color: 'var(--ghost)', fontSize: '10px' }}>
                {s.name}
              </span>
            ))}
            <span className="text-xs" style={{ color: 'var(--ghost)' }}>+3</span>
          </div>

          <button
            onClick={onConfigClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
            style={{
              background: configured ? 'rgba(184,255,87,0.08)' : 'rgba(255,107,53,0.08)',
              border: `1px solid ${configured ? 'rgba(184,255,87,0.3)' : 'rgba(255,107,53,0.3)'}`,
              color: configured ? 'var(--acid)' : 'var(--fire)',
            }}
          >
            <span>{configured ? '🔑' : '⚠️'}</span>
            <span>{configured ? 'AWS Connected' : 'Add AWS Keys'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  const [step, setStep] = useState(0)
  const [showConfig, setShowConfig] = useState(false)
  const [awsConfigured, setAwsConfigured] = useState(isConfigured())

  // State flowing between steps
  const [ingestionData, setIngestionData] = useState(null)
  const [personaData, setPersonaData] = useState(null)
  const [pipelineConfig, setPipelineConfig] = useState(null)
  const [generatedAssets, setGeneratedAssets] = useState(null)

  const handleIngestionComplete = (data) => {
    setIngestionData(data)
    setStep(1)
  }
  const handlePersonaComplete = (data) => {
    setPersonaData(data)
    setStep(2)
  }
  const handlePipelineComplete = (data) => {
    setPipelineConfig(data)
    setStep(3)
  }
  const handleGenerationComplete = (assets) => {
    setGeneratedAssets(assets)
    setStep(4)
  }
  const handleConfigured = (config) => {
    setAwsConfigured(!!config.accessKeyId)
    setShowConfig(false)
  }

  const goBack = () => setStep(s => Math.max(0, s - 1))

  return (
    <div className="min-h-screen grid-bg" style={{ background: 'var(--void)' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'var(--panel)', color: 'white', border: '1px solid var(--border)', fontFamily: 'DM Sans' }
        }}
      />

      {showConfig && (
        <TokenConfig
          onConfigured={handleConfigured}
          onClose={() => setShowConfig(false)}
        />
      )}

      <Header onConfigClick={() => setShowConfig(true)} configured={awsConfigured} />

      {/* Hero — only on step 0 */}
      {step === 0 && (
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-8 text-center animate-in">
          <div className="tag tag-neon mb-6 mx-auto" style={{ display: 'inline-flex' }}>
            CONTENT REPURPOSING ECOSYSTEM
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-extrabold text-white mb-4 leading-tight">
            One blog post.<br />
            <span className="gradient-text">Five viral assets.</span>
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--ghost)' }}>
            Drop a blog, PDF, or YouTube link. Our AI transforms it into comics, memes, and infographics — 
            scheduled for maximum impact across every platform.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {['Amazon Bedrock', 'Stable Diffusion XL', 'Amazon Comprehend', 'AWS Textract', 'Amazon Transcribe', 'EventBridge Scheduler'].map(s => (
              <span key={s} className="tag tag-neon text-xs">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 pb-20" style={{ paddingTop: step === 0 ? '0' : '40px' }}>
        {/* Back button */}
        {step > 0 && step < 4 && (
          <button onClick={goBack} className="flex items-center gap-2 text-xs font-mono mb-6 opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--ghost)' }}>
            ← Back
          </button>
        )}

        {/* Step Progress */}
        <StepProgress current={step} />

        {/* Step Content */}
        {step === 0 && (
          <IngestionLayer onComplete={handleIngestionComplete} />
        )}
        {step === 1 && ingestionData && (
          <PersonalizationLayer
            analysis={ingestionData.analysis}
            onComplete={handlePersonaComplete}
          />
        )}
        {step === 2 && personaData && (
          <PipelineSelector
            persona={personaData}
            analysis={ingestionData?.analysis}
            onComplete={handlePipelineComplete}
          />
        )}
        {step === 3 && pipelineConfig && (
          <GenerationView
            ingestionData={ingestionData}
            persona={personaData}
            pipelineConfig={pipelineConfig}
            onComplete={handleGenerationComplete}
          />
        )}
        {step === 4 && generatedAssets && (
          <CalendarView
            generatedAssets={generatedAssets}
            persona={personaData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--ghost)' }}>
          ContentForge · AWS AI 4 Bharat Hackathon · Built with Amazon Bedrock, Comprehend, Textract, Transcribe, S3, Lambda
        </p>
      </footer>
    </div>
  )
}
