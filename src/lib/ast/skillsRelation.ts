import { Skill } from "../types";

// An internal type used within this file to hold nested skill as Skills[] not string[]
type ParentSkills = {
	skill: Skill;
	children: Skill[];
};

/*
 * Stores all available Skills in a more structured way (Parent/Children), to allow for faster access.
 * @param skills The set of all skills
 * @author Alamoush
 */
export class SkillsRelations {
	private parentSkills = new Map<string, ParentSkills>();

	constructor(public skills: ReadonlyArray<Skill>) {
		skills
			.filter(skill => skill.nestedSkills.length > 0)
			.forEach(parent => {
				this.parentSkills.set(parent.id, {
					skill: parent,
					children: this.skills.filter(skill => parent.nestedSkills.includes(skill.id))
				});
			});
	}

	getAllParents() {
		return Array.from(this.parentSkills.values());
	}

	// Get the children skills for a given skill
	getChildren(skill: Skill): Skill[] {
		const parentSkill = this.parentSkills.get(skill.id);
		if (parentSkill) {
			const Skills: Skill[] = [];
			parentSkill.children.forEach(child => {
				const children = this.getChildren(child);
				children.length == 0 ? children.push(child) : null;
				Skills.push(...children);
			});
			return Skills;
		} else {
			return [];
		}
	}
}
