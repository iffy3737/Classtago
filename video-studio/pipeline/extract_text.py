from pypdf import PdfReader
import sys

def extract_text(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text:
            text += f"\n--- Page {i+1} ---\n{page_text}"
    return text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_text.py <pdf_file>")
        sys.exit(1)
    pdf_file = sys.argv[1]
    result = extract_text(pdf_file)
    print(result)

