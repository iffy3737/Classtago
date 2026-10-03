import json
import os
import requests

FREELLMAPI_KEY = "freellmapi-412f8dad8fe9f40c46ed2a67e6c4d02bae87363c3b789961"
URL = "http://localhost:3001/v1/audio/speech"

VOICE = "Kore"  # Options: Kore, Aoede, Charon, Puck, Zephyr, Sulafat, Achird

def make_audio(text, output_path):
    payload = {
        "model": "gemini-3.1-flash-tts-preview",
        "input": text,
        "voice": VOICE
    }
    headers = {
        "Authorization": f"Bearer {FREELLMAPI_KEY}",
        "Content-Type": "application/json"
    }
    
    r = requests.post(URL, json=payload, headers=headers, timeout=180)
    
    if r.status_code != 200:
        print(f"  ERROR {r.status_code}: {r.text[:200]}")
        return False
    
    with open(output_path, "wb") as f:
        f.write(r.content)
    return True

def main():
    with open("script.json", "r", encoding="utf-8") as f:
        script = json.load(f)
    
    os.makedirs("audio", exist_ok=True)
    scenes = script["scenes"]
    
    print(f"Total {len(scenes)} scenes ki audio ban rahi hai (Gemini TTS)...\n")
    
    for scene in scenes:
        scene_num = scene["scene"]
        narration = scene["narration"]
        output_file = f"audio/scene_{scene_num}.wav"
        
        print(f"Scene {scene_num}: {narration[:50]}...")
        ok = make_audio(narration, output_file)
        
        if ok:
            print(f"  OK: {output_file}")
        else:
            print(f"  FAILED: Scene {scene_num}")
    
    print("\nDONE! Folder: audio/")

if __name__ == "__main__":
    main()
