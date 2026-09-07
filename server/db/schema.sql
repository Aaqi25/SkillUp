-- SkillUp AI - PostgreSQL Source of Truth Schema
-- Production-ready relational schema with strict integrity constraints, foreign keys, and indexes.

-- 1. Users & Profiles
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    education_level VARCHAR(128),
    degree_course VARCHAR(255),
    academic_year VARCHAR(64),
    career_interests JSONB DEFAULT '[]'::jsonb,
    learning_preferences JSONB DEFAULT '[]'::jsonb,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    target_career_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Skills Taxonomy
CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) UNIQUE NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN ('core_cs', 'frontend', 'backend', 'devops', 'ai_data', 'soft_skills')),
    description TEXT,
    max_score INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Skill Scores (Current state of student proficiency)
CREATE TABLE IF NOT EXISTS user_skills (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id VARCHAR(64) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (score >= 0 AND score <= 100),
    level VARCHAR(32) NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    last_assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_skill UNIQUE (user_id, skill_id)
);

-- 4. Assessment Questions (Hybrid: Curated vs AI-Generated)
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(64) PRIMARY KEY,
    skill_id VARCHAR(64) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    difficulty VARCHAR(32) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of 4 string options
    correct_option_index INTEGER NOT NULL CHECK (correct_option_index >= 0 AND correct_option_index <= 3),
    explanation TEXT NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'curated' CHECK (source IN ('curated', 'ai_generated')),
    weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Assessments & Reassessments
CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_reassessment BOOLEAN NOT NULL DEFAULT FALSE,
    target_skill_ids JSONB NOT NULL, -- List of skill IDs tested
    curated_question_count INTEGER NOT NULL DEFAULT 0,
    ai_generated_question_count INTEGER NOT NULL DEFAULT 0,
    total_score NUMERIC(5,2),
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Assessment Question Submissions
CREATE TABLE IF NOT EXISTS assessment_answers (
    id VARCHAR(64) PRIMARY KEY,
    assessment_id VARCHAR(64) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    score_awarded NUMERIC(5,2) NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Career Catalog
CREATE TABLE IF NOT EXISTS careers (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) UNIQUE NOT NULL,
    slug VARCHAR(128) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    market_demand VARCHAR(32) NOT NULL CHECK (market_demand IN ('moderate', 'high', 'very_high')),
    average_salary VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Career Required Skills (Weights must sum to 1.0 per career)
CREATE TABLE IF NOT EXISTS career_required_skills (
    id VARCHAR(64) PRIMARY KEY,
    career_id VARCHAR(64) NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
    skill_id VARCHAR(64) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    weight NUMERIC(4,3) NOT NULL CHECK (weight > 0 AND weight <= 1.0),
    target_level NUMERIC(5,2) NOT NULL CHECK (target_level >= 0 AND target_level <= 100),
    CONSTRAINT unique_career_skill UNIQUE (career_id, skill_id)
);

-- 9. User Selected Career Goal
CREATE TABLE IF NOT EXISTS user_career_goals (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    career_id VARCHAR(64) NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
    match_percentage NUMERIC(5,2) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Skill Gaps (Deterministic calculations stored for audit & tracking)
CREATE TABLE IF NOT EXISTS skill_gaps (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    career_id VARCHAR(64) NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
    skill_id VARCHAR(64) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    current_score NUMERIC(5,2) NOT NULL,
    required_score NUMERIC(5,2) NOT NULL,
    gap NUMERIC(5,2) NOT NULL,
    priority VARCHAR(32) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    estimated_weeks_to_bridge INTEGER NOT NULL DEFAULT 1,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_career_gap UNIQUE (user_id, career_id, skill_id)
);

-- 11. Personalized Roadmaps & Milestones
CREATE TABLE IF NOT EXISTS roadmaps (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    career_id VARCHAR(64) NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
    total_estimated_weeks INTEGER NOT NULL DEFAULT 12,
    ai_overview_summary TEXT, -- Rule 5: AI explanation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_refined_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS roadmap_milestones (
    id VARCHAR(64) PRIMARY KEY,
    roadmap_id VARCHAR(64) NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    target_skill_id VARCHAR(64) NOT NULL REFERENCES skills(id),
    description TEXT NOT NULL,
    estimated_hours INTEGER NOT NULL DEFAULT 10,
    status VARCHAR(32) NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
    ai_coaching_note TEXT, -- Rule 5: Personalized AI coaching note
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 12. Learning Resources
CREATE TABLE IF NOT EXISTS learning_resources (
    id VARCHAR(64) PRIMARY KEY,
    skill_id VARCHAR(64) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    milestone_id VARCHAR(64) REFERENCES roadmap_milestones(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('course', 'documentation', 'project', 'exercise')),
    url TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    difficulty VARCHAR(32) NOT NULL DEFAULT 'intermediate'
);

-- 13. Progress Tracking Log
CREATE TABLE IF NOT EXISTS progress_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_id VARCHAR(64) REFERENCES roadmap_milestones(id) ON DELETE CASCADE,
    action_type VARCHAR(64) NOT NULL, -- e.g., 'started_milestone', 'completed_resource', 'finished_milestone', 'triggered_reassessment'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_skill ON questions(skill_id);
CREATE INDEX IF NOT EXISTS idx_career_skills_career ON career_required_skills(career_id);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_user_career ON skill_gaps(user_id, career_id);
CREATE INDEX IF NOT EXISTS idx_milestones_roadmap ON roadmap_milestones(roadmap_id);
