import google.generativeai as genai
import sys
import os

def ask_gemini(prompt: str):
    """
    Sends a prompt to Gemini and returns the response.
    """
    api_key = "123"
    if not api_key:
        return "Error: GEMINI_API_KEY not configured."
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error communicating with Gemini: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: ask_gemini.py <prompt>")
        sys.exit(1)
    
    prompt = " ".join(sys.argv[1:])
    print(ask_gemini(prompt))