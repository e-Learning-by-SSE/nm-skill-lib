import { Skill } from "../types";

// An abstract class for all skill expressions
// With three main methods; 
// evaluate: check the expression and get back the result
// extractSkills: return all skill in the expression as array of Skills
// toJson: convert the expression into Json format

export abstract class SkillExpression {
	abstract evaluate(skills: ReadonlyArray<string>): boolean;

	abstract extractSkills(): Skill[];

	abstract toJson(): string;

}

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