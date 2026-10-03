import os
import sys
import json
import requests
from extract_text import extract_text

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent"

PROMPT = """Tum ek educational video script writer ho. Neeche diye gaye study material ko ek interesting, engaging video script me badlo.

Rules:
1. Script ko chhote scenes me todo (har scene 15-20 seconds ka).
2. Har scene me: Scene number, Narration (jo bolna hai), aur Image prompt (kya dikhana hai).
3. Language simple aur interesting rakho, jaise kahani suna rahe ho.
4. Output sirf JSON format me do, aisa:
{
  "title": "video ka title",
  "scenes": [
    {"scene": 1, "narration": "text...", "image_prompt": "english image description"},
    {"scene": 2, "narration": "text...", "image_prompt": "english image description"}
  ]
}

Study Material:
"""

def generate_script(text):
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY set nahi hai")
        sys.exit(1)
    
    url = f"{GEMINI_URL}?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{
            "parts": [{"text": PROMPT + text[:15000]}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.7
        }
    }
    
    response = requests.post(url, json=payload, timeout=120)
    
    if response.status_code != 200:
        print("ERROR:", response.status_code)
        print(response.text)
        sys.exit(1)
    
    data = response.json()
    script_text = data["candidates"][0]["content"]["parts"][0]["text"]
    return script_text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_script.py <pdf_file>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    print("PDF se text nikal rahe hain...")
    pdf_text = extract_text(pdf_path)
    
    print("Gemini se script bana rahe hain...")
    script = generate_script(pdf_text)
    
    with open("script.json", "w", encoding="utf-8") as f:
        f.write(script)
    
    print("\n✅ Script ban gayi! File: script.json")
    print("\n--- Preview ---")
    print(script[:500])
