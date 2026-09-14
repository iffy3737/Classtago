# R2.5.83 Test Checklist

1. Open the app inside Google AI Studio preview.
2. Login normally and open AI Assistant.
3. Press **Start live conversation**; `Origin not allowed` must not appear.
4. Confirm microphone permission, live transcript and Gemini audio response.
5. Interrupt the agent while it speaks and confirm playback stops/follows the new turn.
6. Switch Hindi/Hinglish → Marathi → Urdu/Punjabi and confirm natural switching.
7. Verify normal text assistant still works.
8. Verify a non-approved arbitrary cross-origin WebSocket is still rejected with code 4403.
