import { GlobalKnowledge } from "../fastDownward/global-knowledge";
import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { Variable } from "./variable";

/*
 * An empty skill expression used in case the learning skill does not have any requirement
 * The evaluation of this skill expression is always true
 * We use this to ensure consistency across all learning units
 * @param terms An empty set of the variables
 * @author Alamoush
 */
export class Empty extends SkillExpression {
    type: string;

    constructor() {
        super();
        this.type = "Empty";
    }

    // Evaluate always true, since it empty expression
    evaluate(
        learnedSkills: ReadonlyArray<string>,
        globalKnowledge: GlobalKnowledge,
        without?: Variable[]
    ): boolean {
        return true;
    }

    // No skills extracted, since it empty expression
    extractSkills(): Skill[] {
        return [];
    }

    // No translate, since it empty expression
    toJson(): string {
        return "";
    }

    // No excluding, since it empty expression
    filterSkillsByWithout(
        globalKnowledge: GlobalKnowledge,
        without?: Variable[]
    ): SkillExpression[] {
        return [];
    }
}
