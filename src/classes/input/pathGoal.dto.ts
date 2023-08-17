import { SkillDto } from './skill.dto';

/**
 * Creates a new LearningPath Goal for a specific audience.
 */
export class PathGoalDto {
  id: string;
  title: string;
  pathGoals: SkillDto[];
  requiredSkills: SkillDto[];

  constructor(
    id: string,
    title: string,
    requirements: SkillDto[],
    pathGoals: SkillDto[]
  ) {
    this.id = id;
    this.title = title;

    this.requiredSkills = requirements;
    this.pathGoals = pathGoals;
  }
}
