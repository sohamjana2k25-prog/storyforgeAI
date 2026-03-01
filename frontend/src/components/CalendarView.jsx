import React, { useState, useEffect } from 'react'
import { getScheduleSuggestions, schedulePost, postToTwitter, MOCK } from '../services/api.js'
import { isConfigured } from '../config/aws.js'
import { format, addDays, startOfWeek, addWeeks } from 'date-fns'

const PLATFORM_COLORS = {
  twitter: '#1da1f2',
  linkedin: '#0077b5',
  instagram: '#e1306c',
  reddit: '#ff4500',
}

const PLATFORM_ICONS = {
  twitter: '🐦',
  linkedin: '💼',
  instagram: '📸',
  reddit: '🤖',
}

const TYPE_LABELS = {
  comic: '🎭 Comic',
  meme: '🔥 Meme',
  infographic: '📊 Infographic',
}

function CalendarGrid({ schedule, onDayClick }) {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })

  const weeks = Array.from({ length: 3 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => addDays(addWeeks(weekStart, wi), di))
  )

  const scheduledDates = schedule.reduce((acc, item) => {
    const key = format(new Date(item.date), 'yyyy-MM-dd')
    acc[key] = [...(acc[key] || []), item]
    return acc
  }, {})

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map(d => (
          <div key={d} className="text-center text-xs font-mono py-1" style={{ color: 'var(--ghost)' }}>{d}</div>
        ))}
      </div>
      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const posts = scheduledDates[key] || []
            const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
            const isPast = day < today && !isToday

            return (
              <div
                key={key}
                className={`cal-day cursor-pointer ${posts.length > 0 ? 'has-post' : ''}`}
                style={{ opacity: isPast ? 0.4 : 1 }}
                onClick={() => onDayClick && onDayClick(day, posts)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono" style={{
                    color: isToday ? 'var(--neon)' : 'var(--ghost)',
                    fontWeight: isToday ? '700' : '400',
                  }}>
                    {format(day, 'd')}
                  </span>
                  {isToday && <span className="status-dot" style={{ background: 'var(--neon)' }} />}
                </div>
                <div className="space-y-0.5">
                  {posts.map((post, pi) => (
                    <div key={pi} className="text-xs rounded px-1 py-0.5 truncate" style={{
                      background: (PLATFORM_COLORS[post.platform] || '#444') + '25',
                      color: PLATFORM_COLORS[post.platform] || 'white',
                      border: `1px solid ${(PLATFORM_COLORS[post.platform] || '#444')}40`,
                      fontSize: '10px',
                    }}>
                      {PLATFORM_ICONS[post.platform]} {TYPE_LABELS[post.type]?.split(' ')[1] || post.type}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function ScheduleCard({ item, onPost, posting }) {
  return (
    <div className="panel panel-hover p-4 flex items-start gap-4">
      <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
        style={{ background: (PLATFORM_COLORS[item.platform] || '#444') + '15', border: `1px solid ${(PLATFORM_COLORS[item.platform] || '#444')}30` }}>
        <span className="text-xl">{PLATFORM_ICONS[item.platform]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-bold text-white text-sm capitalize">{item.platform}</span>
          <span className="tag" style={{ background: (PLATFORM_COLORS[item.platform] || '#444') + '15', color: PLATFORM_COLORS[item.platform] || 'white', border: `1px solid ${(PLATFORM_COLORS[item.platform] || '#444')}30`, fontSize: '10px', padding: '1px 6px' }}>
            {TYPE_LABELS[item.type] || item.type}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--ghost)' }}>
          {format(new Date(item.date), 'EEE, MMM d')} at {item.time}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--ghost)' }}>💡 {item.reason}</p>
      </div>
      <div className="flex flex-col gap-2">
        {item.platform === 'twitter' && (
          <button
            onClick={() => onPost(item)}
            disabled={posting === item.id}
            className="btn-neon text-xs py-1.5 px-3 disabled:opacity-50"
          >
            {posting === item.id ? 'Posting...' : '🐦 Post Now'}
          </button>
        )}
        <button className="btn-neon text-xs py-1.5 px-3">📅 Schedule</button>
      </div>
    </div>
  )
}

export default function CalendarView({ generatedAssets, persona }) {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [posting, setPosting] = useState(null)
  const [posted, setPosted] = useState([])
  const [twitterToken, setTwitterToken] = useState('')
  const [showTwitterInput, setShowTwitterInput] = useState(false)
  const [view, setView] = useState('calendar') // calendar | list

  useEffect(() => {
    loadSchedule()
  }, [])

  const loadSchedule = async () => {
    setLoading(true)
    try {
      if (!isConfigured()) {
        await new Promise(r => setTimeout(r, 1000))
        setSchedule(MOCK.schedule)
      } else {
        const assets = [
          generatedAssets.comicFrames?.length > 0 && { type: 'comic', platform: 'twitter' },
          generatedAssets.memes?.length > 0 && { type: 'meme', platform: 'instagram' },
          generatedAssets.infographic && { type: 'infographic', platform: 'linkedin' },
        ].filter(Boolean)
        const data = await getScheduleSuggestions(assets)
        setSchedule(data.schedule)
      }
    } catch {
      setSchedule(MOCK.schedule)
    } finally {
      setLoading(false)
    }
  }

  const handlePostToTwitter = async (item) => {
    if (!twitterToken) {
      setShowTwitterInput(true)
      return
    }
    setPosting(item.id)
    try {
      await postToTwitter('Check out this amazing content! 🚀 #AIContent #ContentMarketing', item.image_url)
      setPosted(p => [...p, item.id])
    } catch (err) {
      alert('Twitter post failed: ' + err.message)
    } finally {
      setPosting(null)
    }
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <div className="tag tag-fire mb-4">STEP 05 — DISTRIBUTION LAYER</div>
        <h2 className="text-3xl font-display font-bold text-white mb-2">Schedule & distribute</h2>
        <p style={{ color: 'var(--ghost)' }}>AI-optimized posting schedule based on platform algorithms and peak engagement times.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Assets Generated', value: [generatedAssets.comicFrames?.length, generatedAssets.memes?.length, generatedAssets.infographic ? 1 : 0].filter(Boolean).reduce((a, b) => a + b, 0), color: 'var(--neon)' },
          { label: 'Posts Scheduled', value: schedule.length, color: 'var(--acid)' },
          { label: 'Platforms', value: [...new Set(schedule.map(s => s.platform))].length, color: 'var(--fire)' },
        ].map(s => (
          <div key={s.label} className="panel p-4 text-center">
            <div className="text-3xl font-display font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'var(--ghost)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Twitter Auth */}
      {showTwitterInput && (
        <div className="panel p-4 mb-6 animate-in">
          <p className="text-xs font-mono mb-3" style={{ color: 'var(--ghost)' }}>TWITTER_BEARER_TOKEN <span style={{ color: 'var(--fire)' }}>(Twitter API v2 — Free tier)</span></p>
          <div className="flex gap-3">
            <input
              type="password"
              value={twitterToken}
              onChange={e => setTwitterToken(e.target.value)}
              placeholder="Bearer token from developer.twitter.com"
              className="flex-1 px-3 py-2 rounded text-sm font-mono outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
            <button onClick={() => setShowTwitterInput(false)} className="btn-neon text-xs">Save</button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--ghost)' }}>Get free access at developer.twitter.com · API v2 · 1500 tweets/month free</p>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setView('calendar')} className={`px-4 py-2 rounded text-xs font-mono transition-all ${view === 'calendar' ? 'text-white' : ''}`}
          style={{ background: view === 'calendar' ? 'rgba(0,229,255,0.1)' : 'var(--surface)', border: `1px solid ${view === 'calendar' ? 'var(--neon)' : 'var(--border)'}`, color: view === 'calendar' ? 'var(--neon)' : 'var(--ghost)' }}>
          📅 Calendar
        </button>
        <button onClick={() => setView('list')} className={`px-4 py-2 rounded text-xs font-mono transition-all ${view === 'list' ? 'text-white' : ''}`}
          style={{ background: view === 'list' ? 'rgba(255,107,53,0.1)' : 'var(--surface)', border: `1px solid ${view === 'list' ? 'var(--fire)' : 'var(--border)'}`, color: view === 'list' ? 'var(--fire)' : 'var(--ghost)' }}>
          📋 List
        </button>
      </div>

      {loading ? (
        <div className="panel p-8 text-center">
          <div className="status-dot mx-auto mb-3" style={{ background: 'var(--neon)', width: '12px', height: '12px' }} />
          <p className="text-sm font-mono" style={{ color: 'var(--ghost)' }}>AI is analyzing optimal posting times...</p>
        </div>
      ) : (
        <>
          {view === 'calendar' && (
            <div className="panel p-5 mb-6">
              <p className="text-xs font-mono mb-4" style={{ color: 'var(--ghost)' }}>AI CONTENT CALENDAR — Next 3 Weeks</p>
              <CalendarGrid schedule={schedule} onDayClick={(day, posts) => setSelectedDay({ day, posts })} />
              {selectedDay && selectedDay.posts.length > 0 && (
                <div className="mt-4 pt-4 border-t animate-in" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-mono mb-3" style={{ color: 'var(--ghost)' }}>
                    {format(selectedDay.day, 'EEEE, MMMM d')} — {selectedDay.posts.length} post(s)
                  </p>
                  {selectedDay.posts.map((post, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm mb-2">
                      <span>{PLATFORM_ICONS[post.platform]}</span>
                      <span className="font-mono" style={{ color: PLATFORM_COLORS[post.platform] }}>{post.time}</span>
                      <span style={{ color: 'var(--ghost)' }}>{TYPE_LABELS[post.type]}</span>
                      <span className="text-xs" style={{ color: 'var(--ghost)' }}>— {post.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'list' && (
            <div className="space-y-3 mb-6">
              {schedule.map(item => (
                <ScheduleCard
                  key={item.id}
                  item={item}
                  onPost={handlePostToTwitter}
                  posting={posting}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Download All */}
      <div className="panel p-5 mb-6">
        <p className="text-xs font-mono mb-4" style={{ color: 'var(--ghost)' }}>EXPORT OPTIONS</p>
        <div className="grid grid-cols-3 gap-3">
          <button className="panel panel-hover p-4 text-center text-sm transition-all">
            <div className="text-2xl mb-2">📦</div>
            <div className="font-semibold text-white">Download ZIP</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>All assets + captions</div>
          </button>
          <button className="panel panel-hover p-4 text-center text-sm transition-all">
            <div className="text-2xl mb-2">📋</div>
            <div className="font-semibold text-white">Copy Captions</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>Ready-to-paste text</div>
          </button>
          <button className="panel panel-hover p-4 text-center text-sm transition-all">
            <div className="text-2xl mb-2">📅</div>
            <div className="font-semibold text-white">Export to CSV</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>Import to any scheduler</div>
          </button>
        </div>
      </div>

      <div className="rounded-lg p-4 text-center text-sm" style={{ background: 'rgba(184,255,87,0.05)', border: '1px solid rgba(184,255,87,0.2)', color: 'var(--acid)' }}>
        🎉 Content ecosystem created! Your content will reach more people with platform-optimized timing.
      </div>
    </div>
  )
}
