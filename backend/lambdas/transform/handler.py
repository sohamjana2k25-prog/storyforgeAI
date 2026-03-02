"""
Transform Lambda — The Transformation Engine
--------------------------------------------
POST /transform/comic       → Pipeline A: Visual Narrative (Comic/Webtoon)
POST /transform/meme        → Pipeline B: Viral Visuals (Memes)
POST /transform/infographic → Pipeline C: Professional Visuals (Infographics)

Uses:
  - Mistral 7B: Script & prompt generation
  - Amazon Titan Image Generator: Image generation
  - Amazon S3: Store generated images
"""

import json
import os
import re
import uuid
import traceback
from utils import (ok, error, handle_options, invoke_claude, invoke_sdxl,
                   upload_image_to_s3, get_s3_client)

S3_BUCKET = os.environ.get('S3_BUCKET', '')

ART_STYLE_PROMPTS = {
    'anime': 'anime style, manga, high quality illustration, vibrant colors, detailed linework',
    'minimalist': 'minimalist style, clean lines, flat design, simple shapes, white space',
    'flat': 'flat design illustration, bold colors, geometric shapes, modern graphic design',
    'pixel': 'pixel art style, 8-bit, retro gaming aesthetic, pixelated',
    'sketch': 'pencil sketch style, hand-drawn, crosshatching, ink illustration',
    'corporate': 'professional corporate illustration, clean business style, neutral colors',
}

TITAN_SIZES = [512, 768, 1024]

def get_titan_size(width, height):
    w = min(TITAN_SIZES, key=lambda x: abs(x - width))
    h = min(TITAN_SIZES, key=lambda x: abs(x - height))
    return w, h

def placeholder(width, height, text, color='00e5ff'):
    return f'https://placehold.co/{width}x{height}/0a0d14/{color}?text={text}'


def generate_comic(event):
    print("generate_comic started")
    try:
        body = json.loads(event.get('body', '{}'))
        script = body.get('script', '')
        orientation = body.get('orientation', 'square')
        art_style = body.get('art_style', 'flat')
        brand_tone = body.get('brand_tone', 50)
        character_desc = body.get('character_description', 'A young professional')
        num_frames = min(int(body.get('frames', 10)), 12)

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
    "emotion": "Character emotion in this panel",
    "background": "Brief background description"
  }}
]

Make the story flow: Setup Rising Action Conflict Resolution Punchline"""

        print("Calling LLM for comic script...")
        script_response = invoke_claude(script_prompt, system="Return valid JSON array only. No extra text.")
        print(f"LLM response length: {len(script_response)}")

        json_match = re.search(r'\[[\s\S]*\]', script_response)
        if not json_match:
            return error('Failed to generate comic script')

        panels_script = json.loads(json_match.group())
        print(f"Parsed {len(panels_script)} panels")

        style_prompt = ART_STYLE_PROMPTS.get(art_style, ART_STYLE_PROMPTS['flat'])
        width, height = 1024, 1024

        frames = []
        for panel in panels_script[:num_frames]:
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
                print(f"Generating image for panel {panel['panel_number']}...")
                image_bytes = invoke_sdxl(image_prompt, negative, width, height)
                s3_key = f'comics/{uuid.uuid4()}/panel_{panel["panel_number"]}.png'
                image_url = upload_image_to_s3(image_bytes, s3_key, S3_BUCKET)
                print(f"Panel {panel['panel_number']} image uploaded")
            except Exception as img_err:
                print(f"Image error panel {panel['panel_number']}: {str(img_err)}")
                image_url = placeholder(width, height, f'Panel+{panel["panel_number"]}')

            frames.append({
                'panel_number': panel['panel_number'],
                'image_url': image_url,
                'caption': panel.get('caption', ''),
                'dialogue': panel.get('dialogue'),
                'scene_description': panel.get('scene_description', ''),
            })

        print(f"Comic done, {len(frames)} frames")
        return ok({'frames': frames, 'style': art_style, 'orientation': orientation})

    except Exception as e:
        print(f"Comic error: {str(e)}")
        print(traceback.format_exc())
        return error(f'Comic generation failed: {str(e)}')


def generate_meme(event):
    print("generate_meme started")
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

        meme_prompt = f"""Create {count} meme concepts for this content:

Content angle: {meme_potential}
Core conflict: {core_conflict}
Key quotes: {quotables[:3]}
Platform: {platform}
Brand persona: {brand_persona}
Tone: {tone}

