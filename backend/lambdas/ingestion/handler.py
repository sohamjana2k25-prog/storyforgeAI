"""
Ingestion Lambda Functions
--------------------------
Handles three input sources:
1. POST /ingest/url   → Fetch & parse blog/article URL
2. POST /ingest/pdf   → Extract text from S3-stored PDF via Amazon Textract
3. POST /ingest/youtube → Transcribe YouTube video via Amazon Transcribe
4. POST /upload/presign → Generate S3 presigned upload URL
5. GET  /health       → Health check
"""

import json
import os
import re
import time
import uuid
import boto3
from utils import ok, error, handle_options, get_textract_client, get_transcribe_client, get_s3_client

S3_BUCKET = os.environ.get('S3_BUCKET', '')
TRANSCRIPTS_PREFIX = 'transcripts/'
UPLOADS_PREFIX = 'uploads/'


# ─── URL Ingestion ────────────────────────────────────────────────

def ingest_url(event):
    try:
        body = json.loads(event.get('body', '{}'))
        url = body.get('url', '').strip()

        if not url:
            return error('url is required', 400)

        # Use Lambda's outbound internet access to fetch URL
        import urllib.request
        from html.parser import HTMLParser

        class TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.text_parts = []
                self._skip = False

            def handle_starttag(self, tag, attrs):
                if tag in ('script', 'style', 'nav', 'header', 'footer'):
                    self._skip = True

            def handle_endtag(self, tag):
                if tag in ('script', 'style', 'nav', 'header', 'footer'):
                    self._skip = False

            def handle_data(self, data):
                if not self._skip:
                    clean = data.strip()
                    if len(clean) > 20:
                        self.text_parts.append(clean)

        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 ContentForge/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        parser = TextExtractor()
        parser.feed(html)
        text = '\n'.join(parser.text_parts)

        # Extract title
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else 'Untitled'

        return ok({
            'text': text[:50000],  # 50k char limit
            'title': title,
            'source': url,
            'char_count': len(text),
        })

    except Exception as e:
        return error(f'URL ingestion failed: {str(e)}')


# ─── PDF Ingestion via Amazon Textract ───────────────────────────

def ingest_pdf(event):
    try:
        body = json.loads(event.get('body', '{}'))
        s3_key = body.get('s3_key', '').strip()

        if not s3_key:
            return error('s3_key is required', 400)

        textract = get_textract_client()

        # Start async document analysis
        resp = textract.start_document_text_detection(
            DocumentLocation={
                'S3Object': {
                    'Bucket': S3_BUCKET,
                    'Name': s3_key,
                }
            }
        )
        job_id = resp['JobId']

        # Poll for completion (max 60s)
        for _ in range(30):
            time.sleep(2)
            result = textract.get_document_text_detection(JobId=job_id)
            status = result['JobStatus']
            if status == 'SUCCEEDED':
                break
            if status == 'FAILED':
                return error('Textract job failed')

        # Extract all text blocks
        blocks = result.get('Blocks', [])
        text_lines = [
            b['Text'] for b in blocks
            if b['BlockType'] == 'LINE' and b.get('Text')
        ]
        text = '\n'.join(text_lines)

        return ok({
            'text': text[:50000],
            'source': s3_key,
            'page_count': len(set(b.get('Page', 1) for b in blocks)),
            'char_count': len(text),
        })

    except Exception as e:
        return error(f'PDF ingestion failed: {str(e)}')


# ─── YouTube Transcription via Amazon Transcribe ─────────────────

def ingest_youtube(event):
    try:
        body = json.loads(event.get('body', '{}'))
        video_url = body.get('url', '').strip()

        if not video_url:
            return error('url is required', 400)

        # Extract video ID and download audio via pytube
        from pytube import YouTube

        yt = YouTube(video_url)
        audio_stream = yt.streams.filter(only_audio=True).first()

        if not audio_stream:
            return error('No audio stream found in video')

        # Download audio to /tmp
        audio_path = f'/tmp/{uuid.uuid4()}.mp4'
        audio_stream.download(filename=audio_path)

        # Upload audio to S3 for Transcribe
        s3 = get_s3_client()
        s3_key = f'{TRANSCRIPTS_PREFIX}{uuid.uuid4()}.mp4'
        with open(audio_path, 'rb') as f:
            s3.upload_fileobj(f, S3_BUCKET, s3_key)

        # Start Transcribe job
        transcribe = get_transcribe_client()
        job_name = f'contentforge-{uuid.uuid4().hex[:8]}'

        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f's3://{S3_BUCKET}/{s3_key}'},
            MediaFormat='mp4',
            LanguageCode='en-US',  # Auto-detect could be added
            OutputBucketName=S3_BUCKET,
            OutputKey=f'{TRANSCRIPTS_PREFIX}{job_name}.json',
        )

        # Poll for completion (max 5 min for YouTube videos)
        for _ in range(75):
            time.sleep(4)
            result = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            status = result['TranscriptionJob']['TranscriptionJobStatus']
            if status == 'COMPLETED':
                break
            if status == 'FAILED':
                return error('Transcription failed')

        # Fetch transcript from S3
        s3_result = s3.get_object(Bucket=S3_BUCKET, Key=f'{TRANSCRIPTS_PREFIX}{job_name}.json')
        transcript_data = json.loads(s3_result['Body'].read())
        text = transcript_data['results']['transcripts'][0]['transcript']

        return ok({
            'text': text,
            'title': yt.title,
            'source': video_url,
            'duration_seconds': yt.length,
            'char_count': len(text),
        })

    except Exception as e:
        return error(f'YouTube ingestion failed: {str(e)}')


# ─── S3 Presigned Upload URL ──────────────────────────────────────

def presign_upload(event):
    try:
        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename', 'upload.pdf')
        content_type = body.get('content_type', 'application/pdf')

        s3_key = f'{UPLOADS_PREFIX}{uuid.uuid4()}/{filename}'
        
        # Force regional endpoint to fix CORS
        region = os.environ.get('AWS_REGION', 'ap-south-1')
        s3 = boto3.client(
            's3',
            region_name=region,
            endpoint_url=f'https://s3.{region}.amazonaws.com'
        )

        upload_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key,
                'ContentType': content_type,
            },
            ExpiresIn=900,
        )

        return ok({'upload_url': upload_url, 's3_key': s3_key})

    except Exception as e:
        return error(f'Presign failed: {str(e)}')

# ─── Health Check ─────────────────────────────────────────────────

def health(event):
    return ok({
        'status': 'healthy',
        'service': 'ContentForge Ingestion Layer',
        'aws_region': os.environ.get('AWS_REGION', 'unknown'),
        's3_bucket': bool(S3_BUCKET),
        'timestamp': int(time.time()),
    })


# ─── Lambda Handler ───────────────────────────────────────────────

ROUTE_MAP = {
    ('POST', '/ingest/url'):       ingest_url,
    ('POST', '/ingest/pdf'):       ingest_pdf,
    ('POST', '/ingest/youtube'):   ingest_youtube,
    ('POST', '/upload/presign'):   presign_upload,
    ('GET', '/health'):            health,
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
