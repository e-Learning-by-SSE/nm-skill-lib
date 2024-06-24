import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { createJson } from "./jsonHandler";
import { Variable } from "./variable";
import { SkillsRelations } from "./skillsRelation";

/*
 * Conjunctive (AND) expression of which all terms must be fulfilled.
 * @param terms A set of the expressions/variables to be evaluate for AND conjunctive
 * @author Alamoush
 */
export class And extends SkillExpression {
	constructor(private terms: SkillExpression[]) {
		super();
		this.type = "And";
	}

	// AND expression property to cache all the extracted skills
	protected extractedSkills: Skill[] = [];

	// Evaluate this AND expression against the learned skills
	// Using parent/children skills relation "skillsRelations"
	// Exclude the variable in the "without" list from this evaluation (if not explicitly in the terms)
	evaluate(
		learnedSkills: ReadonlyArray<string>,
		skillsRelations: SkillsRelations,
		without?: Variable[]
	): boolean {
		let filterTerms: SkillExpression[] = [];
		if (without) {
			filterTerms = this.filterSkillsByWithout(skillsRelations, without);
		} else {
			filterTerms = this.terms;
		}
		return filterTerms.every(value => value.evaluate(learnedSkills, skillsRelations, without));
	}

	// Extract all skills nested in the AND expression
	// Cache the extracted skills in extractedSkills property
	extractSkills(): Skill[] {
		if (this.extractedSkills.length == 0) {
			let skillList: Skill[] = [];
			this.terms.forEach(expression => {
				skillList.push(...expression.extractSkills());
			});
			this.extractedSkills = [...new Set(skillList.slice())];
		}

		return this.extractedSkills;
	}

	// Translate AND expression to Json string format
	toJson(): string {
		return createJson(And.name, this.terms);
	}

	// Excluding the skills in the "without" variables list
	filterSkillsByWithout(
		skillsRelations: SkillsRelations,
		without?: Variable[]
	): SkillExpression[] {
		let filteredTerms: SkillExpression[] = [];
		this.terms.forEach(expression => {
			if (expression.getExpressionType() == "Variable") {
				filteredTerms.push(...expression.filterSkillsByWithout(skillsRelations, without));
			} else {
				filteredTerms.push(expression);
			}
		});
		return filteredTerms;
	}
}
