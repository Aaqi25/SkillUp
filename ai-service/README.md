# SkillUp AI - Dedicated AI Microservice (Python + FastAPI)

## Architecture Overview
The SkillUp AI system employs a **Modular Monolith for the main backend (Node.js + Express + TypeScript)** paired with a **separate AI Service (Python + FastAPI)**.

### Architectural Rules Enforced:
1. **Rule 1 & Rule 2**: No deterministic calculations in the AI service. Scoring, career weights, and gap math live exclusively in the Node.js backend logic.
2. **Rule 5**: This service exclusively handles non-deterministic tasks:
   - Natural language coaching explanations for skill gaps.
   - Learning roadmap contextual tips & coaching notes.
   - Question generation for reassessment (~30% quota).
   - Student feedback summarization.
3. **Rule 13**: API keys (`GEMINI_API_KEY`) are kept server-side in container environment variables and never surfaced to frontend clients.
4. **Rule 14**: Antigravity ready with standard JSON schemas and HTTP contracts.

## Local Execution
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
