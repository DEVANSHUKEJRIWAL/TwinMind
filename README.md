# TwinMind Live Suggestions

TwinMind is a **client-side AI meeting copilot** built with React, Vite, TypeScript, and Tailwind CSS. It transcribes your microphone in near real time, surfaces three live suggestions on a timer (plus manual refresh), and answers questions in a **streaming** chat. All calls go directly from the browser to the **Groq API**—there is no server in this repository.

## Tech stack

- React 19, Vite 6, TypeScript (strict)
- Tailwind CSS
- Zustand (`settingsStore` persisted to `localStorage`, `sessionStore` for the current session)

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| **Node.js** | Version **20** or newer (LTS recommended) |
| **npm** | Bundled with Node |
| **Groq API key** | Create one at [Groq Console](https://console.groq.com) |
| **Browser** | Chromium-based browsers (Chrome, Edge) work well for `MediaRecorder` + microphone |

## Steps to run (development)

If you already have the repo on your machine, start at step 2.

1. **Clone and enter the project**

   ```bash
   git clone https://github.com/DEVANSHUKEJRIWAL/TwinMindAssignment.git
   cd TwinMindAssignment
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the dev server**

   ```bash
   npm run dev
   ```

4. **Open the app** using the URL printed in the terminal (typically [http://localhost:5173](http://localhost:5173)).

5. **Configure Groq**  
   If no API key is saved yet, the **Settings** modal opens automatically. Otherwise, click the **gear** icon. Paste your Groq API key and click **Save**. Prompts, model id, context window sizes, and suggestion refresh interval are stored in **localStorage**. The default chat model is **`openai/gpt-oss-120b`** (Groq’s current replacement for deprecated Llama 4 Maverick); you can switch to any model your key can access—see [Groq supported models](https://console.groq.com/docs/models).

6. **Use the meeting UI**  
   - **Left:** Click **Start** and allow microphone access. Audio is chunked about every **30 seconds** and sent to Groq Whisper for transcription.  
   - **Middle:** Suggestions refresh on your interval and when you click **Refresh now**. Click a card to send it to chat and auto-submit.  
   - **Right:** Type messages; the assistant streams tokens into the thread.

## npm scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Typecheck (`tsc -b`) and production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Production build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, S3, etc.). The Groq API key lives in the user’s browser; for anything beyond personal use, consider a **backend proxy** so keys are not exposed client-side.

## Repository layout

```
src/
  hooks/
    useTranscription.ts
    useSuggestions.ts
    useChat.ts
  lib/
    groqClient.ts       # All Groq HTTP calls
    exportSession.ts
    prompts.ts
    text.ts
  components/
    TranscriptPanel.tsx
    SuggestionsPanel.tsx
    SuggestionCard.tsx
    ChatPanel.tsx
    SettingsModal.tsx
    PanelErrorBoundary.tsx
  store/
    settingsStore.ts
    sessionStore.ts
  App.tsx
  main.tsx
```

## Session export

Click **Export session** in the top bar to download JSON named `twinmind-session-{ISO timestamp}.json`, including transcript, suggestion batches (with `detailedAnswer` when generated), and chat history.

## Troubleshooting

| Issue | What to try |
| ----- | ----------- |
| Settings keeps opening | Save a non-empty Groq API key in Settings. |
| Transcript errors | Read the red banner under the transcript header; verify the key and Groq account limits. |
| No microphone / no audio | Use `https` or `localhost`, check OS/browser permissions, try Chrome/Edge. |
| Suggestions fail to parse | The model must return **exactly three** JSON objects with **distinct** `type` values; adjust the suggestion prompt or model in Settings if needed. |
| Chat error **404 model_not_found** | Your saved **Model** string is not available to your account. Open Settings and set a valid id from the [models list](https://console.groq.com/docs/models) (for example `openai/gpt-oss-120b` or `llama-3.3-70b-versatile`). |

## License

No license file is included in this repository yet; contact the repository owner for terms of use.
