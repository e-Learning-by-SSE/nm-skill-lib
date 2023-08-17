
export class LearningUnitDto  {

  id: string;
  title:string; 
  requiredSkillIds?: string[] = [];
  teachingGoalIds?: string[] = [];


  constructor(
    id: string,
    title: string,
    requiredSkillIds: string[] | null,
    teachingGoalIds: string[] | null
    
    
  ) {
    this.id = id;
    this.title =  title;
    this.requiredSkillIds = requiredSkillIds;
    this.teachingGoalIds = teachingGoalIds;
  }

  
}
