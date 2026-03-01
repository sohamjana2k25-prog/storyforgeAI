import React, { useState } from 'react'

const ART_STYLES = [
  { id: 'anime', label: 'Anime', emoji: '🎌', desc: 'Japanese animation aesthetic' },
  { id: 'minimalist', label: 'Minimalist', emoji: '⬜', desc: 'Clean, lots of whitespace' },
  { id: 'flat', label: 'Flat Design', emoji: '🎨', desc: 'Bold colors, no shadows' },
  { id: 'pixel', label: 'Pixel Art', emoji: '👾', desc: '8-bit retro style' },
  { id: 'sketch', label: 'Sketch', emoji: '✏️', desc: 'Hand-drawn feel' },
  { id: 'corporate', label: 'Corporate', emoji: '💼', desc: 'Professional, clean' },
]

const BRAND_PRESETS = [
  { id: 'startup', label: 'Tech Startup', tone: 75, art: 'flat', chaos: 60 },
  { id: 'corporate', label: 'Enterprise', tone: 15, art: 'corporate', chaos: 20 },
  { id: 'creator', label: 'Content Creator', tone: 85, art: 'anime', chaos: 80 },
  { id: 'agency', label: 'Creative Agency', tone: 65, art: 'minimalist', chaos: 55 },
  { id: 'edtech', label: 'EdTech', tone: 50, art: 'flat', chaos: 45 },
  { id: 'lawfirm', label: 'Law Firm', tone: 5, art: 'corporate', chaos: 10 },
]

const PLATFORMS = [
  { id: 'twitter', label: 'Twitter/X', color: '#1da1f2', icon: '🐦' },
  { id: 'instagram', label: 'Instagram', color: '#e1306c', icon: '📸' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0077b5', icon: '💼' },
  { id: 'reddit', label: 'Reddit', color: '#ff4500', icon: '🤖' },
]

function SliderField({ label, leftLabel, rightLabel, value, onChange, color = 'var(--neon)' }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-mono" style={{ color: 'var(--ghost)' }}>{label}</label>
        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--neon)' }}>{value}</span>
      </div>
      <input type="range" min="0" max="100" value={value} onChange={e => onChange(Number(e.target.value))} />
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--ghost)' }}>{leftLabel}</span>
        <span className="text-xs" style={{ color: 'var(--ghost)' }}>{rightLabel}</span>
      </div>
    </div>
  )
}

