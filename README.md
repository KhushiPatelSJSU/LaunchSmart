# 🚀 LaunchSmart

**LaunchSmart** is a full-stack, AI-powered pre-launch QA platform built on Next.js and Supabase. It provides engineering and product teams with a single command center to definitively know whether their product is ready to ship. 

By leveraging the multi-modal capabilities of Gemini 2.5 Flash, LaunchSmart acts as a senior release engineer by statically analyzing code diffs, verifying visual UI implementation against specs, identifying required fixes, and directly drafting highly structured bug tickets to Jira or GitHub.

---

## ✨ Core Features

### 👁️ AI Vision QA Pipeline
Describe what you're shipping: type it out, paste it, upload a file, or link a Jira ticket.
Then show us the build: upload UI screenshots, drop in a GitHub PR link, or both. 
The pipeline:
1. **Extracts** expected behaviors from the product spec text.
2. **Runs** multimodal vision analysis on the actual UI screenshots.
3. **Compares** the two to find gaps, missing states, or incorrect flows.
4. **Outputs** up to 5 structured issues, each containing severity, root cause, recommended fix, and confidence level.
5. **Computes** a strict, deterministic `0-100` launch score (No AI inflation: -25 per critical, -10 per high, -4 per medium issue). Buckets the release into `Ready`, `Launch with Caution`, or `Block Release`.

### 💻 Autonomous PR Checker
Paste a GitHub PR URL and optionally link a Jira ticket. LaunchSmart will:
1. Fetch the raw code diffs from the GitHub API.
2. Pull acceptance criteria from the linked Jira ticket (via the Atlassian REST API).
3. Have Gemini act as a Release Engineer to review the changes.
4. Return an **APPROVE** or **BLOCK** verdict with a detailed breakdown of what is implemented vs. missing in the code.

### 🔗 Seamless Integrations
Push findings to your existing workflows with one click:
- **Jira:** Generates fully formatted bug tickets using Atlassian Document Format (ADF), including actual behavior, expected behavior, recommended fixes, and acceptance checks. Built-in JQL duplicate detection ensures you don't file the same bug twice.
- **GitHub Issues:** Generates Markdown-formatted issues with a `launchsmart` label, also preventing duplicates.
- **Slack:** Sends a rich Block Kit card summary to your team's channel containing the score, verdict, issue breakdown, and a deep link back to the report.

### 💾 Relational Persistence & Fallbacks
- All reports, findings, PR checks, and created ticket records are persisted to **Supabase**.
- User-scoped auth relies on GitHub OAuth and Email Magic Links.
- Built-in `localStorage` fallback ensures the application remains functional even if the database is temporarily unreachable.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, shadcn/ui, Zustand
- **Backend:** Next.js Serverless API Routes
- **AI / LLM:** `@ai-sdk/google` (Gemini 2.5 Flash)
- **Database & Auth:** Supabase
- **Integrations:** GitHub API, Atlassian (Jira) REST API v3, Slack Webhooks

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/launchsmart.git
cd launchsmart
```

### 2. Install dependencies
```bash
npm install
# or
pnpm install
# or
yarn install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory and add the following keys:

```env
# AI Model
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Integrations (Optional but recommended)
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO=owner/repo # Default fallback repo for issues

JIRA_EMAIL=your_jira_email
JIRA_API_TOKEN=your_jira_api_token
JIRA_DOMAIN=your_company.atlassian.net

SLACK_WEBHOOK_URL=your_slack_incoming_webhook_url
```

### 4. Run the Development Server
```bash
npm run dev
# or 
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

---

## 📚 How the Scoring Works

The Launch Score is deterministic to prevent LLM hallucination or overly optimistic grading:
- **Base Score:** Starts at `100`
- **Critical Issue:** `-25 points`
- **High Issue:** `-10 points`
- **Medium Issue:** `-4 points`
- **Unverified Critical:** `-6 points` (if a critical piece of the spec is missing from the screenshots entirely)

**Buckets:**
- **90 - 100:** `Ready`
- **70 - 89:** `Launch with Caution`
- **0 - 69:** `Block Release`

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! 
