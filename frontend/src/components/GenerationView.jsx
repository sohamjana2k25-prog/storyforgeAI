import React, { useState, useEffect } from 'react'
import { generateComic, generateMeme, generateInfographic, MOCK } from '../services/api.js'
import { isConfigured } from '../config/aws.js'

function LoadingPanel({ label, progress }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="status-dot" style={{ background: 'var(--neon)' }} />
        <span className="text-sm font-mono text-white">{label}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-500 shimmer" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--ghost)' }}>
        Powered by Amazon Bedrock (Stable Diffusion XL + Claude 3)
      </p>
    </div>
  )
}

function ComicViewer({ frames, orientation }) {
  const [editIdx, setEditIdx] = useState(null)
  const [captions, setCaptions] = useState(() => frames.map(f => f.caption))
  const cols = orientation === 'strip' ? 5 : orientation === 'landscape' ? 4 : 3

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-white">Comic Strip</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>{frames.length} panels · Click a panel to edit caption</p>
        </div>
        <button className="btn-neon text-xs py-1.5 px-3">⬇ Download ZIP</button>
      </div>
      <div className={`grid gap-2 mb-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {frames.map((frame, i) => (
          <div key={i} className="comic-frame cursor-pointer group" onClick={() => setEditIdx(editIdx === i ? null : i)}>
            <img src={frame.image_url} alt={`Panel ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-1" style={{ background: 'rgba(0,0,0,0.7)' }}>
              <p className="text-xs text-white text-center truncate">{captions[i]}</p>
            </div>
            <div className="absolute top-1 left-1 tag tag-neon text-xs px-1 py-0" style={{ fontSize: '10px' }}>
              {i + 1}
            </div>
          </div>
        ))}
      </div>
      {editIdx !== null && (
        <div className="panel p-4 animate-in">
          <p className="text-xs font-mono mb-2" style={{ color: 'var(--ghost)' }}>EDIT PANEL {editIdx + 1} CAPTION</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={captions[editIdx]}
              onChange={e => { const c = [...captions]; c[editIdx] = e.target.value; setCaptions(c) }}
              className="flex-1 px-3 py-2 rounded text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
            <button className="btn-neon text-xs py-2 px-3">Regenerate Image</button>
          </div>
        </div>
      )}
    </div>
  )
}

function MemeViewer({ memes }) {
  const [editIdx, setEditIdx] = useState(null)
  const [texts, setTexts] = useState(() => memes.map(m => ({ top: m.top_text, bottom: m.bottom_text })))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-white">Viral Memes</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>{memes.length} memes · Twitter/Instagram ready</p>
        </div>
        <button className="btn-neon text-xs py-1.5 px-3">⬇ Download All</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {memes.map((meme, i) => (
          <div key={i} className="panel panel-hover overflow-hidden cursor-pointer" onClick={() => setEditIdx(editIdx === i ? null : i)}>
            <div className="relative">
              <img src={meme.image_url} alt="Meme" className="w-full aspect-square object-cover" />
              <div className="absolute top-2 left-0 right-0 text-center">
                <span className="text-white font-bold text-sm drop-shadow-lg" style={{ textShadow: '2px 2px 0 black,-2px -2px 0 black,2px -2px 0 black,-2px 2px 0 black' }}>
                  {texts[i].top}
                </span>
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="text-white font-bold text-sm drop-shadow-lg" style={{ textShadow: '2px 2px 0 black,-2px -2px 0 black,2px -2px 0 black,-2px 2px 0 black' }}>
                  {texts[i].bottom}
                </span>
              </div>
            </div>
            <div className="p-2 flex gap-1 justify-end">
              <span className="tag tag-fire text-xs">Twitter</span>
              <span className="tag tag-fire text-xs">Instagram</span>
            </div>
          </div>
        ))}
      </div>
      {editIdx !== null && (
        <div className="panel p-4 mt-4 animate-in">
          <p className="text-xs font-mono mb-3" style={{ color: 'var(--ghost)' }}>EDIT MEME {editIdx + 1}</p>
          <div className="space-y-2">
            <input type="text" value={texts[editIdx].top}
              onChange={e => { const t = [...texts]; t[editIdx] = { ...t[editIdx], top: e.target.value }; setTexts(t) }}
              placeholder="Top text..."
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }} />
            <input type="text" value={texts[editIdx].bottom}
              onChange={e => { const t = [...texts]; t[editIdx] = { ...t[editIdx], bottom: e.target.value }; setTexts(t) }}
              placeholder="Bottom text..."
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }} />
          </div>
          <button className="btn-neon text-xs mt-3">Regenerate with new text</button>
        </div>
      )}
    </div>
  )
}

