#!/bin/bash
# ContentForge — AWS SAM Deployment Script
# Usage: ./deploy.sh [region] [environment]

set -e

REGION=${1:-ap-south-1}
ENV=${2:-prod}
STACK_NAME="contentforge-${ENV}"

echo "╔════════════════════════════════════════╗"
echo "║    ContentForge — AWS Deployment       ║"
echo "║    AWS AI 4 Bharat Hackathon           ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Region:      $REGION"
echo "Environment: $ENV"
echo "Stack:       $STACK_NAME"
echo ""

# Check prerequisites
command -v sam >/dev/null 2>&1 || { echo "❌ AWS SAM CLI not installed. Run: pip install aws-sam-cli"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI not installed."; exit 1; }

# Check AWS credentials
aws sts get-caller-identity --region $REGION > /dev/null 2>&1 || {
    echo "❌ AWS credentials not configured. Run: aws configure"
    exit 1
}

echo "✅ AWS credentials valid"
echo ""

# Install Python dependencies for Lambda layers
echo "📦 Installing Lambda layer dependencies..."
pip install -r backend/requirements.txt -t backend/layers/common/python/ --quiet

# Build
echo "🏗️  Building SAM application..."
sam build \
    --template infrastructure/template.yaml \
    --region $REGION

# Deploy
echo ""
echo "🚀 Deploying to AWS..."
sam deploy \
    --stack-name $STACK_NAME \
    --region $REGION \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --parameter-overrides Environment=$ENV \
    --resolve-s3 \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Stack outputs (save these for your .env file):"
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs' \
    --output table

echo ""
echo "🌐 Frontend build:"
echo "   cd frontend"
echo "   npm install && npm run build"
echo "   # Then deploy 'dist/' to S3 or Amplify"
echo ""
echo "💡 Bedrock Model Access:"
echo "   Go to AWS Console → Bedrock → Model Access"
echo "   Enable: Claude 3 Sonnet + Stable Diffusion XL"
