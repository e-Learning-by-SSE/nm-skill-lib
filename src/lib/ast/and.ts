import { ExpressionValues, Skill } from "../types";
import { SkillExpression } from "./formula";
import { createJson } from "./jsonHandler";

// And skill expression
export class And extends SkillExpression {
	constructor(private values: ExpressionValues) {
		super();
	}

	evaluate(skills: ReadonlyArray<string>): boolean {
        let skillsCheck = this.values.children.every(child => skills.includes(child.id));
        if (this.values.skillExpression) {
            const skillExpressionCheck = this.values.skillExpression.every(expression => expression.evaluate(skills));
            skillsCheck = (skillsCheck && skillExpressionCheck) ? true : false;
        }

        return skillsCheck;
	}

	extractSkills(): Skill[] {
        let skillsCheck = this.values.children.map(skill => skill);
        if (this.values.skillExpression) {
			this.values.skillExpression.forEach(expression => {
				skillsCheck = skillsCheck.concat(expression.extractSkills())
			});
        }

        return skillsCheck;
	}

	toJson(): string {
		return createJson(And.name, this.values.children.map(skill => skill), this.values.skillExpression);
	}
}