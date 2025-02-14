import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { createJson } from "./jsonHandler";
import { Variable } from "./variable";
import { GlobalKnowledge } from "../fastDownward/global-knowledge";

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
        globalKnowledge: GlobalKnowledge,
        without?: Variable[]
    ): boolean {
        let filterTerms: SkillExpression[] = [];
        if (without) {
            filterTerms = this.filterSkillsByWithout(globalKnowledge, without);
        } else {
            filterTerms = this.terms;
        }
        return filterTerms.some(value => value.evaluate(learnedSkills, globalKnowledge, without));
    }

    // Extract all skills nested in the OR expression
    // Cache the extracted skills in extractedSkills property
    extractSkills(): Skill[] {
        if (this.extractedSkills.length == 0) {
            this.terms
                .flatMap(expression => [...expression.extractSkills()])
                .forEach(skill => this.extractedSkills.push(skill));
            this.extractedSkills = [...new Set(this.extractedSkills)];
        }

        return this.extractedSkills;
    }

    // Translate OR expression to Json string format
    toJson(): string {
        return createJson(Or.name, this.terms);
    }

    // Excluding the skills in the "without" variables list
    filterSkillsByWithout(
        globalKnowledge: GlobalKnowledge,
        without?: Variable[]
    ): SkillExpression[] {
        let filteredTerms: SkillExpression[] = [];
        this.terms.forEach(expression => {
            if (expression.getExpressionType() == "Variable") {
                filteredTerms.push(...expression.filterSkillsByWithout(globalKnowledge, without));
            } else {
                filteredTerms.push(expression);
            }
        });
        return filteredTerms;
    }
}
