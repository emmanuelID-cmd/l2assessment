# Customer Inbox Triage App

## Overview

The Customer Inbox Triage app is a lightweight AI-powered tool that helps classify customer support messages and recommend actions. It uses Groq AI to categorize messages, applies rule-based urgency scoring, and suggests next steps based on predefined templates.

## Problem Statement

Support teams waste time manually reading and triaging customer messages. This tool provides an automated first pass at classification to help prioritize and route messages more efficiently.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **AI**: Groq API (`openai/gpt-oss-120b`)
- **Runtime**: Browser-based (local development only)

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Groq API key (FREE - get from https://console.groq.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "L2 assessment"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Groq API Key**
   
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Groq API key:
   ```
   VITE_GROQ_API_KEY=gsk_your-actual-key-here
   ```
   
   Get your FREE API key from: https://console.groq.com/keys
   
   **Why Groq?** Groq offers a generous free tier with fast inference and no credit card required!

4. **Run the application**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## How It Works

1. **Paste Message**: User pastes a customer support message into the text area
2. **Analyze**: Click "Analyze Message" to process the input
3. **Classification**: The app runs three processes in parallel:
   - **Category Classification** (LLM): Uses Groq AI (Llama 3.3 70B) to categorize the message
   - **Urgency Scoring** (Rule-based): Applies simple rules to determine urgency
   - **Recommendation** (Template-based): Maps category to a recommended action
4. **Display Results**: Shows category, urgency tag, recommended action, and AI reasoning
5. **History**: All analyses are saved to localStorage and viewable in the History tab


## 🆕 Improvements Made

After testing the original triage chatbot with multiple customer messages, three key issues were identified:

1. **Limited triage categories** — the original classifier recognized a narrow set of intents, causing valid messages to fall into a generic category. The updated classifier uses explicit categories for billing, account access, technical support, outages, feature requests, product questions, feedback, cancellations/refunds, and clarification-needed cases.
2. **No clarification handling** — vague or incomplete messages previously received generic responses. The updated classifier can identify missing details and ask a focused clarification question.
3. **Static, unreliable responses** — replies were pulled from a small set of predetermined strings. The updated system uses Groq to generate context-aware responses within the classified support category, with safe fallback text when no API key is available or the request fails.

### Implemented Improvement: AI-Generated Chat Responses

The most impactful fix was replacing static canned replies with dynamic, context-aware responses generated through the Groq API. The chatbot now:

- Responds to the details in each customer message rather than only matching a fixed template.
- Uses validated triage classification as a grounding step before generating a response.
- Supports category-specific follow-up questions in the Analyze view.
- Redirects clearly unrelated questions instead of answering outside the supported support domains.
- Falls back gracefully when no API key is configured.

## Example Test Messages

Try analyzing these messages to see how the triage system works:

### Example 1: Production Issue
```
Our production server is down
```

### Example 2: Customer Feedback
```
Hi there! I just wanted to say thank you for your amazing customer service. I've been using your product for three years now and I'm really happy with it. Keep up the great work!
```

### Example 3: Feature Request
```
I would love to see a dark mode option in the app. It would be much easier on my eyes during night time usage.
```

### Example 4: Payment Issue
```
I tried to update my payment method but the page keeps loading forever. Is this a known issue?
```

### Example 5: Billing Question
```
Can I upgrade my subscription to the pro plan?
```

### Example 6: Technical Support
```
The dashboard won't load when I try to access it. I've tried refreshing but it keeps timing out.
```

## Security Note

⚠️ **Warning**: This application exposes the Groq API key in the browser (using `dangerouslyAllowBrowser: true`). This is acceptable for local development only but should **NEVER** be done in production. In a real application, API calls should be made from a secure backend server.

### Deployment Note

The Vercel deployment intentionally runs without a real Groq key. It can demonstrate the interface and fallback behavior, but live AI chat requires a local `.env.local` key. Adding a `VITE_` key to a public deployment would expose it in the browser bundle. The production-correct solution would be a backend or serverless proxy that stores the key server-side; that is outside this assignment's local-only constraint.

## 🧪 Testing Evidence

Test scenarios used during development include:

- `Can you add a dark mode feature?` — classified as a feature request with product-focused guidance rather than billing advice.
- `I am locked out of my account` — classified as account access, with account-recovery guidance rather than a generic product response.
- `Our production server is down` — routed to service-outage support.
- `I want a refund but I lost my receipt` — routed to cancellation/refund support with a request for safe, non-sensitive details.
- Clearly unrelated questions — redirected to supported customer-support topics when fallback mode is active.

The deployed Vercel version demonstrates the interface and fallback mode. Live AI responses are tested locally because the API key is intentionally not deployed.

## Why Groq?

- ✅ **Completely Free** - No credit card required
- ✅ **Fast Inference** - Groq's LPU technology is incredibly fast
- ✅ **Generous Limits** - ~14,400 requests/day on free tier
- ✅ **High Quality** - Llama 3.3 70B performs excellently
- ✅ **Easy Signup** - Get started in minutes at https://console.groq.com

## License

This project is for educational purposes only.
