# ⚡ ContentForge — AI Content Repurposing Ecosystem

> **AWS AI 4 Bharat Hackathon** — Transform one blog post into five viral, platform-ready assets using AWS AI services.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│         Step 1    Step 2     Step 3      Step 4      Step 5     │
│         Ingest → Persona → Pipeline → Generate → Schedule       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS (API Gateway)
┌─────────────────────────────────▼───────────────────────────────┐
│                    AWS API Gateway (REST)                        │
│  /ingest  /analyze  /transform  /schedule  /distribute          │
└─────┬──────────┬──────────┬──────────┬────────────────┬─────────┘
      │          │          │          │                │
  Lambda      Lambda    Lambda      Lambda           Lambda
  Ingestion   Analyze   Transform   Schedule         Distribute
      │          │          │          │                │
  Textract  Comprehend   Bedrock    DynamoDB         Twitter
  Transcribe  Bedrock  Claude 3 +    EventBridge      API v2
     S3      Claude 3    SDXL
```

---

## 🚀 AWS Services Used

| Service | Purpose | Pipeline Stage |
|---|---|---|
| **Amazon Bedrock (Claude 3 Sonnet)** | Script generation, analysis, scheduling | Analyze + Transform |
| **Amazon Bedrock (Stable Diffusion XL)** | Comic, meme, and infographic image generation | Transform |
| **Amazon Comprehend** | Sentiment analysis, key phrase extraction, entity detection | Analyze |
| **Amazon Textract** | Extract text from uploaded PDFs | Ingest |
| **Amazon Transcribe** | Transcribe YouTube video audio | Ingest |
| **Amazon S3** | Upload storage + generated asset storage | All |
| **AWS Lambda** | Serverless compute for all API endpoints | All |
| **Amazon API Gateway** | REST API layer for frontend–backend communication | All |
| **Amazon DynamoDB** | Store scheduled posts and user sessions | Schedule |
| **Amazon Cognito** | User authentication + JWT token management | Auth |
| **AWS STS** | Temporary credentials for secure S3 browser uploads | Auth |
| **Amazon EventBridge Scheduler** | Trigger scheduled posts at specified times | Schedule |

---

## 📁 Project Structure

```
content-repurposer/
│
├── frontend/                          # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── App.jsx                    # Main app, step navigation
│   │   ├── index.css                  # Global styles, design tokens
│   │   ├── main.jsx                   # Entry point
│   │   ├── config/
│   │   │   └── aws.js                 # AWS token management (localStorage)
│   │   ├── services/
│   │   │   └── api.js                 # All API calls to Lambda via API Gateway
│   │   └── components/
│   │       ├── TokenConfig.jsx        # AWS credentials modal (3-tab)
│   │       ├── IngestionLayer.jsx     # Step 1: URL / PDF / YouTube input
│   │       ├── PersonalizationLayer.jsx  # Step 2: Brand persona sliders
│   │       ├── PipelineSelector.jsx   # Step 3: Pipeline A/B/C selector
│   │       ├── GenerationView.jsx     # Step 4: Real-time generation + edit
│   │       └── CalendarView.jsx       # Step 5: AI schedule + Twitter post
│   ├── .env.example                   # Environment variable template
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/
│   ├── requirements.txt               # Python dependencies
│   ├── layers/
│   │   └── common/
│   │       └── utils.py               # Shared utilities (Bedrock, S3, etc.)
│   └── lambdas/
│       ├── ingestion/
│       │   └── handler.py             # URL fetch, Textract PDF, Transcribe YouTube
│       ├── analyze/
│       │   └── handler.py             # Comprehend + Bedrock Claude analysis
│       ├── transform/
│       │   └── handler.py             # Comic (SDXL), Meme, Infographic generation
│       └── schedule/
│           └── handler.py             # AI schedule + Twitter API v2
│
└── infrastructure/
    ├── template.yaml                  # AWS SAM template (all resources)
    ├── deploy.sh                      # One-command deployment script
    └── README.md                      # This file
```

---

## ⚡ Quick Start

### 1. Prerequisites

```bash
# Install AWS CLI
pip install awscli

# Install AWS SAM CLI
pip install aws-sam-cli

