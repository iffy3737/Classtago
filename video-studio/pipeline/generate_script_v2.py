import os
import sys
import json
import requests
from extract_text import extract_text

# FreeLLMAPI Configuration
FREELLMAPI_KEY = "freellmapi-412f8dad8fe9f40c46ed2a67e6c4d02bae87363c3b789961"
FREELLMAPI_URL = "http://localhost:3001/v1/chat/completions"

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
    payload = {
        "model": "auto",
        "messages": [
            {"role": "user", "content": PROMPT + text[:15000]}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.7
    }
    
    headers = {
        "Authorization": f"Bearer {FREELLMAPI_KEY}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(FREELLMAPI_URL, json=payload, headers=headers, timeout=180)
    
    if response.status_code != 200:
        print("ERROR:", response.status_code)
        print(response.text)
        sys.exit(1)
    
    data = response.json()
    script_text = data["choices"][0]["message"]["content"]
    return script_text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_script_v2.py <pdf_file>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    print("PDF se text nikal rahe hain...")
    pdf_text = extract_text(pdf_path)
    
    print("FreeLLMAPI se script bana rahe hain...")
    script = generate_script(pdf_text)
    
    with open("script.json", "w", encoding="utf-8") as f:
        f.write(script)
    
    print("\n✅ Script ban gayi! File: script.json")
    print("\n--- Preview ---")
    print(script[:500])
