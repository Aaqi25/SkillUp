/**
 * SkillUp AI - Client API Service
 * Communicates with the backend modular monolith via strict typed endpoints.
 * Stores authenticated JWT/HMAC token in localStorage and attaches to Authorization header.
 */

import {
  UserProfile,
  SkillItem,
  UserSkillRating,
  CareerRoleItem,
  CareerMatchItem,
  SkillGapAnalysis,
  RoadmapData,
  ProgressStatus,
  ClientAssessmentStartResponse,
  ClientAssessmentResult,
  StudentSkillProfile,
  SkillHistoryEntry,
} from '../types/index.js';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

const TOKEN_KEY = 'skillup_auth_token';

export const authStorage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage unavailable
    }
  },
  clearToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage unavailable
    }
  },
};

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const body: ApiResponse<T> = await res.json();
  if (!body.success && body.error) {
    throw new Error(body.error.message || 'API request failed');
  }
  return body.data as T;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  educationLevel?: string;
  degreeCourse?: string;
  academicYear?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProfileUpdatePayload {
  fullName?: string;
  educationLevel?: string;
  degreeCourse?: string;
  academicYear?: string;
  careerInterests?: string[];
  learningPreferences?: string[];
  onboardingCompleted?: boolean;
}

export const api = {
  // Module 1: Auth & Profile
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const data = await fetchJson<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const data = await fetchJson<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  logout: async (): Promise<{ message: string }> => {
    try {
      const res = await fetchJson<{ message: string }>('/api/auth/logout', { method: 'POST' });
      return res;
    } finally {
      authStorage.clearToken();
    }
  },

  getCurrentUser: (): Promise<UserProfile> => fetchJson<UserProfile>('/api/auth/me'),

  updateProfile: (updates: ProfileUpdatePayload): Promise<UserProfile> =>
    fetchJson<UserProfile>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Module 2: Assessment Engine
  startAssessment: (skills?: string[], isReassessment?: boolean): Promise<ClientAssessmentStartResponse> =>
    fetchJson<ClientAssessmentStartResponse>('/api/assessment/start', {
      method: 'POST',
      body: JSON.stringify({ skills, isReassessment }),
    }),

  submitAssessment: (payload: {
    assessmentId: string;
    isReassessment?: boolean;
    answers: Array<{ questionId: string; selectedOptionIndex: number; timeSpentSeconds?: number }>;
  }): Promise<ClientAssessmentResult> =>
    fetchJson<ClientAssessmentResult>('/api/assessment/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAssessmentHistory: (): Promise<ClientAssessmentResult[]> =>
    fetchJson<ClientAssessmentResult[]>('/api/assessment/history'),

  getAssessmentResult: (id: string): Promise<ClientAssessmentResult> =>
    fetchJson<ClientAssessmentResult>(`/api/assessment/results/${id}`),

  // Module 3: Skill Analysis Engine
  getSkills: (): Promise<SkillItem[]> => fetchJson<SkillItem[]>('/api/skills'),
  getSkillProfile: (): Promise<StudentSkillProfile> => fetchJson<StudentSkillProfile>('/api/skills/profile'),
  getStudentSkillProfile: (studentId: string): Promise<StudentSkillProfile> =>
    fetchJson<StudentSkillProfile>(`/api/skills/profile/${studentId}`),
  getSkillDetails: (skillId: string): Promise<SkillItem> => fetchJson<SkillItem>(`/api/skills/${skillId}`),
  getSkillHistory: (skillId: string): Promise<SkillHistoryEntry[]> =>
    fetchJson<SkillHistoryEntry[]>(`/api/skills/${skillId}/history`),

  // Preserved for subsequent modules
  getMySkills: () => fetchJson<UserSkillRating[]>('/api/skills/my-profile'),
  getCareers: () => fetchJson<CareerRoleItem[]>('/api/careers'),
  getCareerRecommendations: () =>
    fetchJson<{ recommendations: CareerMatchItem[]; selectedCareerId: string }>('/api/careers/recommendations'),
  selectCareer: (careerId: string) =>
    fetchJson<{ selectedCareerId: string }>('/api/careers/select', {
      method: 'POST',
      body: JSON.stringify({ careerId }),
    }),
  getSkillGap: (careerId?: string) =>
    fetchJson<SkillGapAnalysis>(`/api/skill-gap${careerId ? `?careerId=${careerId}` : ''}`),
  getRoadmap: () => fetchJson<RoadmapData>('/api/roadmap'),
  refineRoadmap: () => fetchJson<RoadmapData>('/api/roadmap/refine', { method: 'POST' }),
  getProgress: () => fetchJson<ProgressStatus>('/api/progress'),
};
