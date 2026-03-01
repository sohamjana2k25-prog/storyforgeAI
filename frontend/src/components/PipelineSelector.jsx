import React, { useState } from 'react'

const ORIENTATIONS = [
  { id: 'square', label: 'Square', dim: '1:1', icon: '⬛' },
  { id: 'portrait', label: 'Portrait', dim: '9:16', icon: '📱' },
  { id: 'landscape', label: 'Landscape', dim: '16:9', icon: '🖥' },
  { id: 'strip', label: 'Comic Strip', dim: '3:1', icon: '📜' },
]

const MEME_STYLES = [
  { id: 'classic', label: 'Classic Impact', desc: 'Top/bottom text on image' },
  { id: 'drake', label: 'Reaction Format', desc: 'Side-by-side comparison' },
  { id: 'distracted', label: 'Before/After', desc: 'Attention pivot format' },
  { id: 'custom', label: 'Custom', desc: 'AI decides the best format' },
]

const INFOGRAPHIC_TYPES = [
  { id: 'stats', label: 'Stats & Data', icon: '📊', desc: 'Visualize numbers and percentages' },
  { id: 'process', label: 'Process Flow', icon: '⚙️', desc: 'Step-by-step workflow' },
  { id: 'comparison', label: 'Comparison', icon: '⚖️', desc: 'Before vs after, pros vs cons' },
  { id: 'timeline', label: 'Timeline', icon: '📅', desc: 'Chronological narrative' },
]

function PipelineCard({ id, label, color, icon, desc, enabled, onToggle, children }) {
  return (
    <div className="panel transition-all" style={{
      borderColor: enabled ? color + '60' : 'var(--border)',
      background: enabled ? color + '08' : 'var(--panel)',
    }}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <div className="font-display font-bold text-white">{label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>{desc}</div>
            </div>
          </div>
          <button
            onClick={() => onToggle(id)}
            className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
            style={{
              background: enabled ? color : 'var(--border)',
              boxShadow: enabled ? `0 0 12px ${color}60` : 'none',
            }}
          >
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: enabled ? '22px' : '2px' }} />
          </button>
        </div>
        {enabled && <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{children}</div>}
      </div>
    </div>
  )
}

