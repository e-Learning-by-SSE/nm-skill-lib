

export class SkillDto {

  id: string;
  name: string;
  nestedSkillIds: string[];
  repositoryId: string;

  constructor(id: string, name:string, nestedSkillIds : string[], repositoryId: string) {
  
    this.name = name;
    
    this.id = id;
    this.nestedSkillIds = nestedSkillIds
    this.repositoryId = repositoryId;
  }
}
