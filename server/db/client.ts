import { INITIAL_SKILLS, INITIAL_CAREERS, CURATED_QUESTIONS } from './seedData.js';
import { hashPassword } from '../modules/auth/authService.js';
import {
  Skill,
  CareerRole,
  AssessmentQuestion,
  AssessmentAttempt,
  User,
  UserSkillScore,
  AssessmentResult,
  PersonalizedRoadmap,
  SkillGapItem
} from '../common/types.js';

export interface DatabaseState {
  users: Map<string, User>;
  skills: Map<string, Skill>;
  careers: Map<string, CareerRole>;
  questions: Map<string, AssessmentQuestion>;
  attempts: Map<string, AssessmentAttempt>;
  userSkills: Map<string, Map<string, UserSkillScore>>;
  userCareerGoals: Map<string, string>;
  userRoadmaps: Map<string, PersonalizedRoadmap>;
  userGaps: Map<string, SkillGapItem[]>;
  assessmentHistory: Map<string, AssessmentResult[]>;
}

// In-memory relational store mirroring the PostgreSQL schema
// Allows instant testing, Antigravity integration, and seamless swap with pg pool
class DatabaseClient {
  private state: DatabaseState = {
    users: new Map(),
    skills: new Map(),
    careers: new Map(),
    questions: new Map(),
    attempts: new Map(),
    userSkills: new Map(),
    userCareerGoals: new Map(),
    userRoadmaps: new Map(),
    userGaps: new Map(),
    assessmentHistory: new Map(),
  };

  constructor() {
    this.seed();
  }

