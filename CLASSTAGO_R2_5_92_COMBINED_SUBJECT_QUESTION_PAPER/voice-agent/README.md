# Classtago Realtime Voice Agent — R2.5.78 Phase 1

This is the production-direction realtime voice service. It replaces the browser STT -> text LLM -> full TTS playback loop **for live conversation mode** with a persistent Pipecat + Gemini Live native-audio session.

## What Phase 1 proves

- continuous two-way WebRTC audio
- Gemini Live native speech-to-speech
- barge-in/interruption handled by the realtime engine
- automatic Hindi/Hinglish/Urdu/Marathi/English conversational behaviour (prompt-driven, no UI language selector)
- authenticated Classtago school/user/role context passed from the Node broker
- no browser `SpeechRecognition` or device `speechSynthesis` in realtime mode
- existing text assistant remains a fallback

Phase 1 deliberately does **not** expose attendance, fees, marks, contacts or other ERP records to the model and has no write tools. Those will be added through authenticated server-side Pipecat function tools after realtime flow is accepted.

## Pipecat Cloud deployment

1. Install the Pipecat CLI / authenticate with Pipecat Cloud.
2. From this `voice-agent` directory, upload secrets from a real `.env` containing at least `GOOGLE_API_KEY`:

   `pipecat cloud secrets set edunixo-realtime-voice-secrets --file .env`

3. Deploy using the included `pcc-deploy.toml`:

   `pipecat cloud deploy`

4. Create/get a **Pipecat Cloud Public API Key** for starting this agent.
5. On the Classtago Node deployment set:

   - `PIPECAT_AGENT_NAME=edunixo-realtime-voice`
   - `PIPECAT_PUBLIC_API_KEY=<Pipecat public key>`

   Optional self-hosting override: `PIPECAT_START_URL=https://your-pipecat-host/start`

The browser never receives the Pipecat public key or Google key. It calls `/api/realtime-voice/start` with the current Supabase login token; the Classtago server validates membership and returns only a short-lived Daily room URL/token.

## Local Pipecat test

With Python 3.11+ and `uv`:

- copy `.env.example` to `.env` and add `GOOGLE_API_KEY` plus `DAILY_API_KEY`
- `uv sync`
- `uv run bot.py -t daily`
- set Classtago Node `PIPECAT_START_URL=http://<reachable-host>:7860/start`

Do not use `localhost` from a separately hosted Classtago server because localhost would point back to that server/container, not your workstation.
