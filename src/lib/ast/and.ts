import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { createJson } from "./jsonHandler";

// And skill expression
export class And extends SkillExpression {
	constructor(private terms: SkillExpression[]) {
		super();
	}

	evaluate(skills: ReadonlyArray<string>): boolean {
		//const skillList = this.variable.map(variable => variable.skill);
        //let skillsCheck = skillList.every(child => skills.includes(child.id));
		//const skillExpressionCheck = this.variable.every(expression => expression.evaluate(skills));
		//skillsCheck = (skillsCheck && skillExpressionCheck) ? true : false;
        return this.terms.every(value => value.evaluate(skills));
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

}