import requests
import base64
import time

FREELLMAPI_KEY = "freellmapi-412f8dad8fe9f40c46ed2a67e6c4d02bae87363c3b789961"
FREELLMAPI_URL = "http://localhost:3001/v1/images/generations"

prompt = "A majestic Earth orbiting around the Sun in space, cinematic, ultra detailed, educational illustration style"

payload = {
    "model": "auto",
    "prompt": prompt,
    "n": 1,
    "size": "1024x1024",
    "response_format": "b64_json"
}

headers = {
    "Authorization": f"Bearer {FREELLMAPI_KEY}",
    "Content-Type": "application/json"
}

print("Cloudflare FLUX se image generate ho rahi hai...")
start = time.time()

response = requests.post(FREELLMAPI_URL, json=payload, headers=headers, timeout=180)

elapsed = time.time() - start
print(f"Time: {elapsed:.1f}s")
print(f"Status: {response.status_code}")

if response.status_code != 200:
    print("ERROR:", response.text[:500])
else:
    data = response.json()
    b64 = data["data"][0]["b64_json"]
    img_bytes = base64.b64decode(b64)
    
    with open("test_flux.jpg", "wb") as f:
        f.write(img_bytes)
    
    print(f"✅ Saved: test_flux.jpg ({len(img_bytes)} bytes)")
