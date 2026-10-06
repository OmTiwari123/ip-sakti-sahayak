from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

app = FastAPI(title="IP-SAKTI Sahayak API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Query(BaseModel):
    query: str


SYSTEM_PROMPT = """You are IP-SAKTI Sahayak, an AI assistant specializing in 
Intellectual Property (IP) protection for Indian Traditional Knowledge, 
especially Ayurveda. Reference relevant Indian laws (Patents Act 1970, 
Biological Diversity Act 2002) and international frameworks (PCT, Nagoya Protocol).
Keep answers focused and under 200 words unless the user asks for detail."""


@app.get("/")
def read_root():
    return {"message": "IP-SAKTI Sahayak Backend is running"}


@app.post("/chat")
async def chat(q: Query):
    try:
        response = client.chat.completions.create(
            model="google/gemini-2.5-flash",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": q.query},
            ],
max_tokens=1000,
        )
        return {
            "answer": response.choices[0].message.content,
            "sources": [],
        }
    except Exception as e:
        return {
            "answer": f"Sorry, I encountered an error: {str(e)}",
            "sources": [],
        }
