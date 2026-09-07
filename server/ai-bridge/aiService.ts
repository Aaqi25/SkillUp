/**
 * SkillUp AI - Server-Side AI Service Bridge
 * 
 * ARCHITECTURAL RULE 5:
 * AI should be used for personalization, explanations, roadmap refinement, feedback,
 * and AI-generated questions.
 * 
 * ARCHITECTURAL RULE 13:
 * Never expose API keys in frontend code.
 */

import { GoogleGenAI } from '@google/genai';
import { SkillGapItem, RoadmapMilestone, AssessmentQuestion } from '../common/types.js';

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (genAIClient) return genAIClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      genAIClient = new GoogleGenAI({ apiKey });
      return genAIClient;
    } catch (err) {
      console.warn('[AI Service] Failed to initialize GoogleGenAI client:', err);
      return null;
    }
  }
  return null;
}

export class AIServiceBridge {
  /**
   * Generates a personalized student coaching explanation for identified skill gaps.
   */
  public static async generateGapExplanation(
    studentName: string,
    careerTitle: string,
    gaps: SkillGapItem[]
  ): Promise<string> {
    const ai = getGenAI();
    if (!ai) {
      return `Welcome ${studentName}. For your target role as a ${careerTitle}, focusing first on ${gaps[0]?.skillName || 'core fundamentals'} will unlock the highest immediate leverage. Your path is well within reach with focused modular study.`;
    }

    try {
      const topGapsSummary = gaps
        .slice(0, 3)
        .map(g => `${g.skillName} (Current: ${g.currentScore}%, Target: ${g.requiredScore}%, Priority: ${g.priority})`)
        .join(', ');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an encouraging engineering career coach at SkillUp AI. Write a concise, 2-3 sentence personalized explanation for student ${studentName} aspiring to become a ${careerTitle}. Their top skill gaps are: ${topGapsSummary}. Provide an encouraging, tactical takeaway. Do not output markdown lists.`,
      });

      return response.text?.trim() || `Focusing on ${gaps[0]?.skillName || 'core skills'} will give you the quickest traction toward becoming a ${careerTitle}.`;
    } catch (error) {
      console.warn('[AI Service] Error generating gap explanation:', error);
      return `Targeting ${gaps[0]?.skillName || 'key prerequisites'} will provide the fastest progress toward your career objective.`;
    }
  }

  /**
   * Refines a personalized learning roadmap with contextual coaching advice.
   */
  public static async refineRoadmapCoaching(
    careerTitle: string,
    milestones: RoadmapMilestone[]
  ): Promise<RoadmapMilestone[]> {
    const ai = getGenAI();
    if (!ai) {
      return milestones.map((m, idx) => ({
        ...m,
        aiCoachingNote: `Milestone ${idx + 1}: Build a small hands-on project to validate concepts in ${m.targetSkillName}.`,
      }));
    }

    try {
      const prompt = `Given these milestones for a student learning to be a ${careerTitle}:
${milestones.map((m, i) => `${i + 1}. ${m.title} (${m.targetSkillName})`).join('\n')}
Provide a JSON array of concise coaching tips (one string per milestone, max 20 words each) giving actionable study advice. Format strictly as JSON array of strings.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tips: string[] = JSON.parse(jsonMatch[0]);
        return milestones.map((m, i) => ({
          ...m,
          aiCoachingNote: tips[i] || `Apply ${m.targetSkillName} in an end-to-end sandbox project.`,
        }));
      }
    } catch (err) {
      console.warn('[AI Service] Error refining roadmap:', err);
    }

    return milestones.map(m => ({
      ...m,
      aiCoachingNote: `Dedicate hands-on code practice to master ${m.targetSkillName}.`,
    }));
  }

  /**
   * Generates adaptive assessment questions for reassessment (30% dynamic questions).
   */
  public static async generateAdaptiveQuestion(
    skillName: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<Partial<AssessmentQuestion>> {
    const ai = getGenAI();
    if (!ai) {
      return {
        questionText: `In ${skillName}, which design choice minimizes runtime bottlenecks?`,
        options: [
          'Proper asynchronous non-blocking I/O and caching',
          'Heavy synchronous file polling',
          'Single huge monolithic functions without modular separation',
          'Avoiding type safety checks',
        ],
        correctOptionIndex: 0,
        explanation: 'Asynchronous I/O and caching reduce main-thread latency and maximize throughput.',
        source: 'ai_generated',
      };
    }

    try {
      const prompt = `Generate a single multiple-choice technical question for ${skillName} at ${difficulty} difficulty.
Return ONLY valid JSON matching this schema:
{
  "questionText": "string",
  "options": ["option 0", "option 1", "option 2", "option 3"],
  "correctOptionIndex": 0,
  "explanation": "concise explanation why option is correct"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          source: 'ai_generated',
        };
      }
    } catch (err) {
      console.warn('[AI Service] Question generation failed, using fallback:', err);
    }

    return {
      questionText: `What is a fundamental best practice when scaling ${skillName}?`,
      options: [
        'Separation of concerns, modular structure, and automated testing',
        'Putting all code in one file for faster access',
        'Skipping error handling',
        'Using global mutable state across all modules',
      ],
      correctOptionIndex: 0,
      explanation: 'Modular design and automated testing ensure scalability and maintainability.',
      source: 'ai_generated',
    };
  }
}