export default function PipelineSelector({ persona, analysis, onComplete }) {
  const [pipelines, setPipelines] = useState({ comic: true, meme: false, infographic: true })
  const [comicOrientation, setComicOrientation] = useState('square')
  const [comicFrames, setComicFrames] = useState(10)
  const [memeStyle, setMemeStyle] = useState('custom')
  const [memeCount, setMemeCount] = useState(3)
  const [infographicType, setInfographicType] = useState('stats')
  const [infographicSentiment, setInfographicSentiment] = useState('professional')

  const toggle = (id) => setPipelines(p => ({ ...p, [id]: !p[id] }))
  const atLeastOne = Object.values(pipelines).some(Boolean)

  const handleNext = () => {
    onComplete({
      pipelines,
      comicOrientation,
      comicFrames,
      memeStyle,
      memeCount,
      infographicType,
      infographicSentiment,
    })
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <div className="tag tag-acid mb-4">STEP 03 — TRANSFORMATION ENGINE</div>
        <h2 className="text-3xl font-display font-bold text-white mb-2">Choose your pipelines</h2>
        <p style={{ color: 'var(--ghost)' }}>Select which content formats to generate. Each pipeline uses different AI models.</p>
      </div>

      {/* AWS Services Info */}
      <div className="panel p-4 mb-6">
        <p className="text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>ACTIVE_AWS_SERVICES</p>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Bedrock Claude 3', use: 'Script generation' },
            { name: 'Bedrock SDXL', use: 'Image generation' },
            { name: 'Comprehend', use: 'Sentiment analysis' },
            { name: 'S3', use: 'Asset storage' },
          ].map(s => (
            <div key={s.name} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="status-dot w-1.5 h-1.5" style={{ background: 'var(--acid)' }} />
              <span className="font-mono" style={{ color: 'var(--neon)' }}>{s.name}</span>
              <span style={{ color: 'var(--ghost)' }}>— {s.use}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Pipeline A: Comic */}
        <PipelineCard id="comic" label="Pipeline A — Visual Narrative" color="#00e5ff" icon="🎭"
          desc="Transform content into a 10-panel comic/webtoon story. Great for Instagram carousels & LinkedIn."
          enabled={pipelines.comic} onToggle={toggle}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>PANEL_ORIENTATION</p>
              <div className="grid grid-cols-4 gap-2">
                {ORIENTATIONS.map(o => (
                  <button key={o.id} onClick={() => setComicOrientation(o.id)}
                    className="p-2 rounded text-center text-xs transition-all"
                    style={{
                      background: comicOrientation === o.id ? 'rgba(0,229,255,0.15)' : 'var(--surface)',
                      border: `1px solid ${comicOrientation === o.id ? 'rgba(0,229,255,0.5)' : 'var(--border)'}`,
                      color: comicOrientation === o.id ? 'var(--neon)' : 'var(--ghost)',
                    }}
                  >
                    <div className="text-base mb-1">{o.icon}</div>
                    <div className="font-mono">{o.dim}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>FRAME_COUNT</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setComicFrames(f => Math.max(4, f - 2))} className="w-8 h-8 rounded flex items-center justify-center font-bold text-white" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>−</button>
                  <span className="font-mono text-white w-6 text-center">{comicFrames}</span>
                  <button onClick={() => setComicFrames(f => Math.min(12, f + 2))} className="w-8 h-8 rounded flex items-center justify-center font-bold text-white" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>+</button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ghost)' }}>
                <span>Art Style:</span>
                <span className="font-mono capitalize" style={{ color: 'var(--neon)' }}>{persona?.artStyle}</span>
              </div>
            </div>
          </div>
        </PipelineCard>

        {/* Pipeline B: Meme */}
        <PipelineCard id="meme" label="Pipeline B — Viral Visuals" color="#ff6b35" icon="🔥"
          desc="Detect irony & humor → map to meme templates. Drives Twitter & Instagram engagement."
          enabled={pipelines.meme} onToggle={toggle}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>MEME_STYLE</p>
              <div className="grid grid-cols-2 gap-2">
                {MEME_STYLES.map(m => (
                  <button key={m.id} onClick={() => setMemeStyle(m.id)}
                    className="p-3 rounded text-left text-xs transition-all"
                    style={{
                      background: memeStyle === m.id ? 'rgba(255,107,53,0.15)' : 'var(--surface)',
                      border: `1px solid ${memeStyle === m.id ? 'rgba(255,107,53,0.5)' : 'var(--border)'}`,
                      color: memeStyle === m.id ? 'var(--fire)' : 'var(--ghost)',
                    }}
                  >
                    <div className="font-semibold text-white mb-0.5">{m.label}</div>
                    <div>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-mono" style={{ color: 'var(--ghost)' }}>MEME_COUNT:</p>
              {[1, 2, 3, 5].map(n => (
                <button key={n} onClick={() => setMemeCount(n)}
                  className="w-8 h-8 rounded font-mono text-sm transition-all"
                  style={{
                    background: memeCount === n ? 'rgba(255,107,53,0.15)' : 'var(--surface)',
                    border: `1px solid ${memeCount === n ? 'rgba(255,107,53,0.5)' : 'var(--border)'}`,
                    color: memeCount === n ? 'var(--fire)' : 'var(--ghost)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="text-xs p-2 rounded" style={{ background: 'rgba(255,107,53,0.08)', color: '#ff9966' }}>
              💡 Humor score from analysis: <strong>{Math.round((analysis?.humor_score || 0.3) * 100)}%</strong> — 
              {(analysis?.humor_score || 0) > 0.5 ? ' High meme potential!' : ' Content is more serious; AI will find the irony.'}
            </div>
          </div>
        </PipelineCard>

        {/* Pipeline C: Infographic */}
        <PipelineCard id="infographic" label="Pipeline C — Professional Visuals" color="#b8ff57" icon="📊"
          desc="Extract data points → create LinkedIn-ready infographics and formal content."
          enabled={pipelines.infographic} onToggle={toggle}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>INFOGRAPHIC_TYPE</p>
              <div className="grid grid-cols-2 gap-2">
                {INFOGRAPHIC_TYPES.map(t => (
                  <button key={t.id} onClick={() => setInfographicType(t.id)}
                    className="p-3 rounded text-left text-xs transition-all"
                    style={{
                      background: infographicType === t.id ? 'rgba(184,255,87,0.1)' : 'var(--surface)',
                      border: `1px solid ${infographicType === t.id ? 'rgba(184,255,87,0.4)' : 'var(--border)'}`,
                      color: infographicType === t.id ? 'var(--acid)' : 'var(--ghost)',
                    }}
                  >
                    <span className="mr-2">{t.icon}</span>
                    <span className="font-semibold text-white">{t.label}</span>
                    <div className="mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>SENTIMENT_OVERRIDE</p>
              <div className="flex gap-2">
                {['professional', 'inspirational', 'urgent', 'neutral'].map(s => (
                  <button key={s} onClick={() => setInfographicSentiment(s)}
                    className="px-3 py-1.5 rounded text-xs font-mono capitalize transition-all"
                    style={{
                      background: infographicSentiment === s ? 'rgba(184,255,87,0.1)' : 'var(--surface)',
                      border: `1px solid ${infographicSentiment === s ? 'rgba(184,255,87,0.4)' : 'var(--border)'}`,
                      color: infographicSentiment === s ? 'var(--acid)' : 'var(--ghost)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs p-2 rounded" style={{ background: 'rgba(184,255,87,0.05)', color: '#a8d84a' }}>
              📊 Detected {(analysis?.statistics || []).length} data points • 
              Word limit: {persona?.wordLimit || 200} words • 
              Dimensions: {persona?.dimensions || '1080x1080'}
            </div>
          </div>
        </PipelineCard>
      </div>

      <button
        onClick={handleNext}
        disabled={!atLeastOne}
        className="btn-fire w-full py-4 font-display text-base mt-6 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
      >
        🚀 Generate Content →
      </button>
    </div>
  )
}
