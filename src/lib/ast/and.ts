import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { createJson } from "./jsonHandler";
import { Variable } from "./variable";
import { GlobalKnowledge } from "../fastDownward/global-knowledge";

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
        globalKnowledge: GlobalKnowledge,
        without?: Variable[]
    ): boolean {
        let filterTerms: SkillExpression[] = [];
        if (without) {
            filterTerms = this.filterSkillsByWithout(globalKnowledge, without);
        } else {
            filterTerms = this.terms;
        }
        return filterTerms.every(value => value.evaluate(learnedSkills, globalKnowledge, without));
    }

    // Extract all skills nested in the AND expression
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

    // Translate AND expression to Json string format
    toJson(): string {
        return createJson(And.name, this.terms);
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
