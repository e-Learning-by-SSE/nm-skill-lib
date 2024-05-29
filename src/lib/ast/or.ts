import { Skill } from "../types";
import { SkillExpression } from "./formula";
import { createJson } from "./jsonHandler";

// Or skill expression
export class Or extends SkillExpression {
	constructor(private variable: SkillExpression[]) {
		super();
	}
	
	evaluate(skills: ReadonlyArray<string>): boolean {
        return this.variable.some(value => value.evaluate(skills));
	}

	extractSkills(): Skill[] {
		let skillList: Skill[] = [];
		this.variable.forEach(expression => {
			skillList = skillList.concat(expression.extractSkills())
		});

        return skillList;
	}

	toJson(): string {
		return createJson(Or.name, this.variable);
	}

}
