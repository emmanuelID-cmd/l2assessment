# Customer Inbox Triage App

## Overview

The Customer Inbox Triage app helps classify customer support messages and recommend actions. It uses category rules first, Groq AI for less clear cases when a local key is available, rule-based urgency scoring, and category-specific recommendations.

## UPDATED since September 29, 2026

The November 9, 2026 update added the following changes to the earlier chatbot work:

| Area | What changed |
| --- | --- |
| Classification data | Replaced 8 issue-description samples with 17 messages that have expected categories. Category rules and recommended actions now use the same category list. |
| Follow-up context | Later questions include the original message and recent conversation in order. The AI receives up to 12 prior follow-up messages; a recap reminder appears when older turns leave that context. |
| Ticket lifecycle | Analysis now starts as a draft. Closing a case saves one ticket with its final category and records why the category changed, if applicable. |
| History | Saved records are validated before display. Known legacy labels are recognized, uncertain categories are flagged for review, and the original browser data can be exported. Newly closed tickets retain the initial reply and every follow-up turn. Category changes are shown as read-only history. |
| Dashboard | Insights now group closed cases by urgency and category with brief issue summaries. Earlier analyses without a closeout timestamp remain in History but do not count as closed cases. |
| Local data audit | A separate three-record browser export was checked and a cleaned copy corrected 10 guidance fields. No category or customer message changed. The cleaned copy remains outside Git and has **not** replaced browser storage. |

The sections below explain setup, case behavior, history recovery, and testing in more detail.

## Problem Statement

Support teams waste time manually reading and triaging customer messages. This tool provides an automated first pass at classification to help prioritize cases; it does not route tickets to a real support queue.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **AI**: Groq API (`openai/gpt-oss-120b`)
- **Runtime**: Browser-based (local development only)

## Setup Instructions

### Prerequisites

- Node.js 20.19+ or 22.12+ (required by the installed Vite version)
- npm or yarn
- Groq API key for live AI responses (get one from https://console.groq.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/emmanuelID-cmd/l2assessment.git
   cd l2assessment
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

   In PowerShell, use `Copy-Item .env.example .env.local` instead. If PowerShell blocks `npm.ps1`, run `npm.cmd install` and `npm.cmd run dev`.
   
   Edit `.env.local` and add your Groq API key:
   ```
   VITE_GROQ_API_KEY=gsk_your-actual-key-here
   ```
   
   Get your FREE API key from: https://console.groq.com/keys
   
   The app can run without a key, but live follow-up responses require one. Keep the key only in `.env.local` for local development.

4. **Run the application**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## How It Works

1. **Paste Message**: User pastes a customer support message into the text area
2. **Analyze**: Click "Analyze Message" to process the input
3. **Classification and guidance**: The app combines these steps:
   - **Category Classification**: Uses category rules first and Groq AI (`openai/gpt-oss-120b`) for less clear cases when a local key is available
   - **Urgency Scoring** (Rule-based): Applies simple rules to determine urgency
   - **Recommendation** (Template-based): Maps category to a recommended action
4. **Draft Analysis**: Shows a provisional category, urgency, recommended action, and reasoning. Follow-ups may clarify the issue and update that provisional category.
5. **Close Case**: Closing reviews the conversation, including troubleshooting discussed, and saves one final ticket to browser localStorage with the original message, initial response, and every follow-up turn in order. If the final category differs from the initial one, History shows the correction and its recorded reason. Without a local Groq key, closeout uses the provisional category derived from customer follow-ups.
6. **History**: Closed tickets are viewable in the History tab. The app does not route them to a real support queue.

Dashboard analytics count closed tickets, identified by their closeout timestamp. Earlier analyses without a closeout timestamp remain in History but are excluded from closed-case counts. Insights groups closed tickets into High, Medium, and Low urgency bands, then shows category counts and a brief plain-language summary of the common issues in each group. A closeout review can save a short issue label based on the conversation; older closed records use keyword-based labels to form the summary. Tickets awaiting category review are counted separately so their uncertain labels do not distort the category breakdown.

### Saved history and export

History belongs to the browser and site origin where a case was closed; this project has no shared database. Open the History tab and choose **Export raw JSON** to download the original `triageHistory` value before clearing records. The app reads older records without rewriting them, recognizes the former `Billing Issue` and `Technical Problem` labels for display, and flags ambiguous older labels for review. If saved data is malformed, the app warns you and keeps the original value in browser storage rather than silently replacing it. To restore an export, open the same site's browser developer tools, select Application > Local Storage, paste the file's exact contents into `triageHistory`, and refresh the page. An export of malformed data may not itself be valid JSON, but preserves the original text for recovery. Exported files can contain customer messages, so review and protect them before sharing.

The classifier, recommendations, and History use one category list. Current synthetic classification cases are in `sample-messages.json`; they include account lockouts, outages, feature requests, mixed requests, and unrelated questions. A saved ticket with a likely category mismatch keeps its saved category and shows **Needs staff review** as a separate status; it is excluded from the dashboard's category distribution until reviewed. History is read-only for category changes. Closed tickets show their saved conversation when follow-ups were recorded. Tickets whose category changed during the conversation show the initial and final categories, recorded reason, and previous response. Older tickets saved before conversation history was included cannot display follow-ups that were never stored. This browser-only project has no staff sign-in or backend routing, so it cannot securely offer staff-only editing or route a ticket after closeout.

### Local history cleanup

A three-record browser-history export was audited separately from the repository. All categories and required field types were valid, so no category or customer message was changed. A cleaned JSON copy corrected 10 guidance fields: the profile-verification action, the meeting case's explanation and reply, and the vacation case's action and clarification state. The original export was preserved. One record is a closed case; two are earlier analyses without closeout timestamps or recoverable follow-up turns. The Dashboard now excludes those earlier analyses from closed-case totals. The cleaned copy is **not** imported into browser storage or committed to this repository; use the restore steps above only after reviewing the copy.


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
- Sends the original ticket and recent follow-up turns in order so later questions can refer to earlier answers. After the most recent 12 prior messages, older follow-ups roll out of the AI context; the chat remains open and shows a recap reminder.
- Redirects clearly unrelated questions instead of answering outside the supported support domains.
- Uses a category-specific fallback for the initial response when no API key is configured. Live follow-ups require a local Groq key; if that call fails, the app keeps the question and shows an error instead of repeating a canned answer.

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
- `Our production server is down` — classified as a service-outage case.
- `I want a refund but I lost my receipt` — classified as a cancellation/refund case with a request for safe, non-sensitive details.
- Clearly unrelated questions — redirected to supported customer-support topics when fallback mode is active.

The deployed Vercel version demonstrates the interface and fallback mode. Live AI responses are tested locally because the API key is intentionally not deployed.

Local checks: `node --test src/utils/*.test.js` (24 passing), `npm run lint`, and `npm run build`.

## Why Groq?

- The app uses Groq for local, context-aware replies with the `openai/gpt-oss-120b` model.
- Account setup and current usage limits are available at https://console.groq.com.

## License

This project is for educational purposes only.