function InfographicViewer({ infographic }) {
  const content = infographic?.content || {}
  const hashtags = content.hashtags || []
  const [copied, setCopied] = useState(false)

  const fullPost = `${content.title || ''}\n\n${content.body || ''}\n\n${content.cta || ''}\n\n${hashtags.join(' ')}`

  const handleCopy = () => {
    navigator.clipboard.writeText(fullPost)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-white">LinkedIn Post</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>Ready to post · Professional content</p>
        </div>
        <button onClick={handleCopy} className="btn-neon text-xs py-1.5 px-3">
          {copied ? '✅ Copied!' : '📋 Copy Post'}
        </button>
      </div>

      {/* LinkedIn Card */}
      <div className="panel p-6" style={{ border: '1px solid var(--border)', maxWidth: '600px' }}>
        {/* LinkedIn Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'var(--neon)' }}>CF</div>
          <div>
            <p className="text-white text-sm font-semibold">ContentForge AI</p>
            <p className="text-xs" style={{ color: 'var(--ghost)' }}>AI-Generated · Just now</p>
          </div>
        </div>

        {/* Hook */}
        {content.hook && (
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--neon)' }}>{content.hook}</p>
        )}

        {/* Title */}
        {content.title && (
          <p className="text-white font-bold text-base mb-3">{content.title}</p>
        )}

        {/* Body */}
        <div className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.85)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
          {content.body}
        </div>

        {/* CTA */}
        {content.cta && (
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--acid)' }}>{content.cta}</p>
        )}

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1">
          {hashtags.map((tag, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--neon)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Platform tags */}
      <div className="flex gap-2 mt-3">
        <span className="tag tag-acid">LinkedIn</span>
        <span className="tag tag-acid">Professional</span>
      </div>
    </div>
  )
}

