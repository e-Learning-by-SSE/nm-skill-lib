import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { createJson } from "./jsonHandler";

// Or skill expression
export class Or extends SkillExpression {
	constructor(private terms: SkillExpression[]) {
		super();
	}
	
	evaluate(skills: ReadonlyArray<string>): boolean {
        return this.terms.some(value => value.evaluate(skills));
	}

	extractSkills(): Skill[] {
		let skillList: Skill[] = [];
		this.terms.forEach(expression => {
			skillList = skillList.concat(expression.extractSkills())
		});

        return skillList;
	}

	toJson(): string {
		return createJson(Or.name, this.terms);
	}

}
