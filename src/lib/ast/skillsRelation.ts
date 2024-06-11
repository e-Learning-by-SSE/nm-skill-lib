 
import { Skill } from "../types";

export class SkillsRelations{
	private parents: ReadonlyArray<Skill>;

	constructor(public skills: ReadonlyArray<Skill>) {
		this.parents = skills.filter(skill => skill.nestedSkills.length > 0);
	}

	getChildren(parent: Skill): Skill[] {
		return this.skills.filter(skill => parent.nestedSkills.includes(skill.id));
	}

}