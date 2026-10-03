import requests
import base64

FREELLMAPI_KEY = "freellmapi-412f8dad8fe9f40c46ed2a67e6c4d02bae87363c3b789961"
URL = "http://localhost:3001/v1/audio/speech"

payload = {
    "model": "gemini-3.1-flash-tts-preview",
    "input": "नमस्ते, यह एक टेस्ट है। सूरज के चारों ओर पृथ्वी घूमती है।",
    "voice": "Kore"
}

headers = {
    "Authorization": f"Bearer {FREELLMAPI_KEY}",
    "Content-Type": "application/json"
}

print("Gemini TTS se audio ban rahi hai...")
r = requests.post(URL, json=payload, headers=headers, timeout=120)

print(f"Status: {r.status_code}")

if r.status_code == 200:
    with open("test_gemini_tts.wav", "wb") as f:
        f.write(r.content)
    print(f"✅ Saved: test_gemini_tts.wav ({len(r.content)} bytes)")
else:
    print("ERROR:", r.text[:500])
