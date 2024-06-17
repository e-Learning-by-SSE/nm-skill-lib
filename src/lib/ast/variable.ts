import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { SkillsRelations } from "./skillsRelation";

export class Variable extends SkillExpression {
	constructor(private skill: Skill) {
		super();
		this.type = "Variable";
	}

	evaluate(
		learnedSkills: readonly string[],
		skillsRelations: SkillsRelations,
		without?: Variable[]
	): boolean {
		return learnedSkills.includes(this.skill.id);
	}

	extractSkills(): Skill[] {
		return [this.skill];
	}

	toJson(): string {
		return this.skill.id;
	}

	filterSkillsByWithout(
		skillsRelations: SkillsRelations,
		without?: Variable[]
	): SkillExpression[] {
		let childSkills = skillsRelations.getChildren(this.skill);
		if (childSkills.length > 0) {
			childSkills = childSkills.filter(childSkill =>
				without.every(
					variable => !variable.evaluate([childSkill.id], skillsRelations, without)
				)
			);
		} else {
			childSkills = [this.skill];
		}

		const filteredTerms: SkillExpression[] = [];
		childSkills.forEach(skill => {
			filteredTerms.push(new Variable(skill));
		});
		return filteredTerms;
	}
}
