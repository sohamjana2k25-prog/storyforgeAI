"""
Analysis Lambda
"""

import json
import os
import re
from utils import ok, error, handle_options, get_comprehend_client, invoke_claude, chunk_text


def analyze_content(event):
    try:
        body = json.loads(event.get('body', '{}'))
        text = body.get('text', '').strip()
        target_audience = body.get('target_audience', 'general')
        tone_preference = body.get('tone', 'balanced')

        if not text:
            return error('text is required', 400)

        print(f"Analyzing text of length: {len(text)}")

        # ── Step 1: Amazon Comprehend ─────────────────────────────
        try:
            comprehend = get_comprehend_client()
            # Fix: encode to bytes and truncate to 4900 bytes not chars
            comprehend_text = text.encode('utf-8')[:4900].decode('utf-8', errors='ignore')

            sentiment_resp = comprehend.detect_sentiment(
                Text=comprehend_text,
                LanguageCode='en'
            )
            key_phrases_resp = comprehend.detect_key_phrases(
                Text=comprehend_text,
                LanguageCode='en'
            )
            entities_resp = comprehend.detect_entities(
                Text=comprehend_text,
                LanguageCode='en'
            )

            sentiment = sentiment_resp['Sentiment']
            sentiment_score = sentiment_resp['SentimentScore']
            sentiment_numeric = sentiment_score.get('Positive', 0) - sentiment_score.get('Negative', 0)

            key_phrases = sorted(
                key_phrases_resp['KeyPhrases'],
                key=lambda x: x['Score'],
                reverse=True
            )[:10]
            key_phrase_texts = [p['Text'] for p in key_phrases]

            entities = [
                {'text': e['Text'], 'type': e['Type'], 'score': round(e['Score'], 2)}
                for e in entities_resp['Entities']
                if e['Score'] > 0.85
            ][:10]

            print(f"Comprehend done. Sentiment: {sentiment}")

        except Exception as e:
            print(f"Comprehend failed: {str(e)}")
            sentiment = 'NEUTRAL'
            sentiment_numeric = 0
            key_phrase_texts = []
            entities = []

        # ── Step 2: Mistral via Bedrock ───────────────────────────
        try:
            text_for_claude = text[:8000] if len(text) > 8000 else text

            analysis_prompt = f"""Analyze the following content and extract structured insights.
Target audience: {target_audience}
Tone preference: {tone_preference}

Content:
---
{text_for_claude}
---

Return a JSON object with EXACTLY these fields (no extra text, just JSON):
{{
  "key_themes": ["theme1", "theme2", "theme3", "theme4"],
  "quotable_moments": ["punchy quote 1", "punchy quote 2", "punchy quote 3"],
  "statistics": [
    {{"label": "stat name", "value": "number or %"}}
  ],
  "summary": "2-3 sentence summary of the core message",
  "humor_score": 0.3,
  "core_conflict": "the main tension or problem being addressed",
  "target_emotion": "the dominant emotion this content evokes",
  "meme_potential": "describe one specific ironic or humorous angle in this content",
  "comic_storyline": "a 3-act structure for a comic: setup, conflict, resolution"
}}"""

            print("Calling Mistral...")
            claude_response = invoke_claude(
                prompt=analysis_prompt,
                system="You are a content analysis expert. Always respond with valid JSON only. No markdown, no backticks, no extra text."
            )
            print(f"Mistral response length: {len(claude_response)}")

            # Fix: clean response before parsing
            cleaned = claude_response.strip()
            cleaned = re.sub(r'^```json\s*', '', cleaned)
            cleaned = re.sub(r'^```\s*', '', cleaned)
            cleaned = re.sub(r'```\s*$', '', cleaned)
            cleaned = cleaned.strip()
            cleaned = cleaned.replace('\t', '  ')

            json_match = re.search(r'\{[\s\S]*\}', cleaned)
            if json_match:
                ai_analysis = json.loads(json_match.group())
                print("Mistral JSON parsed successfully")
            else:
                raise Exception("No JSON found in Mistral response")

        except Exception as e:
            print(f"Mistral failed: {str(e)}")
            ai_analysis = {
                'key_themes': key_phrase_texts[:4],
                'quotable_moments': [],
                'statistics': [],
                'summary': text[:300],
                'humor_score': 0.3,
                'core_conflict': 'Unknown',
                'target_emotion': sentiment,
                'meme_potential': 'ironic contrast between expectation and reality',
                'comic_storyline': 'Setup: introduce the topic. Conflict: show the challenge. Resolution: reveal the insight.',
            }

        # ── Step 3: Merge Results ─────────────────────────────────
        result = {
            'sentiment': sentiment,
            'sentiment_numeric': round(sentiment_numeric, 3),
            'comprehend_key_phrases': key_phrase_texts,
            'entities': entities,
            'key_themes': ai_analysis.get('key_themes', []),
            'quotable_moments': ai_analysis.get('quotable_moments', []),
            'statistics': ai_analysis.get('statistics', []),
            'summary': ai_analysis.get('summary', ''),
            'humor_score': ai_analysis.get('humor_score', 0.3),
            'core_conflict': ai_analysis.get('core_conflict', ''),
            'target_emotion': ai_analysis.get('target_emotion', sentiment),
            'meme_potential': ai_analysis.get('meme_potential', ''),
            'comic_storyline': ai_analysis.get('comic_storyline', ''),
            'word_count': len(text.split()),
            'reading_time_minutes': round(len(text.split()) / 200, 1),
        }

        print(f"Analysis complete: {json.dumps(result)[:200]}")
        return ok(result)

    except Exception as e:
        print(f"FATAL ERROR: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return error(f'Analysis failed: {str(e)}')


def lambda_handler(event, context):
    print(f"Event: {json.dumps(event)}")

    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return handle_options()

    if method == 'POST' and event.get('path') == '/analyze':
        return analyze_content(event)

    return error('Route not found', 404)
