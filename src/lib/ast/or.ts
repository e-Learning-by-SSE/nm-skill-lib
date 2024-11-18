import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { createJson } from "./jsonHandler";
import { Variable } from "./variable";
import { SkillsRelations } from "./skillsRelation";

/*
 * Conjunctive (OR) expression of which all terms must be fulfilled.
 * @param terms A set of the expressions/variables to be evaluate for OR conjunctive
 * @author Alamoush
 */
export class Or extends SkillExpression {
    constructor(private terms: SkillExpression[]) {
        super();
        this.type = "Or";
    }

    // OR expression property to cache all the extracted skills
    protected extractedSkills: Skill[] = [];

    // Evaluate this OR expression against the learned skills
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
        return filterTerms.some(value => value.evaluate(learnedSkills, skillsRelations, without));
    }

    // Extract all skills nested in the OR expression
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

    // Translate OR expression to Json string format
    toJson(): string {
        return createJson(Or.name, this.terms);
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
