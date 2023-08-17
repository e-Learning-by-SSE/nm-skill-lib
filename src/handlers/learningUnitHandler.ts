import { LearningUnit } from '../data';

export interface LuHandler {
  /**
   * Load all LearningUnits that provide at least one of the given skills (als teaching goal)
   * @param skillIds The IDs of the skills that should be offered as teaching goals
   */
  loadProvidingLearningUnits(skillIds: string[]): Promise<LearningUnit[]>;
}
