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