  private seed() {
    // Default demo student (seeded with hashed demo password 'StudentPass123!')
    const demoUser: User = {
      id: 'usr_student_demo_01',
      email: 'student@skillup.ai',
      passwordHash: hashPassword('StudentPass123!'),
      fullName: 'Alex Morgan',
      role: 'student',
      educationLevel: 'Undergraduate',
      degreeCourse: 'Computer Science',
      academicYear: 'Year 3',
      careerInterests: ['Full Stack Engineer', 'Backend Systems', 'Cloud DevOps'],
      learningPreferences: ['Hands-on Projects', 'Interactive Labs', 'Code Walkthroughs'],
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.users.set(demoUser.id, demoUser);

    // Seed skills
    for (const skill of INITIAL_SKILLS) {
      this.state.skills.set(skill.id, skill);
    }

    // Seed careers
    for (const career of INITIAL_CAREERS) {
      this.state.careers.set(career.id, career);
    }

    // Seed curated questions
    for (const q of CURATED_QUESTIONS) {
      this.state.questions.set(q.id, q);
    }

    // Seed initial user skill baseline (prior to assessment)
    const initialScores = new Map<string, UserSkillScore>();
    initialScores.set('skl_ts_react', {
      skillId: 'skl_ts_react',
      skillName: 'TypeScript & Modern React',
      score: 65,
      level: 'intermediate',
      lastAssessedAt: new Date().toISOString(),
    });
    initialScores.set('skl_node_express', {
      skillId: 'skl_node_express',
      skillName: 'Node.js & Express Architecture',
      score: 55,
      level: 'intermediate',
      lastAssessedAt: new Date().toISOString(),
    });
    initialScores.set('skl_db_sql', {
      skillId: 'skl_db_sql',
      skillName: 'PostgreSQL & Database Design',
      score: 45,
      level: 'beginner',
      lastAssessedAt: new Date().toISOString(),
    });
    initialScores.set('skl_dsa', {
      skillId: 'skl_dsa',
      skillName: 'Data Structures & Algorithms',
      score: 50,
      level: 'intermediate',
      lastAssessedAt: new Date().toISOString(),
    });
    initialScores.set('skl_sys_design', {
      skillId: 'skl_sys_design',
      skillName: 'System Design & Scalability',
      score: 35,
      level: 'beginner',
      lastAssessedAt: new Date().toISOString(),
    });
    initialScores.set('skl_devops_docker', {
      skillId: 'skl_devops_docker',
      skillName: 'Docker, CI/CD & Cloud Deployments',
      score: 40,
      level: 'beginner',
      lastAssessedAt: new Date().toISOString(),
    });

    this.state.userSkills.set(demoUser.id, initialScores);
  }

  // Repository methods
  getUser(id: string): User | undefined {
    return this.state.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    for (const user of this.state.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return undefined;
  }

  createUser(user: User): User {
    this.state.users.set(user.id, user);
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const existing = this.state.users.get(id);
    if (!existing) return undefined;
    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.users.set(id, updated);
    return updated;
  }

  getAllSkills(): Skill[] {
    return Array.from(this.state.skills.values());
  }

  getSkill(id: string): Skill | undefined {
    return this.state.skills.get(id);
  }

  getAllCareers(): CareerRole[] {
    return Array.from(this.state.careers.values());
  }

  getCareer(id: string): CareerRole | undefined {
    return this.state.careers.get(id);
  }

  getAllQuestions(): AssessmentQuestion[] {
    return Array.from(this.state.questions.values());
  }

  getQuestion(id: string): AssessmentQuestion | undefined {
    return this.state.questions.get(id);
  }

  getQuestionsForSkills(skillIds: string[]): AssessmentQuestion[] {
    return Array.from(this.state.questions.values()).filter(q => skillIds.includes(q.skillId));
  }

  addQuestion(question: AssessmentQuestion): void {
    this.state.questions.set(question.id, question);
  }

  // Assessment Attempts
  createAssessmentAttempt(attempt: AssessmentAttempt): AssessmentAttempt {
    this.state.attempts.set(attempt.id, attempt);
    return attempt;
  }

  getAssessmentAttempt(id: string): AssessmentAttempt | undefined {
    return this.state.attempts.get(id);
  }

  updateAssessmentAttempt(id: string, updates: Partial<AssessmentAttempt>): AssessmentAttempt | undefined {
    const existing = this.state.attempts.get(id);
    if (!existing) return undefined;
    const updated: AssessmentAttempt = {
      ...existing,
      ...updates,
    };
    this.state.attempts.set(id, updated);
    return updated;
  }

  getUserAttempts(userId: string): AssessmentAttempt[] {
    return Array.from(this.state.attempts.values()).filter(a => a.userId === userId);
  }

  getUserSkills(userId: string): UserSkillScore[] {
    const skillsMap = this.state.userSkills.get(userId);
    if (!skillsMap) return [];
    return Array.from(skillsMap.values());
  }

  updateUserSkill(userId: string, skillId: string, score: number): void {
    let skillsMap = this.state.userSkills.get(userId);
    if (!skillsMap) {
      skillsMap = new Map();
      this.state.userSkills.set(userId, skillsMap);
    }
    const skill = this.state.skills.get(skillId);
    const skillName = skill ? skill.name : skillId;

    let level: UserSkillScore['level'] = 'beginner';
    if (score >= 80) level = 'expert';
    else if (score >= 65) level = 'advanced';
    else if (score >= 45) level = 'intermediate';

    skillsMap.set(skillId, {
      skillId,
      skillName,
      score: Math.round(score * 10) / 10,
      level,
      lastAssessedAt: new Date().toISOString(),
    });
  }

  saveAssessmentResult(result: AssessmentResult): void {
    const list = this.state.assessmentHistory.get(result.userId) || [];
    list.push(result);
    this.state.assessmentHistory.set(result.userId, list);
  }

  getUserAssessments(userId: string): AssessmentResult[] {
    return this.state.assessmentHistory.get(userId) || [];
  }

  getAssessmentResultById(assessmentId: string): AssessmentResult | undefined {
    for (const history of this.state.assessmentHistory.values()) {
      const found = history.find(r => r.assessmentId === assessmentId);
      if (found) return found;
    }
    return undefined;
  }

  setUserCareerGoal(userId: string, careerId: string): void {
    this.state.userCareerGoals.set(userId, careerId);
  }

  getUserCareerGoal(userId: string): string | undefined {
    return this.state.userCareerGoals.get(userId);
  }

  saveRoadmap(roadmap: PersonalizedRoadmap): void {
    this.state.userRoadmaps.set(roadmap.userId, roadmap);
  }

  getUserRoadmap(userId: string): PersonalizedRoadmap | undefined {
    return this.state.userRoadmaps.get(userId);
  }

  saveUserGaps(userId: string, gaps: SkillGapItem[]): void {
    this.state.userGaps.set(userId, gaps);
  }

  getUserGaps(userId: string): SkillGapItem[] {
    return this.state.userGaps.get(userId) || [];
  }
}

export const db = new DatabaseClient();
