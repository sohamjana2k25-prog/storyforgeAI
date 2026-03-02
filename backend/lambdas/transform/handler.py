"""
Transform Lambda — The Transformation Engine
--------------------------------------------
POST /transform/comic       → Pipeline A: Visual Narrative (Comic/Webtoon)
POST /transform/meme        → Pipeline B: Viral Visuals (Memes)
POST /transform/infographic → Pipeline C: Professional Visuals (Infographics)

Uses:
  - Amazon Bedrock (Claude 3 Sonnet): Script & prompt generation
  - Amazon Bedrock (SDXL): Image generation
  - Amazon S3: Store generated images
"""

import json
import os
import re
import uuid
from utils import ok, error, handle_options, invoke_claude, invoke_sdxl, upload_image_to_s3, get_s3_client
import traceback

S3_BUCKET = os.environ.get('S3_BUCKET', '')

# Style presets for SDXL
ART_STYLE_PROMPTS = {
    'anime': 'anime style, manga, high quality illustration, vibrant colors, detailed linework',
    'minimalist': 'minimalist style, clean lines, flat design, simple shapes, white space',
    'flat': 'flat design illustration, bold colors, geometric shapes, modern graphic design',
    'pixel': 'pixel art style, 8-bit, retro gaming aesthetic, pixelated',
    'sketch': 'pencil sketch style, hand-drawn, crosshatching, ink illustration',
    'corporate': 'professional corporate illustration, clean business style, neutral colors',
}

ORIENTATION_SIZES = {
    'square': (1024, 1024),
    'portrait': (768, 1344),
    'landscape': (1344, 768),
    'strip': (1344, 448),
}


# ─── Pipeline A: Comic Generation ────────────────────────────────

def generate_comic(event):
    try:
        body = json.loads(event.get('body', '{}'))
        script = body.get('script', '')
        orientation = body.get('orientation', 'square')
        art_style = body.get('art_style', 'flat')
        brand_tone = body.get('brand_tone', 50)
        character_desc = body.get('character_description', 'A young professional')
        num_frames = min(int(body.get('frames', 10)), 12)

        # Step 1: Generate comic script with Claude
        tone_desc = 'humorous and casual' if brand_tone > 60 else 'professional and serious' if brand_tone < 30 else 'balanced'

        script_prompt = f"""Create a {num_frames}-panel comic strip script based on this content:

Content/Theme: {script[:3000]}
Character: {character_desc}
Tone: {tone_desc}
Art Style: {art_style}

Return a JSON array of {num_frames} panels:
[
  {{
    "panel_number": 1,
    "scene_description": "Visual description of what to draw in this panel",
    "caption": "Narrative caption (1-2 sentences)",
    "dialogue": "Character dialogue (or null if no dialogue)",
    "emotion": "Character's emotion in this panel",
    "background": "Brief background description"
  }},
  ...
]

Make the story flow: Setup → Rising Action → Conflict → Resolution → Punchline"""

        script_response = invoke_claude(script_prompt, system="Return valid JSON array only.")
        json_match = re.search(r'\[[\s\S]*\]', script_response)
        if not json_match:
            return error('Failed to generate comic script')

        panels_script = json.loads(json_match.group())

        # Step 2: Generate images for each panel with SDXL
        style_prompt = ART_STYLE_PROMPTS.get(art_style, ART_STYLE_PROMPTS['flat'])
        width, height = ORIENTATION_SIZES.get(orientation, (1024, 1024))

        frames = []
        for panel in panels_script[:num_frames]:
            # Build SDXL prompt
            image_prompt = (
                f"{panel['scene_description']}, "
                f"character: {character_desc}, "
                f"emotion: {panel.get('emotion', 'neutral')}, "
                f"background: {panel.get('background', 'simple')}, "
                f"{style_prompt}, "
                f"comic panel, high quality, detailed"
            )

            negative = "realistic photo, blurry, low quality, nsfw, violent, distorted face"

            try:
                image_bytes = invoke_sdxl(image_prompt, negative, width, height)
                s3_key = f'comics/{uuid.uuid4()}/panel_{panel["panel_number"]}.png'
                image_url = upload_image_to_s3(image_bytes, s3_key, S3_BUCKET)
            except Exception as img_err:
                # Fallback: use placeholder
                image_url = f'https://via.placeholder.com/{width}x{height}/0a0d14/00e5ff?text=Panel+{panel["panel_number"]}'

            frames.append({
                'panel_number': panel['panel_number'],
                'image_url': image_url,
                'caption': panel.get('caption', ''),
                'dialogue': panel.get('dialogue'),
                'scene_description': panel.get('scene_description', ''),
            })

        return ok({'frames': frames, 'style': art_style, 'orientation': orientation})

    except Exception as e:
        return error(f'Comic generation failed: {str(e)}')


# ─── Pipeline B: Meme Generation ─────────────────────────────────