# Configure AWS credentials
aws configure
# Enter your: Access Key ID, Secret Access Key, Region (ap-south-1), Output (json)
```

### 2. Enable Bedrock Models

> **Critical step!** Without this, image/text generation will fail.

1. Go to **AWS Console → Amazon Bedrock → Model Access**
2. Click **"Manage model access"**
3. Enable:
   - ✅ **Anthropic — Claude 3 Sonnet** (`anthropic.claude-3-sonnet-20240229-v1:0`)
   - ✅ **Stability AI — Stable Diffusion XL 1.0** (`stability.stable-diffusion-xl-v1`)
4. Submit request (usually approved instantly for hackathon)

### 3. Deploy Backend

```bash
# Clone / unzip the project
cd content-repurposer

# Run deployment (takes ~5 minutes)
chmod +x infrastructure/deploy.sh
./infrastructure/deploy.sh ap-south-1 prod
```

The script will output your **API Gateway URL**, **S3 Bucket**, and **Cognito IDs**. Save these!

### 4. Setup Frontend

```bash
cd frontend

# Copy env template
cp .env.example .env

# Fill in values from deployment output
nano .env

# Install dependencies
npm install

# Run locally
npm run dev
```

Open http://localhost:3000 and click **"Add AWS Keys"** to enter your credentials.

### 5. Build for Production

```bash
npm run build
# Deploy dist/ to S3 static hosting or AWS Amplify
```

---

## 🔑 AWS Token Flow

```
User enters credentials in TokenConfig modal
          ↓
Saved to localStorage (development)
          ↓
getAuthHeaders() injects as custom headers on every API call:
  x-aws-access-key, x-aws-secret-key, x-aws-session-token
          ↓
API Gateway Lambda authorizer validates (or API key auth)
          ↓
Lambda functions run with IAM role (not user credentials)
          ↓
For S3 uploads: STS issues temporary presigned URLs
(user credentials never touch your S3 directly)
```

**Production recommendation:** Replace localStorage with Cognito auth flow — the infrastructure is already provisioned.

---

## 💰 Estimated AWS Cost (Hackathon)

| Service | Usage | Cost |
|---|---|---|
| Bedrock Claude 3 Sonnet | ~500 API calls | ~$15 |
| Bedrock SDXL (image gen) | ~100 images | ~$20 |
| Amazon Comprehend | ~200 API calls | ~$2 |
| Amazon Textract | ~50 PDFs | ~$2 |
| Amazon Transcribe | ~10 videos | ~$3 |
| S3 | ~5GB | ~$1 |
| Lambda + API Gateway | ~10K requests | ~$1 |
| DynamoDB | <1GB | ~$0.25 |
| **Total** | | **~$44** |

Well within your **$100 credit** budget.

---

## 🌐 API Endpoints

All endpoints require custom headers: `x-aws-access-key`, `x-aws-secret-key`

```
POST /ingest/url              → Fetch blog/article content
POST /ingest/pdf              → Extract PDF text (Textract)
POST /ingest/youtube          → Transcribe YouTube video
POST /upload/presign          → Get S3 presigned upload URL

POST /analyze                 → Comprehend + Bedrock analysis

POST /transform/comic         → Generate comic strip (SDXL)
POST /transform/meme          → Generate memes (SDXL)
POST /transform/infographic   → Generate infographic (SDXL)

POST /schedule/suggest        → AI-powered schedule suggestions
POST /schedule/create         → Save scheduled post to DynamoDB
GET  /schedule                → Get all scheduled posts

POST /distribute/twitter      → Post to Twitter API v2
GET  /health                  → Health check
```

---

## 🐦 Twitter Integration

ContentForge uses **Twitter API v2 (Free Tier)** — 1,500 tweets/month.

1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Create a project → Get Bearer Token
3. Enter it in the app's **Distribution step** (never stored server-side)

---

## 🏆 Hackathon Presentation Tips

**Highlight these AWS AI services in your demo:**
- Show the **Comprehend sentiment bar** lighting up during analysis
- Show **Bedrock SDXL generating** comic panels in real-time
- Show the **AI scheduler** explaining *why* it picks Monday for LinkedIn

**Key differentiators:**
- Brand Persona sliders (not just "generate content")
- Character consistency check prompt in comic pipeline
- Platform-specific optimization in scheduler
- Full distribution workflow (not just download)
