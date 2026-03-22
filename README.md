#  ContentForge AI — Content Repurposing Ecosystem

**AWS AI 4 Bharat Hackathon** — Transform one blog post into three viral, platform-ready assets using AWS AI services.

---

##  Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│         Step 1    Step 2     Step 3      Step 4      Step 5     │
│         Ingest → Persona → Pipeline → Generate → Schedule       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS (API Gateway)
┌─────────────────────────────────▼───────────────────────────────┐
│                    AWS API Gateway (REST)                        │
│        /ingest   /analyze   /transform   /schedule              │
└─────┬──────────┬──────────┬──────────┬──────────────────────────┘
      │          │          │          │
  Lambda      Lambda    Lambda      Lambda
  Ingestion   Analyze   Transform   Schedule
      │          │          │          │
  Textract  Comprehend   Bedrock    DynamoDB
  Transcribe  Mistral 7B  Mistral 7B  EventBridge
     S3      (Bedrock)  Titan Image
                          Gen v2 (us-east-1)
```

---

##  AWS Services Used

| Service | Purpose | Pipeline Stage |
|---------|---------|----------------|
| Amazon Bedrock (Mistral 7B Instruct) | Script generation, content analysis, LinkedIn post, meme text | Analyze + Transform |
| Amazon Bedrock (Titan Image Generator v2) | Comic panel and meme image generation | Transform |
| Amazon Comprehend | Sentiment analysis, key phrase extraction, entity detection | Analyze |
| Amazon Textract | Extract text from uploaded PDFs | Ingest |
| Amazon Transcribe | Transcribe YouTube video audio | Ingest |
| Amazon S3 | Upload storage + generated asset storage | All |
| AWS Lambda | Serverless compute for all API endpoints | All |
| Amazon API Gateway | REST API layer for frontend–backend communication | All |
| Amazon DynamoDB | Store scheduled posts and user sessions | Schedule |
| Amazon Cognito | User authentication + JWT token management | Auth |
| AWS STS | Temporary credentials for secure S3 browser uploads | Auth |
| Amazon EventBridge Scheduler | Trigger scheduled posts at specified times | Schedule |

> **Note:** Mistral 7B Instruct (`mistral.mistral-7b-instruct-v0:2`) runs in `ap-south-1`.
> Titan Image Generator v2 (`amazon.titan-image-generator-v2:0`) runs in `us-east-1` (not available in ap-south-1).

---

## 📁 Project Structure

```
content-repurposer/
│
├── frontend/                             # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── App.jsx                       # Main app, step navigation
│   │   ├── index.css                     # Global styles, design tokens
│   │   ├── main.jsx                      # Entry point
│   │   ├── config/
│   │   │   └── aws.js                    # AWS token management
│   │   ├── services/
│   │   │   └── api.js                    # All API calls to Lambda via API Gateway
│   │   └── components/
│   │       ├── TokenConfig.jsx           # AWS credentials modal
│   │       ├── IngestionLayer.jsx        # Step 1: URL / PDF / YouTube input
│   │       ├── PersonalizationLayer.jsx  # Step 2: Brand persona sliders
│   │       ├── PipelineSelector.jsx      # Step 3: Pipeline A/B/C selector
│   │       ├── GenerationView.jsx        # Step 4: Real-time generation + edit
│   │       └── CalendarView.jsx          # Step 5: AI schedule + distribution
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/
│   ├── requirements.txt                  # Python dependencies
│   ├── layers/
│   │   └── common/
│   │       └── utils.py                  # Shared utilities (Bedrock, S3, etc.)
│   └── lambdas/
│       ├── ingestion/
│       │   └── handler.py                # URL fetch, Textract PDF, Transcribe YouTube
│       ├── analyze/
│       │   └── handler.py                # Comprehend + Mistral 7B analysis
│       ├── transform/
│       │   └── handler.py                # Comic (Titan), Meme (Titan), LinkedIn Post (Mistral)
│       └── schedule/
│           └── handler.py                # AI schedule suggestions + DynamoDB
│
└── infrastructure/
    ├── template.yaml                     # AWS SAM template (all resources)
    ├── deploy.sh                         # One-command deployment script
    └── README.md                         # This file
