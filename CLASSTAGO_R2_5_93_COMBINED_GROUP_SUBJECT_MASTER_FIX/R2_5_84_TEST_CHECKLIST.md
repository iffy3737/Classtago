# R2.5.84 test checklist

1. Upload ZIP in Google AI Studio and launch preview.
2. Sign in normally.
3. Open AI Assistant and press **Start live conversation**.
4. `Origin not allowed` must no longer appear, including inside AI Studio preview iframe.
5. Verify microphone permission, transcript, audio playback and interruption/barge-in.
6. Switch agent/voice and start a new session.
7. Confirm an unauthenticated socket cannot start Gemini and is closed after the authentication timeout.
8. Confirm school/role-scoped tools still return only the logged-in user's permitted data.
