

import { LearningUnitDto } from '../input/learningUnit.dto';
import { SkillDto } from '../input/skill.dto';

/**
 * Creates a new LearningPath Goal for a specific audience.
 */
export class PathDto {
  
  title: string;



  
  requiredSkills: SkillDto[];
  learningUnits: LearningUnitDto[];

  constructor(
    title: string,
    requirements: SkillDto[],
    learningUnits: LearningUnitDto[]
  ) {
    this.title = title;
    this.learningUnits = learningUnits;
    this.requiredSkills = requirements;
 
  }
}
