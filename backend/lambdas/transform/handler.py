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
        num_frames = 1

        tone_desc = 'humorous and casual' if brand_tone > 60 else 'professional and serious' if brand_tone < 30 else 'balanced'

        script_prompt = f"""Create a 1-panel comic strip script based on this content:

Content/Theme: {script[:3000]}
Character: {character_desc}
Tone: {tone_desc}
Art Style: {art_style}

Return a JSON array of exactly 1 panel:
[
  {{
    "panel_number": 1,
    "scene_description": "Visual description of what to draw in this panel",
    "caption": "Narrative caption (1-2 sentences)",
    "dialogue": "Character dialogue (or null if no dialogue)",
    "emotion": "Character emotion in this panel",
    "background": "Brief background description"
  }}
]"""

        print("Calling LLM for comic script...")
        script_response = invoke_claude(script_prompt, system="Return valid JSON array only. No extra text.", max_tokens=500)
        print(f"LLM response length: {len(script_response)}")

        text = script_response
        depth, start, end = 0, None, None
        for idx, ch in enumerate(text):
            if ch == '[' and start is None:
                start, depth = idx, 1
            elif ch == '[' and start is not None:
                depth += 1
            elif ch == ']' and start is not None:
                depth -= 1
                if depth == 0:
                    end = idx + 1
                    break

        if start is None or end is None:
            return error('Failed to generate comic script')

        try:
            panels_script = json.loads(text[start:end])
        except Exception as pe:
            print(f"JSON parse error: {str(pe)}")
            return error('Failed to parse comic script')

        print(f"Parsed {len(panels_script)} panels")

        style_prompt = ART_STYLE_PROMPTS.get(art_style, ART_STYLE_PROMPTS['flat'])
        width, height = 1024, 1024

        panel = panels_script[0]
        try:
            print("Generating real image for panel 1...")
            scene = panel.get('scene_description', 'a person at work')
            scene = scene[:100]
            image_prompt = (
                f"cartoon flat design illustration, "
                f"{scene}, "
                f"family friendly, colorful, clean background, "
                f"professional comic panel, {style_prompt}"
            )
            negative = "blurry, low quality, distorted, text, watermark, nsfw, violent"
            image_bytes = invoke_sdxl(image_prompt, negative, width, height)
            s3_key = f'comics/{uuid.uuid4()}/panel_1.png'
            image_url = upload_image_to_s3(image_bytes, s3_key, S3_BUCKET)
            print("Panel 1 image uploaded successfully")
        except Exception as img_err:
            print(f"Panel 1 image failed, using placeholder: {str(img_err)}")
            image_url = placeholder(width, height, 'Panel+1')

        frames = [{
            'panel_number': 1,
            'image_url': image_url,
            'caption': panel.get('caption', ''),
            'dialogue': panel.get('dialogue'),
            'scene_description': panel.get('scene_description', ''),
        }]

        print("Comic done, 1 frame")
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
        meme_response = invoke_claude(meme_prompt, system="Return valid JSON array only. No extra text.", max_tokens=500)
        print(f"LLM meme response length: {len(meme_response)}")

        json_match = re.search(r'\[[\s\S]*\]', meme_response)
        if not json_match:
            return error('Failed to generate meme concepts')

        meme_concepts = json.loads(json_match.group())
        print(f"Parsed {len(meme_concepts)} meme concepts")

        concept = meme_concepts[0]
        image_prompt = (
            f"cartoon illustration, funny expression, "
            f"simple clean background, bright colors, "
            f"family friendly meme style, flat design, "
            f"expressive character, internet humor aesthetic"
        )
        negative = "blurry, low quality, distorted, text, watermark, nsfw, violent"

        try:
            print("Generating meme image...")
            image_bytes = invoke_sdxl(image_prompt, negative, width=1024, height=1024)
            s3_key = f'memes/{uuid.uuid4()}.png'
            image_url = upload_image_to_s3(image_bytes, s3_key, S3_BUCKET)
            print("Meme image uploaded successfully")
        except Exception as img_err:
            print(f"Meme image error: {str(img_err)}")
            image_url = placeholder(1024, 1024, 'Meme', 'ff6b35')

        memes = [{
            'id': 1,
            'image_url': image_url,
            'top_text': concept.get('top_text', ''),
            'bottom_text': concept.get('bottom_text', ''),
            'caption': concept.get('caption', ''),
            'hashtags': concept.get('hashtags', []),
            'format': concept.get('format', 'classic'),
        }]

        print("Meme done, 1 meme")
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

        # Try up to 2 times in case Mistral returns broken JSON
        response = None
        for attempt in range(2):
            response = invoke_claude(content_prompt, system="Return valid JSON only. No markdown. No backticks. No extra text.", max_tokens=800)
            first_brace = response.find('{')
            last_brace = response.rfind('}')
            if first_brace != -1 and last_brace != -1:
                try:
                    json.loads(response[first_brace:last_brace+1])
                    print(f"Valid JSON on attempt {attempt+1}")
                    break
                except:
                    print(f"Invalid JSON on attempt {attempt+1}, retrying...")
            else:
                print(f"No JSON found on attempt {attempt+1}, retrying...")

        print(f"LLM response length: {len(response)}")

        cleaned = response.strip()
        cleaned = re.sub(r'```json\s*', '', cleaned)
        cleaned = re.sub(r'```\s*', '', cleaned)
        cleaned = cleaned.strip()

        first_brace = cleaned.find('{')
        last_brace = cleaned.rfind('}')
        if first_brace != -1 and last_brace != -1:
            cleaned = cleaned[first_brace:last_brace+1]

        # Fix Mistral JSON issues
        cleaned = re.sub(r'\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', cleaned)
        cleaned = re.sub(r',\s*}', '}', cleaned)
        cleaned = re.sub(r',\s*]', ']', cleaned)

        try:
            content = json.loads(cleaned)
            print("LinkedIn post parsed successfully")
        except Exception as je:
            print(f"Parse error: {str(je)}")
            print(f"Cleaned JSON attempt: {cleaned[:200]}")
            try:
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    content = json.loads(json_match.group())
                    print("LinkedIn post parsed via regex fallback")
                else:
                    raise Exception("No JSON found")
            except Exception:
                print("All parsing failed, using fallback content")
                content = {
                    'title': f'Key Insights: {", ".join(str(t) for t in key_themes[:2]) if key_themes else "Content Analysis"}',
                    'body': 'Here are the key themes from our analysis:\n\n' + '\n'.join([f'• {t}' for t in key_themes]),
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
