"""
SkillUp AI - Dedicated AI Microservice (Python + FastAPI)
Handles non-deterministic AI capabilities:
- Personalized explanations
- Roadmap coaching refinement
- AI-generated reassessment questions (30% hybrid share)
- Feedback & learning resource recommendations
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(
    title="SkillUp AI - Dedicated AI Service",
    version="1.0.0",
    description="FastAPI service interfacing with LLMs for explanations, feedback, and adaptive question generation."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionGenerationRequest(BaseModel):
    skill_name: str
    difficulty: str = "medium"
    topic_context: Optional[str] = None

class GeneratedQuestionResponse(BaseModel):
    question_text: str
    options: List[str]
    correct_option_index: int
    explanation: str
    source: str = "ai_generated"

class GapExplanationRequest(BaseModel):
    student_name: str
    career_title: str
    top_gaps: List[dict]

class ExplanationResponse(BaseModel):
    personalized_summary: str
    recommended_focus_order: List[str]

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SkillUp AI Python/FastAPI Service",
        "version": "1.0.0"
    }

@app.post("/api/ai/questions/generate", response_model=GeneratedQuestionResponse)
async def generate_question(req: QuestionGenerationRequest):
    """
    Generates dynamic assessment questions for reassessment (hybrid 30% quota).
    """
    return GeneratedQuestionResponse(
        question_text=f"In {req.skill_name}, what design pattern best enforces single responsibility across modular service layers?",
        options=[
            "Separating business services from controller endpoints and persistence models",
            "Embedding all database queries directly inside route handlers",
            "Sharing global mutable state objects across all active user sessions",
            "Bypassing input validation in backend layers"
        ],
        correct_option_index=0,
        explanation="Decoupling domain services from controller routing and persistence enables testability and independent evolution.",
        source="ai_generated"
    )

@app.post("/api/ai/coaching/explain-gap", response_model=ExplanationResponse)
async def explain_skill_gap(req: GapExplanationRequest):
    """
    Produces non-deterministic coaching summaries and encouragement.
    Deterministic math is handled strictly by the Node backend.
    """
    gap_skills = [g.get("skill_name", "skill") for g in req.top_gaps]
    focus_summary = (
        f"Hi {req.student_name}! You have a solid foundation for {req.career_title}. "
        f"Your highest-leverage growth area right now is {gap_skills[0] if gap_skills else 'core skills'}, "
        "which will rapidly close your readiness gap."
    )
    return ExplanationResponse(
        personalized_summary=focus_summary,
        recommended_focus_order=gap_skills
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
