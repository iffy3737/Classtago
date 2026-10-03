import json
import os
import time
import requests

FREELLMAPI_KEY = "freellmapi-412f8dad8fe9f40c46ed2a67e6c4d02bae87363c3b789961"
URL = "http://localhost:3001/v1/audio/speech"
MODEL = "@cf/myshell-ai/melotts"

def make_audio(text, output_path, retries=5):
    payload = {
        "model": MODEL,
        "input": text
    }
    headers = {
        "Authorization": f"Bearer {FREELLMAPI_KEY}",
        "Content-Type": "application/json"
    }
    for attempt in range(retries):
        try:
            r = requests.post(URL, json=payload, headers=headers, timeout=180)
            if r.status_code == 200 and len(r.content) > 5000:
                with open(output_path, "wb") as f:
                    f.write(r.content)
                return True
            print(f"  Retry {attempt+1}: status={r.status_code}, size={len(r.content)}")
            time.sleep(5)
        except Exception as e:
            print(f"  Retry {attempt+1}: {e}")
            time.sleep(5)
    return False

def main():
    with open("script.json", "r", encoding="utf-8") as f:
        script = json.load(f)
    os.makedirs("audio", exist_ok=True)
    scenes = script if isinstance(script, list) else script["scenes"]
    print(f"Total {len(scenes)} scenes ki audio ban rahi hai (MeloTTS)...\n")
    for scene in scenes:
        scene_num = scene["scene"]
        narration = scene["narration"]
        output_file = f"audio/scene_{scene_num}.mp3"
        print(f"Scene {scene_num}: {narration[:50]}...")
        if os.path.exists(output_file) and os.path.getsize(output_file) > 10000:
            print(f"  SKIP (already exists)")
            continue
        ok = make_audio(narration, output_file)
        if ok:
            print(f"  OK: {output_file}")
        else:
            print(f"  FAILED: Scene {scene_num}")
    print("\nDONE! Folder: audio/")

if __name__ == "__main__":
    main()
