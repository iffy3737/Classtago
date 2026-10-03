import asyncio
import json
import os
import base64
import requests

SARVAM_API_KEY = "sk_pp9mdqxx_BKWlPDgBC08mS1x2NXVmxDjg"
SARVAM_URL = "https://api.sarvam.ai/text-to-speech"

# Language code aur speaker yahan set karo
TARGET_LANG = "hi-IN"       # Hindi ke liye
SPEAKER = "priya"            # Female voice (male ke liye: "arvind")

def make_audio(text, output_path):
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": [text],
        "target_language_code": TARGET_LANG,
        "speaker": SPEAKER,
        "pitch": 0,
        "pace": 1.0,
        "loudness": 1.5,
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "model": "bulbul:v3"
    }
    
    response = requests.post(SARVAM_URL, json=payload, headers=headers, timeout=120)
    
    if response.status_code != 200:
        print(f"  ❌ Error: {response.status_code} - {response.text[:200]}")
        return False
    
    data = response.json()
    audio_b64 = data["audios"][0]
    audio_bytes = base64.b64decode(audio_b64)
    
    with open(output_path, "wb") as f:
        f.write(audio_bytes)
    
    return True

def main():
    with open("script.json", "r", encoding="utf-8") as f:
        script = json.load(f)
    
    os.makedirs("audio", exist_ok=True)
    scenes = script["scenes"]
    
    print(f"Total {len(scenes)} scenes ki audio ban rahi hai (Sarvam AI)...\n")
    
    for scene in scenes:
        scene_num = scene["scene"]
        narration = scene["narration"]
        output_file = f"audio/scene_{scene_num}.wav"
        
        print(f"Scene {scene_num}: {narration[:50]}...")
        ok = make_audio(narration, output_file)
        
        if ok:
            print(f"  ✅ {output_file}")
        else:
            print(f"  ❌ Scene {scene_num} fail")
    
    print("\n✅ Saari audio ban gayi! Folder: audio/")

if __name__ == "__main__":
    main()
