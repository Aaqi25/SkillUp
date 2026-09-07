import { Router, Response } from 'express';
import { sendSuccess } from '../../common/utils/response.js';

export const resourcesRouter = Router();

resourcesRouter.get('/', (req, res: Response) => {
  const skillId = req.query.skillId as string;

  const sampleResources = [
    {
      id: 'res_ts_01',
      skillId: 'skl_ts_react',
      title: 'Production React 19 Patterns & Server Components',
      type: 'course',
      provider: 'SkillUp Academy',
      url: 'https://react.dev',
      durationMinutes: 120,
      difficulty: 'intermediate',
    },
    {
      id: 'res_node_01',
      skillId: 'skl_node_express',
      title: 'High-Throughput Node.js & Modular Monolith Patterns',
      type: 'documentation',
      provider: 'Node.js Foundation',
      url: 'https://nodejs.org',
      durationMinutes: 90,
      difficulty: 'advanced',
    },
    {
      id: 'res_db_01',
      skillId: 'skl_db_sql',
      title: 'PostgreSQL Relational Schema Design & Index Optimization',
      type: 'project',
      provider: 'PostgreSQL Community',
      url: 'https://postgresql.org',
      durationMinutes: 180,
      difficulty: 'advanced',
    },
    {
      id: 'res_dsa_01',
      skillId: 'skl_dsa',
      title: 'Algorithmic Problem Solving & Complexity Invariants',
      type: 'exercise',
      provider: 'OpenDSA',
      url: 'https://opendsa.org',
      durationMinutes: 60,
      difficulty: 'hard',
    },
  ];

  const filtered = skillId
    ? sampleResources.filter(r => r.skillId === skillId)
    : sampleResources;

  return sendSuccess(res, filtered, 'resources');
});
