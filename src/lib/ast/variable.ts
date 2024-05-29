import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";

export class Variable extends SkillExpression{
	constructor(private skill: Skill) {
		super();
	}

	evaluate(skills: readonly string[]): boolean {
		return skills.includes(this.skill.id);
	}

	extractSkills(): Skill[] {
		return [this.skill];
	}

	toJson(): string {
		return this.skill.id;
	}

}