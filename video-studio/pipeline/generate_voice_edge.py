import asyncio
import json
import os
import edge_tts

VOICE = "hi-IN-MadhurNeural"  # Male Hindi
# Other options:
# hi-IN-SwaraNeural (Female Hindi)
# ur-PK-AsadNeural (Male Urdu)
# ur-PK-UzmaNeural (Female Urdu)

async def make_audio(text, output_path):
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(output_path)

async def main():
    with open("script.json", "r", encoding="utf-8") as f:
        script = json.load(f)
    
    os.makedirs("audio", exist_ok=True)
    scenes = script if isinstance(script, list) else script["scenes"]
    
    print(f"Total {len(scenes)} scenes ki audio ban rahi hai (Edge-TTS)...\n")
    
    for scene in scenes:
        scene_num = scene["scene"]
        narration = scene["narration"]
        output_file = f"audio/scene_{scene_num}.mp3"
        
        print(f"Scene {scene_num}: {narration[:50]}...")
        
        if os.path.exists(output_file) and os.path.getsize(output_file) > 10000:
            print(f"  SKIP (already exists)")
            continue
        
        try:
            await make_audio(narration, output_file)
            print(f"  OK: {output_file}")
        except Exception as e:
            print(f"  FAILED: {e}")
    
    print("\nDONE! Folder: audio/")

if __name__ == "__main__":
    asyncio.run(main())
