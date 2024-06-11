import { Skill } from "../types";
import { SkillsRelations } from "./skillsRelation";
import { Variable } from "./variable";

// An abstract class for all skill expressions
// With three main methods; 
// evaluate: check the expression and get back the result
// extractSkills: return all skill in the expression as array of Skills
// toJson: convert the expression into Json format

export abstract class SkillExpression {
	abstract type: string;

	abstract evaluate(learnedSkills: ReadonlyArray<string>, skillsRelations: SkillsRelations, without?: Variable[]): boolean;

	abstract extractSkills(): Skill[];

	abstract toJson(): string;

	abstract filterSkillsByWithout(skillsRelations: SkillsRelations, without?: Variable[]): SkillExpression[];
}
