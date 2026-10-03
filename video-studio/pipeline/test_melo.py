import requests

FREELLMAPI_KEY = "freellmapi-412f8dad8fe9f40c46ed2a67e6c4d02bae87363c3b789961"
URL = "http://localhost:3001/v1/audio/speech"

payload = {
    "model": "auto",
    "input": "नमस्ते, यह एक टेस्ट है। सूरज के चारों ओर पृथ्वी घूमती है।"
}

headers = {
    "Authorization": f"Bearer {FREELLMAPI_KEY}",
    "Content-Type": "application/json"
}

print("MeloTTS se audio ban rahi hai...")
r = requests.post(URL, json=payload, headers=headers, timeout=120)

print(f"Status: {r.status_code}")

if r.status_code == 200:
    with open("test_melo.mp3", "wb") as f:
        f.write(r.content)
    print(f"✅ Saved: test_melo.mp3 ({len(r.content)} bytes)")
else:
    print("ERROR:", r.text[:500])