export default function PersonalizationLayer({ analysis, onComplete }) {
  const [brandTone, setBrandTone] = useState(50)
  const [artStyle, setArtStyle] = useState('flat')
  const [chaosLevel, setChaosLevel] = useState(50)
  const [colorVibrancy, setColorVibrancy] = useState(70)
  const [platforms, setPlatforms] = useState(['twitter', 'linkedin'])
  const [characterDesc, setCharacterDesc] = useState('')
  const [wordLimit, setWordLimit] = useState(200)
  const [dimensions, setDimensions] = useState('1080x1080')

  const togglePlatform = (p) => setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const applyPreset = (preset) => {
    setBrandTone(preset.tone)
    setArtStyle(preset.art)
    setChaosLevel(preset.chaos)
  }

  const handleNext = () => {
    onComplete({
      brandTone,
      artStyle,
      chaosLevel,
      colorVibrancy,
      platforms,
      characterDesc,
      wordLimit,
      dimensions,
    })
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <div className="tag tag-fire mb-4">STEP 02 — PERSONALIZATION LAYER</div>
        <h2 className="text-3xl font-display font-bold text-white mb-2">Define your brand voice</h2>
        <p style={{ color: 'var(--ghost)' }}>A meme for a law firm looks different from one for a gaming company. Tell us who you are.</p>
      </div>

      {/* Content Analysis Preview */}
      <div className="panel p-5 mb-6">
        <p className="text-xs font-mono mb-3" style={{ color: 'var(--ghost)' }}>EXTRACTED_INSIGHTS</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--ghost)' }}>Key Themes</p>
            <div className="flex flex-wrap gap-1">
              {(analysis?.key_themes || []).map(t => (
                <span key={t} className="tag tag-neon">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--ghost)' }}>Data Points</p>
            <div className="space-y-1">
              {(analysis?.statistics || []).map(s => (
                <div key={s.label} className="flex justify-between text-xs font-mono">
                  <span style={{ color: 'var(--ghost)' }}>{s.label}</span>
                  <span style={{ color: 'var(--acid)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--ghost)' }}>Sentiment</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="w-2 h-2 rounded-sm" style={{
                    background: i < Math.round((analysis?.sentiment || 0.7) * 10) ? 'var(--acid)' : 'var(--border)'
                  }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--ghost)' }}>Humor Potential</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="w-2 h-2 rounded-sm" style={{
                    background: i < Math.round((analysis?.humor_score || 0.3) * 10) ? 'var(--fire)' : 'var(--border)'
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Presets */}
      <div className="mb-6">
        <label className="block text-xs font-mono mb-3" style={{ color: 'var(--ghost)' }}>BRAND_PRESETS <span className="opacity-50">(quick start)</span></label>
        <div className="grid grid-cols-3 gap-2">
          {BRAND_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="panel panel-hover px-3 py-2 text-left text-xs transition-all"
            >
              <div className="font-semibold text-white mb-0.5">{p.label}</div>
              <div style={{ color: 'var(--ghost)' }}>Tone: {p.tone}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="panel p-5 mb-6 space-y-6">
        <p className="text-xs font-mono" style={{ color: 'var(--ghost)' }}>BRAND_SLIDERS</p>
        <SliderField label="BRAND_TONE" leftLabel="Professional" rightLabel="GenZ Chaos" value={brandTone} onChange={setBrandTone} />
        <SliderField label="CHAOS_LEVEL" leftLabel="Calm & Structured" rightLabel="Meme Energy" value={chaosLevel} onChange={setChaosLevel} />
        <SliderField label="COLOR_VIBRANCY" leftLabel="Muted / Subtle" rightLabel="Neon / Vivid" value={colorVibrancy} onChange={setColorVibrancy} />
        <div>
          <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>INFOGRAPHIC_WORD_LIMIT</label>
          <input type="number" min="50" max="500" value={wordLimit} onChange={e => setWordLimit(Number(e.target.value))}
            className="w-32 px-3 py-2 rounded-lg text-sm font-mono outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
          />
        </div>
        <div>
          <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>OUTPUT_DIMENSIONS</label>
          <div className="flex gap-2">
            {['1080x1080', '1080x1920', '1280x720', '800x800'].map(d => (
              <button key={d} onClick={() => setDimensions(d)}
                className="px-3 py-1.5 rounded text-xs font-mono transition-all"
                style={{
                  background: dimensions === d ? 'rgba(0,229,255,0.1)' : 'var(--surface)',
                  border: `1px solid ${dimensions === d ? 'var(--neon)' : 'var(--border)'}`,
                  color: dimensions === d ? 'var(--neon)' : 'var(--ghost)',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Art Style */}
      <div className="mb-6">
        <label className="block text-xs font-mono mb-3" style={{ color: 'var(--ghost)' }}>ART_STYLE</label>
        <div className="grid grid-cols-3 gap-2">
          {ART_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => setArtStyle(style.id)}
              className="panel panel-hover p-3 text-left transition-all"
              style={{
                borderColor: artStyle === style.id ? 'var(--fire)' : 'var(--border)',
                background: artStyle === style.id ? 'rgba(255,107,53,0.05)' : 'var(--panel)',
              }}
            >
              <div className="text-xl mb-1">{style.emoji}</div>
              <div className="text-xs font-semibold text-white">{style.label}</div>
              <div className="text-xs" style={{ color: 'var(--ghost)' }}>{style.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Character Description */}
      <div className="mb-6">
        <label className="block text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>
          CHARACTER_DESCRIPTION <span className="opacity-50">(for comic pipeline — keeps character consistent)</span>
        </label>
        <textarea
          value={characterDesc}
          onChange={e => setCharacterDesc(e.target.value)}
          placeholder="e.g., A 25-year-old Indian developer with glasses, short hair, in a hoodie. Expressive face, friendly vibe."
          rows={3}
          className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
        />
      </div>

      {/* Target Platforms */}
      <div className="mb-8">
        <label className="block text-xs font-mono mb-3" style={{ color: 'var(--ghost)' }}>TARGET_PLATFORMS</label>
        <div className="grid grid-cols-4 gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => togglePlatform(p.id)}
              className="panel panel-hover py-3 px-2 text-center transition-all"
              style={{
                borderColor: platforms.includes(p.id) ? p.color + '80' : 'var(--border)',
                background: platforms.includes(p.id) ? p.color + '15' : 'var(--panel)',
              }}
            >
              <div className="text-xl mb-1">{p.icon}</div>
              <div className="text-xs font-mono" style={{ color: platforms.includes(p.id) ? p.color : 'var(--ghost)' }}>{p.label}</div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleNext} className="btn-acid w-full py-4 font-display text-base">
        Configure Pipelines →
      </button>
    </div>
  )
}
