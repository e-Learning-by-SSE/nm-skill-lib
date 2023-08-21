import { LearningUnit, Skill } from './types';

export interface LearningUnitProvider {
  /**
   * Load all LearningUnits that provide at least one of the given skills (as teaching goal)
   * @param skillIds The IDs of the skills that should be offered as teaching goals
   */
  getLearningUnitsBySkills(skillIds: string[]): Promise<LearningUnit[]>;
}

export interface SkillProvider {
  getSkillsByRepository(repositoryId: string): Promise<Skill[]>;
}
