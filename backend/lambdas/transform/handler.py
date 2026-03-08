"""
Transform Lambda — The Transformation Engine
--------------------------------------------
POST /transform/comic         → Pipeline A: Visual Narrative (Comic/Webtoon)
POST /transform/meme          → Pipeline B: Viral Visuals (Memes)
POST /transform/infographic   → Pipeline C: LinkedIn Post Generation
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
        num_frames = min(int(body.get('frames', 4)), 4)

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

        width, height = 1024, 1024

        frames = []
        for panel in panels_script[:num_frames]:
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
        count = 1

        meme_potential = content_analysis.get('meme_potential', '')
        core_conflict = content_analysis.get('core_conflict', '')
        quotables = content_analysis.get('quotable_moments', [])

        meme_prompt = f"""Create 1 meme concept for this content:

Content angle: {meme_potential}
Core conflict: {core_conflict}
Key quotes: {quotables[:3]}
Platform: {platform}
Brand persona: {brand_persona}
Tone: {tone}

Return a JSON array with exactly 1 meme object:
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
        key_themes = body.get('key_themes', [])
        data_points = body.get('data_points', [])
        sentiment = body.get('sentiment', 'professional')
        word_limit = int(body.get('word_limit', 200))
        platform = body.get('platform', 'linkedin')

        print("Calling LLM for LinkedIn post...")
        content_prompt = f"""Write a professional LinkedIn post based on this content.

Key themes: {key_themes}
Data points: {data_points}
Tone: {sentiment}
Word limit: {word_limit} words

Return ONLY this JSON object, no extra text:
{{
  "title": "Bold opening statement that grabs attention",
  "body": "Main post body with insights and value. Use newlines for readability.",
  "hashtags": ["#Topic1", "#Topic2", "#Topic3", "#Topic4", "#Topic5"],
  "hook": "One compelling hook sentence",
  "cta": "Engaging call to action question for comments"
}}"""

        response = invoke_claude(content_prompt, system="Return valid JSON only. No markdown. No backticks. No extra text.")
        print(f"LLM response length: {len(response)}")

        cleaned = response.strip()
        cleaned = re.sub(r'```json\s*', '', cleaned)
        cleaned = re.sub(r'```\s*', '', cleaned)
        cleaned = cleaned.strip()

        try:
            json_match = re.search(r'\{[\s\S]*\}', cleaned)
            if json_match:
                content = json.loads(json_match.group())
                print("LinkedIn post parsed successfully")
            else:
                raise Exception("No JSON found")
        except Exception as je:
            print(f"Parse error: {str(je)}, using fallback")
            content = {
                'title': f'Key Insights: {", ".join(key_themes[:2]) if key_themes else "Content Analysis"}',
                'body': f'Here are the key themes from our analysis:\n\n' + '\n'.join([f'• {t}' for t in key_themes]),
                'hashtags': ['#LinkedIn', '#ContentMarketing', '#Insights', '#AI', '#ContentForge'],
                'hook': 'Here are the key takeaways you need to know.',
                'cta': 'What are your thoughts? Share in the comments below!',
            }

        print("LinkedIn post generation done")
        return ok({
            'type': 'linkedin_post',
            'content': content,
            'platform': platform,
        })

    except Exception as e:
        print(f"Infographic error: {str(e)}")
        print(traceback.format_exc())
        return error(f'LinkedIn post generation failed: {str(e)}')


ROUTE_MAP = {
    ('POST', '/transform/comic'):        generate_comic,
    ('POST', '/transform/meme'):         generate_meme,
    ('POST', '/transform/infographic'):  generate_infographic,
}


def lambda_handler(event, context):
    print(f"Transform handler started")
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    print(f"Method: {method}, Path: {path}")

    if method == 'OPTIONS':
        return handle_options()

    handler_fn = ROUTE_MAP.get((method, path))
    if not handler_fn:
        return error(f'Route not found: {method} {path}', 404)

    try:
        result = handler_fn(event)
        print(f"Result status: {result.get('statusCode')}")
        return result
    except Exception as e:
        print(f"FATAL: {str(e)}")
        print(traceback.format_exc())
        return error(f'Fatal error: {str(e)}')
