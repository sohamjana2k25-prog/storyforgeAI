"""
Analysis Lambda
---------------
POST /analyze → Run full content analysis pipeline:
  1. Amazon Comprehend: sentiment, key phrases, entities
  2. Amazon Bedrock (Claude 3): extract themes, quotable moments, statistics
  3. Combine into unified analysis object
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

        # ── Step 1: Amazon Comprehend ─────────────────────────────
        comprehend = get_comprehend_client()

        # Truncate for Comprehend (5000 byte limit per call)
        comprehend_text = text[:4900]

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

        # Process Comprehend results
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

        # ── Step 2: Amazon Bedrock (Claude 3) ────────────────────

        # Chunk text if too long
        text_for_claude = text[:15000] if len(text) > 15000 else text

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
    {{"label": "stat name", "value": "number or %"}},
    ...
  ],
  "summary": "2-3 sentence summary of the core message",
  "humor_score": 0.0-1.0,
  "core_conflict": "the main tension or problem being addressed",
  "target_emotion": "the dominant emotion this content evokes",
  "meme_potential": "describe one specific ironic or humorous angle in this content",
  "comic_storyline": "a 3-act structure for a comic: setup, conflict, resolution"
}}"""

        claude_response = invoke_claude(
            prompt=analysis_prompt,
            system="You are a content analysis expert. Always respond with valid JSON only."
        )

        # Parse Claude response
        json_match = re.search(r'\{[\s\S]*\}', claude_response)
        if json_match:
            ai_analysis = json.loads(json_match.group())
        else:
            ai_analysis = {
                'key_themes': key_phrase_texts[:4],
                'quotable_moments': [],
                'statistics': [],
                'summary': text[:300],
                'humor_score': 0.3,
                'core_conflict': 'Unknown',
                'target_emotion': sentiment,
                'meme_potential': '',
                'comic_storyline': '',
            }

        # ── Step 3: Merge Results ─────────────────────────────────
        result = {
            # From Comprehend
            'sentiment': sentiment,
            'sentiment_numeric': round(sentiment_numeric, 3),
            'comprehend_key_phrases': key_phrase_texts,
            'entities': entities,

            # From Bedrock
            'key_themes': ai_analysis.get('key_themes', []),
            'quotable_moments': ai_analysis.get('quotable_moments', []),
            'statistics': ai_analysis.get('statistics', []),
            'summary': ai_analysis.get('summary', ''),
            'humor_score': ai_analysis.get('humor_score', 0.3),
            'core_conflict': ai_analysis.get('core_conflict', ''),
            'target_emotion': ai_analysis.get('target_emotion', sentiment),
            'meme_potential': ai_analysis.get('meme_potential', ''),
            'comic_storyline': ai_analysis.get('comic_storyline', ''),

            # Meta
            'word_count': len(text.split()),
            'reading_time_minutes': round(len(text.split()) / 200, 1),
        }

        return ok(result)

    except Exception as e:
        return error(f'Analysis failed: {str(e)}')


def lambda_handler(event, context):
    print(f"Event: {json.dumps(event)}")

    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return handle_options()

    if method == 'POST' and event.get('path') == '/analyze':
        return analyze_content(event)

    return error('Route not found', 404)
