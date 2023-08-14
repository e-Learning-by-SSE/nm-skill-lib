import { SkillDto } from "./skill.dto";

export class SkillMapDto  {

  
  id: string;
  name: string;
  ownerId: string;
  taxonomy?: string;
  skills :SkillDto []
  constructor(
    id: string,
    name: string,
    ownerId: string | null,
    taxonomy: string | null,
    skills: SkillDto []
  ) {
 
    this.id = id;
    this.skills = skills;
    this.name = name;
    this.ownerId = ownerId;
    this.taxonomy = taxonomy ?? undefined;
    
  }

  
}