Return a JSON array of {count} meme objects:
[
  {{
    "top_text": "Impact font top text MAX 8 words ALL CAPS",
    "bottom_text": "Punchline bottom text MAX 8 words ALL CAPS",
    "image_concept": "Describe what the meme image shows",
    "format": "classic",
    "caption": "Tweet caption max 240 chars",
    "hashtags": ["#relevant"]
  }}
]"""

        print("Calling LLM for meme concepts...")
        meme_response = invoke_claude(meme_prompt, system="Return valid JSON array only. No extra text.")
        print(f"LLM meme response length: {len(meme_response)}")

        json_match = re.search(r'\[[\s\S]*\]', meme_response)
        if not json_match:
            return error('Failed to generate meme concepts')

        meme_concepts = json.loads(json_match.group())
        print(f"Parsed {len(meme_concepts)} meme concepts")

        memes = []
        for concept in meme_concepts[:count]:
            image_prompt = (
                f"{concept.get('image_concept', 'funny meme illustration')}, "
                f"meme format, internet humor, viral content, "
                f"flat illustration style, simple background, expressive characters"
            )

            try:
                print(f"Generating meme image {len(memes)+1}...")
                image_bytes = invoke_sdxl(image_prompt, width=1024, height=1024)
                s3_key = f'memes/{uuid.uuid4()}.png'
                image_url = upload_image_to_s3(image_bytes, s3_key, S3_BUCKET)
                print(f"Meme image {len(memes)+1} uploaded")
            except Exception as img_err:
                print(f"Meme image error: {str(img_err)}")
                image_url = placeholder(1024, 1024, 'Meme', 'ff6b35')

            memes.append({
                'id': len(memes) + 1,
                'image_url': image_url,
                'top_text': concept.get('top_text', ''),
                'bottom_text': concept.get('bottom_text', ''),
                'caption': concept.get('caption', ''),
                'hashtags': concept.get('hashtags', []),
                'format': concept.get('format', 'classic'),
            })

        print(f"Meme done, {len(memes)} memes")
        return ok({'memes': memes})

    except Exception as e:
        print(f"Meme error: {str(e)}")
        print(traceback.format_exc())
        return error(f'Meme generation failed: {str(e)}')


def generate_infographic(event):
    print("generate_infographic started")
    try:
        body = json.loads(event.get('body', '{}'))
        data_points = body.get('data_points', [])
        key_themes = body.get('key_themes', [])
        sentiment = body.get('sentiment', 'professional')
        word_limit = int(body.get('word_limit', 200))
        dimensions = body.get('dimensions', '1080x1080')
        platform = body.get('platform', 'linkedin')

        content_prompt = f"""Create a professional infographic for {platform}.

Key themes: {key_themes}
Data points: {data_points}
Sentiment: {sentiment}
Word limit: {word_limit}

Return a JSON object:
{{
  "title": "Headline max 8 words",
  "subtitle": "Supporting line max 12 words",
  "sections": [
    {{
      "heading": "Section heading",
      "body": "Section body",
      "stat": "Key statistic"
    }}
  ],
  "call_to_action": "CTA text",
  "image_prompt": "Detailed prompt for infographic visual"
}}"""

        print("Calling LLM for infographic content...")
        content_response = invoke_claude(content_prompt, system="Return valid JSON only. No extra text.")
        print(f"LLM infographic response length: {len(content_response)}")

        json_match = re.search(r'\{[\s\S]*\}', content_response)
        if not json_match:
            return error('Failed to generate infographic content')

        infographic_content = json.loads(json_match.group())
        print("Infographic content parsed")

        width, height = 1024, 1024

        sentiment_style = {
            'professional': 'corporate clean design blue white palette minimal',
            'inspirational': 'vibrant warm colors bold typography motivational',
            'urgent': 'high contrast red accents bold design attention-grabbing',
            'neutral': 'neutral tones balanced layout clean design',
        }.get(sentiment, 'professional')

        image_prompt = (
            f"{infographic_content.get('image_prompt', 'data visualization infographic')}, "
            f"{sentiment_style}, "
            f"professional infographic design, data visualization, "
            f"modern business design, high quality"
        )

        try:
            print(f"Generating infographic image...")
            image_bytes = invoke_sdxl(image_prompt, width=width, height=height)
            s3_key = f'infographics/{uuid.uuid4()}.png'
            image_url = upload_image_to_s3(image_bytes, s3_key, S3_BUCKET)
            print("Infographic image uploaded to S3")
        except Exception as img_err:
            print(f"Infographic image error: {str(img_err)}")
            image_url = placeholder(1024, 1024, 'Infographic', 'b8ff57')

        print("Infographic done")
        return ok({
            'image_url': image_url,
            'content': infographic_content,
            'dimensions': dimensions,
            'platform': platform,
        })

    except Exception as e:
        print(f"Infographic error: {str(e)}")
        print(traceback.format_exc())
        return error(f'Infographic generation failed: {str(e)}')


ROUTE_MAP = {
    ('POST', '/transform/comic'):        generate_comic,
    ('POST', '/transform/meme'):         generate_meme,
    ('POST', '/transform/infographic'):  generate_infographic,
}


def lambda_handler(event, context):
    print(f"Event: {json.dumps(event)}")

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')

    if method == 'OPTIONS':
        return handle_options()

    handler_fn = ROUTE_MAP.get((method, path))
    if not handler_fn:
        return error(f'Route not found: {method} {path}', 404)

    return handler_fn(event)
