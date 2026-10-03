import base64
import sys
import requests

FREELLMAPI_KEY = "freellmapi-412f8dad8fe9f40c46ed2a67e6c4d02bae87363c3b789961"
URL = "http://localhost:3001/v1/chat/completions"

def ocr_image(image_path):
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")
    
    payload = {
        "model": "gemini-3.6-flash",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Is image me jo bhi text hai, usko bilkul waise hi likho jaise hai. Kuch bhi add ya remove mat karo. Sirf text output do."
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{img_b64}"}
                    }
                ]
            }
        ],
        "temperature": 0.1
    }
    
    headers = {
        "Authorization": f"Bearer {FREELLMAPI_KEY}",
        "Content-Type": "application/json"
    }
    
    r = requests.post(URL, json=payload, headers=headers, timeout=180)
    
    if r.status_code != 200:
        print(f"ERROR {r.status_code}: {r.text[:300]}")
        return None
    
    data = r.json()
    return data["choices"][0]["message"]["content"]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vision_ocr.py <image.png>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    print(f"OCR chal raha hai: {image_path}")
    text = ocr_image(image_path)
    
    if text:
        output_file = "hindi_ocr.txt"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"\n✅ Saved: {output_file}")
        print(f"\n--- Preview ---")
        print(text[:500])
