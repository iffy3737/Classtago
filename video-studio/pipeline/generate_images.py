import json
import os
import time
import base64
import requests

FREELLMAPI_KEY = "freellmapi-412f8dad8fe9f40c46ed2a67e6c4d02bae87363c3b789961"
FREELLMAPI_URL = "http://localhost:3001/v1/images/generations"

def generate_image(prompt, output_path, retries=3):
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
    for attempt in range(retries):
        try:
            print(f"  Try {attempt+1}: generating...")
            r = requests.post(FREELLMAPI_URL, json=payload, headers=headers, timeout=180)
            if r.status_code == 200:
                data = r.json()
                b64 = data["data"][0]["b64_json"]
                img_bytes = base64.b64decode(b64)
                with open(output_path, "wb") as f:
                    f.write(img_bytes)
                return True
            else:
                print(f"  Status: {r.status_code} - {r.text[:150]}")
                time.sleep(5)
        except Exception as e:
            print(f"  Error: {e}")
            time.sleep(5)
    return False

def main():
    with open("script.json", "r", encoding="utf-8") as f:
        script = json.load(f)
    os.makedirs("images", exist_ok=True)
    scenes = script if isinstance(script, list) else script["scenes"]
    print(f"Total {len(scenes)} images ban rahi hain (Cloudflare FLUX)...\n")
    for scene in scenes:
        scene_num = scene["scene"]
        prompt = scene["image_prompt"]
        output_file = f"images/scene_{scene_num}.jpg"
        print(f"Scene {scene_num}: {prompt[:60]}...")
        ok = generate_image(prompt, output_file)
        if ok:
            print(f"  OK: {output_file}\n")
        else:
            print(f"  FAILED: scene {scene_num}\n")
        time.sleep(2)
    print("DONE! Folder: images/")

if __name__ == "__main__":
    main()
