import json
import urllib.parse
import requests
import time

with open("script.json", "r", encoding="utf-8") as f:
    script = json.load(f)

for scene in script["scenes"]:
    if scene["scene"] == 5:
        prompt = scene["image_prompt"]
        print(f"Generating: {prompt}")
        encoded = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&seed={int(time.time())}"
        r = requests.get(url, timeout=120)
        if r.status_code == 200 and len(r.content) > 5000:
            with open("images/scene_5.jpg", "wb") as f:
                f.write(r.content)
            print("✅ scene_5.jpg saved")
        else:
            print(f"❌ Failed: {r.status_code}")
        break
