"""
Schedule & Distribution Lambda
--------------------------------
POST /schedule/suggest  → AI suggests optimal posting schedule
POST /schedule/create   → Save a scheduled post to DynamoDB
GET  /schedule          → Get all scheduled posts
POST /distribute/twitter → Post to Twitter via API v2
"""

import json
import os
import re
import uuid
import time
from datetime import datetime, timedelta
from utils import ok, error, handle_options, invoke_claude, get_dynamodb_resource

SCHEDULE_TABLE = os.environ.get('SCHEDULE_TABLE', 'contentforge-schedules')
TWITTER_BEARER = os.environ.get('TWITTER_BEARER_TOKEN', '')


# ─── Schedule Suggestions ────────────────────────────────────────

def suggest_schedule(event):
    try:
        body = json.loads(event.get('body', '{}'))
        assets = body.get('assets', [])

        # Build asset descriptions
        asset_list = '\n'.join([
            f"- {a['type']} for {a['platform']}" for a in assets
        ])

        prompt = f"""You are a social media scheduling expert. 
Given these content assets, suggest the optimal posting schedule for the next 2 weeks:

Assets to schedule:
{asset_list}

Platform-specific best practices:
- LinkedIn: Mon-Wed, 8-10 AM or 5-6 PM, professional content
- Twitter: Tue-Thu 12-3 PM, and Fri 3-5 PM for fun content
- Instagram: Mon/Wed/Fri 11 AM-1 PM or 7-9 PM
- Reddit: Tue-Thu, 9 AM or 8 PM, value-first content

Today is {datetime.now().strftime('%A, %B %d, %Y')}.

Return a JSON array of schedule items:
[
  {{
    "asset_type": "comic|meme|infographic",
    "platform": "twitter|linkedin|instagram|reddit",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "reason": "Brief reason why this timing is optimal (max 15 words)"
  }}
]

Include all assets. Space them out — no more than 1-2 posts per day."""

        response = invoke_claude(prompt, system="Return valid JSON array only.")
        json_match = re.search(r'\[[\s\S]*\]', response)
        if not json_match:
            return error('Failed to generate schedule')

        schedule_items = json.loads(json_match.group())

        # Add IDs
        result = [
            {**item, 'id': i + 1, 'type': item.get('asset_type', 'content')}
            for i, item in enumerate(schedule_items)
        ]

        return ok({'schedule': result})

    except Exception as e:
        return error(f'Schedule suggestion failed: {str(e)}')


# ─── Save Schedule Item ────────────────────────────────────────────

def create_schedule(event):
    try:
        body = json.loads(event.get('body', '{}'))

        dynamo = get_dynamodb_resource()
        table = dynamo.Table(SCHEDULE_TABLE)

        item = {
            'id': str(uuid.uuid4()),
            'platform': body.get('platform', ''),
            'type': body.get('type', ''),
            'date': body.get('date', ''),
            'time': body.get('time', ''),
            'image_url': body.get('image_url', ''),
            'caption': body.get('caption', ''),
            'reason': body.get('reason', ''),
            'status': 'scheduled',
            'created_at': int(time.time()),
        }

        table.put_item(Item=item)
        return ok({'scheduled': True, 'item': item})

    except Exception as e:
        return error(f'Schedule creation failed: {str(e)}')


# ─── Get Schedule ─────────────────────────────────────────────────

def get_schedule(event):
    try:
        dynamo = get_dynamodb_resource()
        table = dynamo.Table(SCHEDULE_TABLE)

        result = table.scan(Limit=50)
        items = sorted(result.get('Items', []), key=lambda x: x.get('date', ''))

        return ok({'schedule': items, 'count': len(items)})

    except Exception as e:
        return error(f'Get schedule failed: {str(e)}')


# ─── Twitter Distribution ─────────────────────────────────────────

def post_twitter(event):
    try:
        body = json.loads(event.get('body', '{}'))
        text = body.get('text', '')
        image_url = body.get('image_url', '')

        bearer_token = (
            body.get('bearer_token') or
            os.environ.get('TWITTER_BEARER_TOKEN') or
            TWITTER_BEARER
        )

        if not bearer_token:
            return error('Twitter Bearer Token not configured. Set TWITTER_BEARER_TOKEN env var.', 401)

        if not text:
            return error('text is required', 400)

        import urllib.request

        # Step 1: Upload media if image provided (Twitter API v1.1 for media)
        media_id = None
        if image_url:
            # Download image
            req = urllib.request.Request(image_url)
            with urllib.request.urlopen(req, timeout=10) as resp:
                image_bytes = resp.read()

            # Upload to Twitter
            import base64
            media_b64 = base64.b64encode(image_bytes).decode()

            media_payload = json.dumps({'media_data': media_b64}).encode()
            media_req = urllib.request.Request(
                'https://upload.twitter.com/1.1/media/upload.json',
                data=media_payload,
                headers={
                    'Authorization': f'Bearer {bearer_token}',
                    'Content-Type': 'application/json',
                },
                method='POST',
            )
            with urllib.request.urlopen(media_req, timeout=30) as resp:
                media_result = json.loads(resp.read())
                media_id = str(media_result.get('media_id', ''))

        # Step 2: Create tweet (Twitter API v2)
        tweet_data = {'text': text[:280]}
        if media_id:
            tweet_data['media'] = {'media_ids': [media_id]}

        tweet_payload = json.dumps(tweet_data).encode()
        tweet_req = urllib.request.Request(
            'https://api.twitter.com/2/tweets',
            data=tweet_payload,
            headers={
                'Authorization': f'Bearer {bearer_token}',
                'Content-Type': 'application/json',
            },
            method='POST',
        )
        with urllib.request.urlopen(tweet_req, timeout=15) as resp:
            tweet_result = json.loads(resp.read())

        return ok({
            'posted': True,
            'tweet_id': tweet_result.get('data', {}).get('id'),
            'tweet_url': f"https://twitter.com/i/web/status/{tweet_result.get('data', {}).get('id', '')}",
        })

    except Exception as e:
        return error(f'Twitter post failed: {str(e)}')


# ─── Lambda Handler ───────────────────────────────────────────────

ROUTE_MAP = {
    ('POST', '/schedule/suggest'):    suggest_schedule,
    ('POST', '/schedule/create'):     create_schedule,
    ('GET', '/schedule'):             get_schedule,
    ('POST', '/distribute/twitter'): post_twitter,
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
