import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { createJson } from "./jsonHandler";
import { Variable } from "./variable";
import { SkillsRelations } from "./skillsRelation";

// And skill expression
export class And extends SkillExpression {
	type: string = "And";

	constructor(private terms: SkillExpression[]) {
		super();
	}

	evaluate(learnedSkills: ReadonlyArray<string>, skillsRelations: SkillsRelations, without?: Variable[]): boolean {
		let filterTerms = this.filterSkillsByWithout(skillsRelations, without);
		return filterTerms.every(value => value.evaluate(learnedSkills, skillsRelations, without));
	}

	extractSkills(): Skill[] {
		let skillList: Skill[] = [];
		this.terms.forEach(expression => {
			skillList = skillList.concat(expression.extractSkills())
		});

        return skillList;
	}

	toJson(): string {
		return createJson(And.name, this.terms);
	}

	filterSkillsByWithout(skillsRelations: SkillsRelations, without?: Variable[]): SkillExpression[] {
		let filteredTerms: SkillExpression[] = [];
		this.terms.forEach(expression => {
			if (expression.type == "Variable") {
				filteredTerms.push(...expression.filterSkillsByWithout(skillsRelations, without));
			} else {
				filteredTerms.push(expression);
			}
		});
		return filteredTerms;
	}

}
