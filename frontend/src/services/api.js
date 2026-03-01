import axios from 'axios'
import { getAWSConfig, getAuthHeaders } from '../config/aws.js'

const getClient = () => {
  const config = getAWSConfig()
  const baseURL = config.apiGatewayUrl || '/api'
  
  return axios.create({
    baseURL,
    timeout: 120000, // 2 min for AI generation
    headers: getAuthHeaders(),
  })
}

// ─── Ingestion APIs ──────────────────────────────────────────

export const ingestURL = async (url) => {
  const client = getClient()
  const response = await client.post('/ingest/url', { url })
  return response.data
}

export const ingestPDF = async (s3Key) => {
  const client = getClient()
  const response = await client.post('/ingest/pdf', { s3_key: s3Key })
  return response.data
}

export const ingestYoutube = async (videoUrl) => {
  const client = getClient()
  const response = await client.post('/ingest/youtube', { url: videoUrl })
  return response.data
}

// ─── Analysis API ────────────────────────────────────────────

export const analyzeContent = async (extractedText, options = {}) => {
  const client = getClient()
  const response = await client.post('/analyze', {
    text: extractedText,
    target_audience: options.targetAudience || 'general',
    tone: options.tone || 'balanced',
  })
  return response.data
}

// ─── Upload to S3 ────────────────────────────────────────────

export const getS3UploadUrl = async (filename, contentType) => {
  const client = getClient()
  const response = await client.post('/upload/presign', {
    filename,
    content_type: contentType,
  })
  return response.data // { upload_url, s3_key }
}

export const uploadFileToS3 = async (file, onProgress) => {
  const { upload_url, s3_key } = await getS3UploadUrl(file.name, file.type)
  
  await axios.put(upload_url, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (evt) => {
      if (onProgress) onProgress(Math.round((evt.loaded * 100) / evt.total))
    }
  })
  
  return s3_key
}

// ─── Transform / Generation APIs ─────────────────────────────

export const generateComic = async (payload) => {
  const client = getClient()
  const response = await client.post('/transform/comic', {
    script: payload.script,
    orientation: payload.orientation || 'square',
    art_style: payload.artStyle || 'anime',
    brand_tone: payload.brandTone || 5,
    character_description: payload.characterDescription || '',
    frames: payload.frames || 10,
  })
  return response.data // { frames: [{ image_url, caption, panel_number }] }
}

export const generateMeme = async (payload) => {
  const client = getClient()
  const response = await client.post('/transform/meme', {
    content_analysis: payload.contentAnalysis,
    platform: payload.platform || 'twitter',
    tone: payload.tone || 'humorous',
    brand_persona: payload.brandPersona || 'GenZ',
    count: payload.count || 3,
  })
  return response.data // { memes: [{ image_url, top_text, bottom_text }] }
}

export const generateInfographic = async (payload) => {
  const client = getClient()
  const response = await client.post('/transform/infographic', {
    data_points: payload.dataPoints,
    key_themes: payload.keyThemes,
    sentiment: payload.sentiment || 'professional',
    word_limit: payload.wordLimit || 200,
    dimensions: payload.dimensions || '1080x1080',
    platform: payload.platform || 'linkedin',
  })
  return response.data // { image_url, data }
}

// ─── Schedule / Distribution ──────────────────────────────────

export const getScheduleSuggestions = async (assets) => {
  const client = getClient()
  const response = await client.post('/schedule/suggest', { assets })
  return response.data // { schedule: [{ date, time, platform, asset_id, reason }] }
}

export const schedulePost = async (scheduleItem) => {
  const client = getClient()
  const response = await client.post('/schedule/create', scheduleItem)
  return response.data
}

export const getSchedule = async () => {
  const client = getClient()
  const response = await client.get('/schedule')
  return response.data
}

export const postToTwitter = async (content, imageUrl) => {
  const client = getClient()
  const response = await client.post('/distribute/twitter', {
    text: content,
    image_url: imageUrl,
  })
  return response.data
}

// ─── Health Check ─────────────────────────────────────────────

export const healthCheck = async () => {
  const client = getClient()
  try {
    const response = await client.get('/health')
    return { ok: true, data: response.data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Mock data for development/demo ───────────────────────────

export const MOCK = {
  analysis: {
    key_themes: ['AI Innovation', 'Cost Reduction', 'Automation', 'Future of Work'],
    quotable_moments: [
      'AI will transform how we work by 2030',
      'Companies adopting AI see 40% productivity gains',
      'The future belongs to those who adapt'
    ],
    statistics: [
      { label: 'Productivity Gain', value: '40%' },
      { label: 'Cost Reduction', value: '30%' },
      { label: 'Time Saved', value: '15hrs/week' },
    ],
    sentiment: 0.75,
    humor_score: 0.3,
    summary: 'A forward-looking analysis of AI impact on modern businesses with statistical evidence.'
  },
  comic_frames: Array.from({ length: 10 }, (_, i) => ({
    panel_number: i + 1,
    image_url: `https://picsum.photos/seed/panel${i}/300/300`,
    caption: `Panel ${i + 1}: The story continues...`,
    dialogue: i % 3 === 0 ? 'This is where AI changes everything!' : null,
  })),
  memes: [
    { id: 1, image_url: 'https://picsum.photos/seed/meme1/400/400', top_text: 'When you finally automate that task', bottom_text: 'And it works perfectly' },
    { id: 2, image_url: 'https://picsum.photos/seed/meme2/400/400', top_text: 'AI watching humans do manual work', bottom_text: 'I could do that in 0.3 seconds' },
    { id: 3, image_url: 'https://picsum.photos/seed/meme3/400/400', top_text: 'The productivity gains are real', bottom_text: 'Trust me bro, 40%' },
  ],
  infographic: {
    image_url: 'https://picsum.photos/seed/infographic1/1080/1080',
    data: { title: 'AI Impact 2025', sections: 5 }
  },
  schedule: [
    { id: 1, date: new Date(Date.now() + 86400000).toISOString(), time: '09:00', platform: 'linkedin', type: 'infographic', reason: 'Monday morning professional content' },
    { id: 2, date: new Date(Date.now() + 86400000 * 2).toISOString(), time: '11:00', platform: 'twitter', type: 'comic', reason: 'Tuesday carousel engagement' },
    { id: 3, date: new Date(Date.now() + 86400000 * 4).toISOString(), time: '15:00', platform: 'twitter', type: 'meme', reason: 'Friday fun content' },
    { id: 4, date: new Date(Date.now() + 86400000 * 6).toISOString(), time: '10:00', platform: 'instagram', type: 'meme', reason: 'Weekend engagement boost' },
  ]
}
