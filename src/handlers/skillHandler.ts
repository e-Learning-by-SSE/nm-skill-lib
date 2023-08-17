import { Skill } from '../data/skill';

export interface SkillHandler {
  loadSkillsOfSameMap(skill: Skill): Promise<Skill[]>;
}