def generate_meme(event):
    try:
        body = json.loads(event.get('body', '{}'))
        content_analysis = body.get('content_analysis', {})
        platform = body.get('platform', 'twitter')
        tone = body.get('tone', 'humorous')
        brand_persona = body.get('brand_persona', 'GenZ')
        count = min(int(body.get('count', 3)), 5)

        meme_potential = content_analysis.get('meme_potential', '')
        core_conflict = content_analysis.get('core_conflict', '')
        quotables = content_analysis.get('quotable_moments', [])

        # Step 1: Generate meme concepts with Claude
        meme_prompt = f"""Create {count} meme concepts for this content:

Content angle: {meme_potential}
Core conflict: {core_conflict}
Key quotes: {quotables[:3]}
Platform: {platform}
Brand persona: {brand_persona} (GenZ = max humor/chaos, Professional = subtle wit)
Tone: {tone}

Return a JSON array of {count} meme objects:
[
  {{
    "top_text": "Impact font top text (MAX 8 words, ALL CAPS)",
    "bottom_text": "Punchline bottom text (MAX 8 words, ALL CAPS)",
    "image_concept": "Describe what the meme image shows (for image generation)",
    "format": "classic|drake|distracted|expanding_brain",
    "caption": "Tweet caption to post with this meme (max 240 chars)",
    "hashtags": ["#relevant", "#hashtags"]
  }}
]"""

        meme_response = invoke_claude(meme_prompt, system="Return valid JSON array only.")
        json_match = re.search(r'\[[\s\S]*\]', meme_response)
        if not json_match:
            return error('Failed to generate meme concepts')

        meme_concepts = json.loads(json_match.group())

        # Step 2: Generate images for each meme
        memes = []
        for concept in meme_concepts[:count]:
            image_prompt = (
                f"{concept.get('image_concept', 'funny meme illustration')}, "
                f"meme format, internet humor, viral content, "
                f"flat illustration style, simple background, expressive characters"
            )

            try:
                image_bytes = invoke_sdxl(image_prompt, width=1024, height=1024)
                s3_key = f'memes/{uuid.uuid4()}.png'
                image_url = upload_image_to_s3(image_bytes, s3_key, S3_BUCKET)
            except Exception:
                image_url = 'https://via.placeholder.com/1024x1024/0a0d14/ff6b35?text=Meme'

            memes.append({
                'id': len(memes) + 1,
                'image_url': image_url,
                'top_text': concept.get('top_text', ''),
                'bottom_text': concept.get('bottom_text', ''),
                'caption': concept.get('caption', ''),
                'hashtags': concept.get('hashtags', []),
                'format': concept.get('format', 'classic'),
            })

        return ok({'memes': memes})

    except Exception as e:
        return error(f'Meme generation failed: {str(e)}')


# ─── Pipeline C: Infographic Generation ──────────────────────────

def generate_infographic(event):
    try:
        body = json.loads(event.get('body', '{}'))
        data_points = body.get('data_points', [])
        key_themes = body.get('key_themes', [])
        sentiment = body.get('sentiment', 'professional')
        word_limit = int(body.get('word_limit', 200))
        dimensions = body.get('dimensions', '1080x1080')
        platform = body.get('platform', 'linkedin')

        # Step 1: Create infographic content plan with Claude
        content_prompt = f"""Create a professional infographic for {platform}.

Key themes: {key_themes}
Data points: {data_points}
Sentiment: {sentiment}
Word limit: {word_limit}
Dimensions: {dimensions}

Return a JSON object:
{{
  "title": "Headline (max 8 words)",
  "subtitle": "Supporting line (max 12 words)",
  "sections": [
    {{
      "heading": "Section heading",
      "body": "Section body (max {word_limit // 3} words)",
      "stat": "Key statistic (optional)"
    }}
  ],
  "call_to_action": "CTA text",
  "color_scheme": "describe 3 hex colors that match {sentiment} tone",
  "layout_description": "Describe the infographic layout for image generation",
  "image_prompt": "Detailed SDXL prompt for the infographic visual"
}}"""

        content_response = invoke_claude(content_prompt, system="Return valid JSON only.")
        json_match = re.search(r'\{[\s\S]*\}', content_response)
        if not json_match:
            return error('Failed to generate infographic content')

        infographic_content = json.loads(json_match.group())

        # Step 2: Generate infographic image with SDXL
        width_str, height_str = dimensions.split('x') if 'x' in dimensions else ('1080', '1080')
        width = min(1344, int(int(width_str) * 1024 / 1080))
        height = min(1344, int(int(height_str) * 1024 / 1080))

        # Round to nearest 64 (SDXL requirement)
        width = round(width / 64) * 64
        height = round(height / 64) * 64

        sentiment_style = {
            'professional': 'corporate, clean design, blue and white palette, minimal',
            'inspirational': 'vibrant, warm colors, bold typography, motivational',
            'urgent': 'high contrast, red accents, bold design, attention-grabbing',
            'neutral': 'neutral tones, balanced layout, clean design',
        }.get(sentiment, 'professional')

        image_prompt = (
            f"{infographic_content.get('image_prompt', 'data visualization infographic')}, "
            f"{sentiment_style}, "
            f"professional infographic design, data visualization, "
            f"title: {infographic_content['title']}, "
            f"modern business design, high quality"
        )

        try:
            image_bytes = invoke_sdxl(image_prompt, width=width, height=height)
            s3_key = f'infographics/{uuid.uuid4()}.png'
            image_url = upload_image_to_s3(image_bytes, s3_key, S3_BUCKET)
        except Exception:
            image_url = 'https://via.placeholder.com/1080x1080/0a0d14/b8ff57?text=Infographic'

        return ok({
            'image_url': image_url,
            'content': infographic_content,
            'dimensions': dimensions,
            'platform': platform,
        })

    except Exception as e:
        return error(f'Infographic generation failed: {str(e)}')


# ─── Lambda Handler ───────────────────────────────────────────────

ROUTE_MAP = {
    ('POST', '/transform/comic'):        generate_comic,
    ('POST', '/transform/meme'):         generate_meme,
    ('POST', '/transform/infographic'):  generate_infographic,
}


def lambda_handler(event, context):
    try:
        print(f"Transform handler started")
        method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')

        if method == 'OPTIONS':
            return handle_options()

        handler_fn = ROUTE_MAP.get((method, path))
        if not handler_fn:
            return error(f'Route not found: {method} {path}', 404)

        return handler_fn(event)

    except Exception as e:
        print(f"FATAL ERROR: {str(e)}")
        print(traceback.format_exc())
        return error(f'Fatal error: {str(e)}')