```

---

## ⚡ Quick Start

### 1. Prerequisites

```bash
pip install awscli
pip install aws-sam-cli
aws configure
# Enter: Access Key ID, Secret Access Key, Region (ap-south-1), Output (json)
```

### 2. Enable Bedrock Models

> Critical step — without this, generation will fail.

1. Go to **AWS Console → Amazon Bedrock → Model Access**
2. Click **"Manage model access"**
3. Enable:
   - ✅ Mistral AI — Mistral 7B Instruct (`mistral.mistral-7b-instruct-v0:2`) — region: `ap-south-1`
   - ✅ Amazon — Titan Image Generator v2 (`amazon.titan-image-generator-v2:0`) — region: `us-east-1`
4. Submit request (usually approved instantly)

### 3. Deploy Backend

```bash
cd content-repurposer
chmod +x infrastructure/deploy.sh
./infrastructure/deploy.sh ap-south-1 prod
```

The script will output your **API Gateway URL**, **S3 Bucket**, and **Cognito IDs**. Save these!

### 4. Setup Frontend

```bash
cd frontend
cp .env.example .env
nano .env
npm install
npm run dev
```

Open `http://localhost:3000` and click **"Add AWS Keys"** to enter your credentials.

### 5. Build for Production

```bash
npm run build
# Deploy dist/ to Vercel or S3 static hosting
```

---

## 🔑 AWS Token Flow

```
User enters credentials in TokenConfig modal
          ↓
Saved to localStorage (development only)
          ↓
getAuthHeaders() injects as custom headers on every API call:
  x-aws-access-key, x-aws-secret-key, x-aws-session-token
          ↓
Lambda functions run with IAM role (not user credentials)
          ↓
For S3 uploads: STS issues temporary presigned URLs
(user credentials never touch S3 directly)
```

> **Production recommendation:** Replace localStorage with Cognito auth flow — infrastructure is already provisioned.

---

## 💰 Estimated AWS Cost (Hackathon)

| Service | Usage | Cost |
|---------|-------|------|
| Bedrock Mistral 7B | ~500 API calls | ~$2 |
| Bedrock Titan Image Gen v2 | ~100 images | ~$1 |
| Amazon Comprehend | ~200 API calls | ~$2 |
| Amazon Textract | ~50 PDFs | ~$2 |
| Amazon Transcribe | ~10 videos | ~$3 |
| S3 | ~5GB | ~$1 |
| Lambda + API Gateway | ~10K requests | ~$1 |
| DynamoDB | <1GB | ~$0.25 |
| **Total** | | **~$12** |

Well within your $100 credit budget.

---

## 🌐 API Endpoints

All endpoints require custom headers: `x-aws-access-key`, `x-aws-secret-key`

```
POST /ingest/url              → Fetch blog/article content
POST /ingest/pdf              → Extract PDF text (Textract)
POST /ingest/youtube          → Transcribe YouTube video (Transcribe)
POST /upload/presign          → Get S3 presigned upload URL

POST /analyze                 → Comprehend + Mistral 7B analysis

POST /transform/comic         → Generate comic strip (Mistral script + Titan Image Gen)
POST /transform/meme          → Generate meme (Mistral text + Titan Image Gen)
POST /transform/infographic   → Generate LinkedIn post (Mistral 7B)

POST /schedule/suggest        → AI-powered schedule suggestions
POST /schedule/create         → Save scheduled post to DynamoDB
GET  /schedule                → Get all scheduled posts

GET  /health                  → Health check
```

---

## 🎨 Output Pipelines

| Pipeline | AI Model | Output |
|----------|----------|--------|
| 🎭 Comic Strip | Mistral 7B (script) + Titan Image Gen v2 (panel 1 image) | 4-panel comic with AI captions |
| 🔥 Viral Meme | Mistral 7B (text) + Titan Image Gen v2 (image) | Meme with impact-font top/bottom text |
| 💼 LinkedIn Post | Mistral 7B | Formatted professional post with hashtags + CTA |
