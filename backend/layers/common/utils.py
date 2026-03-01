"""
Shared utilities for all Lambda functions.
Deployed as a Lambda Layer: /opt/python/utils.py
"""
import json
import os
import boto3
from botocore.exceptions import ClientError


# ─── CORS Headers ────────────────────────────────────────────────

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,x-aws-access-key,x-aws-secret-key,x-aws-session-token,x-aws-region,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
}


def response(status_code: int, body: dict) -> dict:
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body),
    }


def ok(body: dict) -> dict:
    return response(200, body)


def error(message: str, status: int = 500) -> dict:
    return response(status, {'error': message})


def handle_options() -> dict:
    """Handle CORS preflight"""
    return response(200, {})


# ─── AWS Clients ─────────────────────────────────────────────────

def get_bedrock_client(region: str = None):
    return boto3.client(
        'bedrock-runtime',
        region_name=region or os.environ.get('AWS_REGION', 'ap-south-1')
    )


def get_comprehend_client(region: str = None):
    return boto3.client(
        'comprehend',
        region_name=region or os.environ.get('AWS_REGION', 'ap-south-1')
    )


def get_s3_client(region: str = None):
    return boto3.client(
        's3',
        region_name=region or os.environ.get('AWS_REGION', 'ap-south-1')
    )


def get_textract_client(region: str = None):
    return boto3.client(
        'textract',
        region_name=region or os.environ.get('AWS_REGION', 'ap-south-1')
    )


def get_transcribe_client(region: str = None):
    return boto3.client(
        'transcribe',
        region_name=region or os.environ.get('AWS_REGION', 'ap-south-1')
    )


def get_dynamodb_resource(region: str = None):
    return boto3.resource(
        'dynamodb',
        region_name=region or os.environ.get('AWS_REGION', 'ap-south-1')
    )


# ─── Bedrock Helpers ─────────────────────────────────────────────

def invoke_claude(prompt: str, system: str = None, max_tokens: int = 4096) -> str:
    """
    Invoke Claude 3 Sonnet via Amazon Bedrock.
    Model: anthropic.claude-3-sonnet-20240229-v1:0
    """
    client = get_bedrock_client()

    messages = [{'role': 'user', 'content': prompt}]
    body = {
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': max_tokens,
        'messages': messages,
    }
    if system:
        body['system'] = system

    resp = client.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps(body),
        contentType='application/json',
        accept='application/json',
    )

    result = json.loads(resp['body'].read())
    return result['content'][0]['text']


def invoke_sdxl(prompt: str, negative_prompt: str = '', width: int = 1024, height: int = 1024) -> bytes:
    """
    Invoke Stable Diffusion XL via Amazon Bedrock.
    Model: stability.stable-diffusion-xl-v1
    Returns raw image bytes (PNG).
    """
    import base64
    client = get_bedrock_client()

    body = {
    'taskType': 'TEXT_IMAGE',
    'textToImageParams': {
        'text': prompt,
        'negativeText': negative_prompt or 'blurry, low quality, distorted',
    },
    'imageGenerationConfig': {
        'numberOfImages': 1,
        'width': min(width, 1024),
        'height': min(height, 1024),
        'cfgScale': 8.0,
    }
    }
    resp = client.invoke_model(
        modelId='amazon.titan-image-generator-v1',
        body=json.dumps(body),
        contentType='application/json',
        accept='application/json',
    )

    result = json.loads(resp['body'].read())
    image_b64 = result['images'][0]
    return base64.b64decode(image_b64)


def upload_image_to_s3(image_bytes: bytes, key: str, bucket: str = None) -> str:
    """Upload image to S3 and return presigned URL."""
    s3 = get_s3_client()
    bucket = bucket or os.environ.get('S3_BUCKET', '')

    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=image_bytes,
        ContentType='image/png',
    )

    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': key},
        ExpiresIn=86400,  # 24 hours
    )
    return url


# ─── Text Helpers ─────────────────────────────────────────────────

def chunk_text(text: str, max_chars: int = 5000) -> list[str]:
    """Split text into chunks respecting sentence boundaries."""
    sentences = text.replace('\n', ' ').split('. ')
    chunks, current = [], []
    length = 0

    for s in sentences:
        if length + len(s) > max_chars and current:
            chunks.append('. '.join(current) + '.')
            current, length = [], 0
        current.append(s)
        length += len(s)

    if current:
        chunks.append('. '.join(current))

    return chunks or [text[:max_chars]]
