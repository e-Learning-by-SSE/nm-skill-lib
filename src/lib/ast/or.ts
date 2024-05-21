import { Skill } from "../types";
import { SkillExpression } from "./formula";
import { createJson } from "./jsonHandler";

// Or skill expression
export class Or extends SkillExpression {
	constructor(private children: ReadonlyArray<Skill>, private skillExpression?: SkillExpression[]) {
		super();
	}

	evaluate(skills: ReadonlyArray<string>): boolean {
        let skillsCheck = this.children.some(child => skills.includes(child.id));
        if (this.skillExpression) {
            const skillExpressionCheck = this.skillExpression.some(expression => expression.evaluate(skills));
            skillsCheck = (skillsCheck || skillExpressionCheck) ? true : false;
        }

        return skillsCheck;
	}

	extractSkills(): Skill[] {
        let skillsCheck = this.children.map(skill => skill);
        if (this.skillExpression) {
			this.skillExpression.forEach(expression => {
				skillsCheck = skillsCheck.concat(expression.extractSkills())
			});
        }

        return skillsCheck;
	}

	toJson(): string {
		return createJson(Or.name, this.children.map(skill => skill), this.skillExpression);
	}

}
