# TwinMind Live Suggestions

TwinMind is a **client-side AI meeting copilot** built with React, Vite, TypeScript, and Tailwind CSS. It transcribes your microphone in near real time, surfaces three live suggestions on a timer (plus manual refresh), and answers in a **streaming** chat. All calls go from the browser to the **Groq API**—there is no backend in this repository.

## Assignment alignment

| Requirement | Implementation |
| ----------- | ---------------- |
| **Models** | **`whisper-large-v3`** for transcription; **`openai/gpt-oss-120b`** for live suggestions and chat (hardcoded in `src/lib/groqClient.ts` so submissions are comparable). |
| **API key** | User pastes key in Settings; nothing committed. |
| **Mic + transcript ~30s** | `MediaRecorder` runs in **complete segments** (~30s): stop → merge blob → Whisper → append transcript (avoids invalid WebM fragments). |
| **Manual refresh** | **Refresh now** ends the current audio segment when the mic is on, waits for that chunk to transcribe, **then** fetches three new suggestions from the updated transcript. |
| **Suggestion click** | Adds a short user line in chat; the assistant reply is generated from the **detailed-answer prompt** (full transcript window for on-click). A parallel non-stream call also stores the same text in export `detailedAnswer`. |
| **Export** | JSON: transcript, all suggestion batches, chat with timestamps. |
| **Session on reload** | Transcript and chat live in memory only until refresh (no server persistence). Settings (prompts, key) persist in `localStorage`. |

## Tech stack

- React 19, Vite 6, TypeScript (strict)
- Tailwind CSS
- Zustand (`settingsStore` → `localStorage`, `sessionStore` → in-memory session)

## Prompt strategy

1. **Live suggestions** (`src/lib/prompts.ts` → `SUGGESTION_PROMPT`): inject the **last N words** of the transcript (`suggestionContextWordCount`, default 800). The model must return **exactly three** JSON objects with **distinct** types from `question_to_ask`, `talking_point`, `answer`, `fact_check`, `clarification`. Headlines are actionable, not labels; the last few sentences are weighted in the instructions.

2. **On-click detail** (`DETAILED_ANSWER_PROMPT`): uses a **wider window** (`detailedAnswerContextWordCount`, default 4000 words) so long-form answers can reference more of the meeting. Includes suggestion **type**, **headline**, and **subtext** (`{SUGGESTION_SUBTEXT}`).

3. **Free-form chat** (`CHAT_SYSTEM_PROMPT`): system message includes the **last N words** for chat (`chatContextWordCount`, default 2000) so follow-up questions stay grounded without sending the entire transcript every turn.

4. **Parsing** (`useSuggestions.ts`): extracts a JSON array even if the model wraps it in extra text; normalizes `type` strings; **truncates** headline to 12 words and subtext to 20 words if the model is verbose.

## Tradeoffs

- **Client-only:** Simple deploy and no server secrets, but the Groq key is in the browser (acceptable for an assignment demo; production would use a proxy).
- **Fixed chat model:** Matches the brief (“same model for everyone”); users cannot switch models in UI.
- **Manual refresh latency:** Flushing the mic segment + Whisper + suggestions adds a few seconds by design so suggestions see the **latest** transcript.
- **Suggestion click streaming:** The visible reply streams from a minimal system line plus the **full detailed prompt as the user message**, so the chat bubble matches the long-form brief without double-counting transcript in system + user.
- **No login:** Single session tab; export is the review artifact.

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| **Node.js** | **20+** (LTS recommended) |
| **npm** | With Node |
| **Groq API key** | [Groq Console](https://console.groq.com) |
| **Browser** | Chrome or Edge recommended for `MediaRecorder` |

## Steps to run (development)

1. **Clone and enter the project**

   ```bash
   git clone https://github.com/DEVANSHUKEJRIWAL/TwinMindAssignment.git
   cd TwinMindAssignment
   ```

2. **`npm install`**

3. **`npm run dev`** — open the URL shown (usually `http://localhost:5173`).

4. **Settings** — paste your Groq API key; adjust prompts or context windows if you want.

5. **Left:** Start mic; speak; transcript grows every ~30s (or sooner if you hit **Refresh now** in the middle column).

6. **Middle / right:** Timed or manual suggestions; click a card or type in chat.

## npm scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Dev server |
| `npm run build` | `tsc -b` + Vite production build → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | ESLint |

## Deploy (submit a public URL)

Build a static site from `dist/`:

```bash
npm run build
```

Then deploy **`dist/`** to any static host:

- **Vercel:** New Project → import this repo → Framework Preset **Vite** → Output **dist** → Deploy.  
- **Netlify:** New site from Git → build command `npm run build`, publish directory **`dist`**.

Set nothing server-side; users paste their key in the app after open.

## Repository layout

```
src/
  hooks/ useTranscription.ts, useSuggestions.ts, useChat.ts
  lib/   groqClient.ts, prompts.ts, exportSession.ts, text.ts
  components/ panels + SettingsModal + error boundaries
  store/ settingsStore.ts, sessionStore.ts
  App.tsx, main.tsx
```

## Session export

**Export session** downloads `twinmind-session-{ISO timestamp}.json`: full transcript, each suggestion batch (with `transcriptContextUsed` and per-card `detailedAnswer` when filled), and `chatHistory` with ISO timestamps.

## Troubleshooting

| Issue | What to try |
| ----- | ----------- |
| Settings keeps opening | Save a non-empty Groq API key. |
| Transcript / API errors | Red banner text; check key and Groq limits. |
| Transcription **400** invalid media | Complete-segment recording + correct file extension; try Chrome/Edge. |
| Suggestions parse error | Model must return 3 JSON objects with 3 different `types`; see **Prompt strategy**. |

## License

No license file in repo; contact the owner for terms.
