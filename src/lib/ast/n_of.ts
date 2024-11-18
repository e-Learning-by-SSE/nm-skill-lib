import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { createJson } from "./jsonHandler";
import { Variable } from "./variable";
import { SkillsRelations } from "./skillsRelation";

/*
 * Conjunctive (N_of) expression of which minimum terms must be fulfilled.
 * @param terms A set of the expressions/variables to be evaluate for N_of conjunctive
 * @author Alamoush
 */
export class N_of extends SkillExpression {
    constructor(private terms: SkillExpression[], private min: number) {
        super();
        this.type = "n_of";
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
        const validSkills = filterTerms.filter(value =>
            value.evaluate(learnedSkills, skillsRelations, without)
        );
        return validSkills.length >= this.min;
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
        return createJson(N_of.name, this.terms, this.min);
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