export default function GenerationView({ ingestionData, persona, pipelineConfig, onComplete }) {
  const [status, setStatus] = useState('generating') // generating | done | error
  const [progress, setProgress] = useState({ comic: 0, meme: 0, infographic: 0 })
  const [results, setResults] = useState({ comicFrames: [], memes: [], infographic: null })
  const [activeTab, setActiveTab] = useState(null)

  useEffect(() => {
    runGeneration()
  }, [])

  const simulateProgress = (key, duration = 4000) => {
    return new Promise(resolve => {
      let p = 0
      const interval = setInterval(() => {
        p += Math.random() * 20
        if (p >= 90) { clearInterval(interval); resolve() }
        setProgress(prev => ({ ...prev, [key]: Math.min(90, p) }))
      }, duration / 10)
    })
  }

  const runGeneration = async () => {
    const useMock = !isConfigured()
    const { pipelines, comicOrientation, comicFrames, memeCount, infographicSentiment } = pipelineConfig

    try {
      const comicPromise = pipelines.comic ? (async () => {
        await simulateProgress('comic', 5000)
        let result
        if (useMock) {
          await new Promise(r => setTimeout(r, 5000))
          result = { frames: MOCK.comic_frames.slice(0, comicFrames) }
        } else {
          result = await generateComic({
            script: ingestionData.analysis.quotable_moments?.join('\n'),
            orientation: comicOrientation,
            artStyle: persona.artStyle,
            brandTone: persona.brandTone,
            characterDescription: persona.characterDesc,
            frames: comicFrames,
          })
        }
        setProgress(p => ({ ...p, comic: 100 }))
        setResults(r => ({ ...r, comicFrames: result.frames }))
        setActiveTab(t => t || 'comic')
      })() : Promise.resolve()

      const memePromise = pipelines.meme ? (async () => {
        await simulateProgress('meme', 3500)
        let result
        if (useMock) {
          await new Promise(r => setTimeout(r, 3500))
          result = { memes: MOCK.memes.slice(0, memeCount) }
        } else {
          result = await generateMeme({
            contentAnalysis: ingestionData.analysis,
            platform: persona.platforms?.[0],
            tone: persona.brandTone > 60 ? 'humorous' : 'witty',
            brandPersona: persona.brandTone > 70 ? 'GenZ' : 'Professional',
            count: memeCount,
          })
        }
        setProgress(p => ({ ...p, meme: 100 }))
        setResults(r => ({ ...r, memes: result.memes }))
        setActiveTab(t => t || 'meme')
      })() : Promise.resolve()

      const infographicPromise = pipelines.infographic ? (async () => {
        await simulateProgress('infographic', 4500)
        let result
        if (useMock) {
          await new Promise(r => setTimeout(r, 4500))
          result = MOCK.infographic
        } else {
          result = await generateInfographic({
            dataPoints: ingestionData.analysis.statistics,
            keyThemes: ingestionData.analysis.key_themes,
            sentiment: infographicSentiment,
            wordLimit: persona.wordLimit,
            dimensions: persona.dimensions,
          })
        }
        setProgress(p => ({ ...p, infographic: 100 }))
        setResults(r => ({ ...r, infographic: result }))
        setActiveTab(t => t || 'infographic')
      })() : Promise.resolve()

      await Promise.all([comicPromise, memePromise, infographicPromise])
      setStatus('done')
    } catch (err) {
      setStatus('error')
    }
  }

  const allDone = 
    (!pipelineConfig.pipelines.comic || progress.comic >= 100) &&
    (!pipelineConfig.pipelines.meme || progress.meme >= 100) &&
    (!pipelineConfig.pipelines.infographic || progress.infographic >= 100)

  const tabs = [
    pipelineConfig.pipelines.comic && { id: 'comic', label: '🎭 Comic', done: progress.comic >= 100 },
    pipelineConfig.pipelines.meme && { id: 'meme', label: '🔥 Memes', done: progress.meme >= 100 },
    pipelineConfig.pipelines.infographic && { id: 'infographic', label: '📊 Infographic', done: progress.infographic >= 100 },
  ].filter(Boolean)

  return (
    <div className="animate-in">
      <div className="mb-8">
        <div className="tag tag-neon mb-4">STEP 04 — GENERATION ENGINE</div>
        <h2 className="text-3xl font-display font-bold text-white mb-2">Creating your assets</h2>
        <p style={{ color: 'var(--ghost)' }}>Amazon Bedrock is generating your content. This takes 30–120 seconds.</p>
      </div>

      {/* Progress Cards */}
      <div className="space-y-3 mb-8">
        {pipelineConfig.pipelines.comic && (
          <LoadingPanel
            label={progress.comic >= 100 ? '✅ Comic strip generated!' : '🎭 Generating comic panels with SDXL...'}
            progress={progress.comic}
          />
        )}
        {pipelineConfig.pipelines.meme && (
          <LoadingPanel
            label={progress.meme >= 100 ? '✅ Memes generated!' : '🔥 Detecting irony → mapping to meme templates...'}
            progress={progress.meme}
          />
        )}
        {pipelineConfig.pipelines.infographic && (
          <LoadingPanel
            label={progress.infographic >= 100 ? '✅ Infographic generated!' : '📊 Visualizing data with Amazon Bedrock...'}
            progress={progress.infographic}
          />
        )}
      </div>

      {/* Results Viewer */}
      {tabs.some(t => t.done) && (
        <div>
          {/* Tab Bar */}
          <div className="flex gap-1 mb-6" style={{ background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', display: 'inline-flex' }}>
            {tabs.filter(t => t.done).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="py-2 px-4 rounded-md text-sm font-semibold transition-all"
                style={{
                  background: activeTab === tab.id ? 'var(--panel)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--ghost)',
                  border: activeTab === tab.id ? '1px solid var(--border)' : '1px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Panels */}
          <div className="panel p-6">
            {activeTab === 'comic' && results.comicFrames.length > 0 && (
              <ComicViewer frames={results.comicFrames} orientation={pipelineConfig.comicOrientation} />
            )}
            {activeTab === 'meme' && results.memes.length > 0 && (
              <MemeViewer memes={results.memes} />
            )}
            {activeTab === 'infographic' && results.infographic && (
              <InfographicViewer infographic={results.infographic} />
            )}
          </div>
        </div>
      )}

      {allDone && (
        <div className="mt-8">
          <button onClick={() => onComplete(results)} className="btn-acid w-full py-4 font-display text-base">
            📅 Schedule & Distribute →
          </button>
        </div>
      )}
    </div>
  )
}
