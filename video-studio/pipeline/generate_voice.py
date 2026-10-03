import asyncio
import json
import os
import edge_tts

VOICE = "hi-IN-MadhurNeural"  # Hindi male voice (female ke liye: hi-IN-SwaraNeural)

async def make_audio(text, output_path):
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(output_path)

async def main():
    with open("script.json", "r", encoding="utf-8") as f:
        script = json.load(f)
    
    os.makedirs("audio", exist_ok=True)
    scenes = script["scenes"]
    
    print(f"Total {len(scenes)} scenes ki audio ban rahi hai...")
    
    for scene in scenes:
        scene_num = scene["scene"]
        narration = scene["narration"]
        output_file = f"audio/scene_{scene_num}.mp3"
        
        print(f"Scene {scene_num} ki audio ban rahi hai...")
        await make_audio(narration, output_file)
        print(f"  ✅ {output_file}")
    
    print("\n✅ Saari audio ban gayi! Folder: audio/")

if __name__ == "__main__":
    asyncio.run(main())
