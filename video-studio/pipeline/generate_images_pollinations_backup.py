import json
import os
import time
import urllib.parse
import requests

def generate_image(prompt, output_path, retries=3):
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&seed={int(time.time())}"
    
    for attempt in range(retries):
        try:
            print(f"  Try {attempt+1}: downloading...")
            r = requests.get(url, timeout=120)
            if r.status_code == 200 and len(r.content) > 5000:
                with open(output_path, "wb") as f:
                    f.write(r.content)
                return True
            else:
                print(f"  Status: {r.status_code}, size: {len(r.content)}")
                time.sleep(5)
        except Exception as e:
            print(f"  Error: {e}")
            time.sleep(5)
    return False

def main():
    with open("script.json", "r", encoding="utf-8") as f:
        script = json.load(f)
    
    os.makedirs("images", exist_ok=True)
    scenes = script["scenes"]
    
    print(f"Total {len(scenes)} images ban rahi hain...")
    print("(Pollinations free hai, par slow ho sakta hai — sabr karo)\n")
    
    for scene in scenes:
        scene_num = scene["scene"]
        prompt = scene["image_prompt"]
        output_file = f"images/scene_{scene_num}.jpg"
        
        print(f"Scene {scene_num}: {prompt[:60]}...")
        ok = generate_image(prompt, output_file)
        
        if ok:
            print(f"  ✅ Saved: {output_file}\n")
        else:
            print(f"  ❌ Failed: scene {scene_num}\n")
        
        time.sleep(3)  # Rate limit se bachne ke liye
    
    print("✅ Images ban gayi! Folder: images/")

if __name__ == "__main__":
    main()
