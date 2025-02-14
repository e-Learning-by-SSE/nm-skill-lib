import { GlobalKnowledge } from "../fastDownward/global-knowledge";
import { Skill } from "../types";
import { Variable } from "./variable";

/*
 * An abstract representing conjunctive expression (expression or variable)
 * @author Alamoush
 * @abstract
 */
export abstract class SkillExpression {
    protected constructor(private type: string) {}

    getExpressionType() {
        return this.type;
    }

    abstract evaluate(
        learnedSkills: ReadonlyArray<string>,
        globalKnowledge: GlobalKnowledge,
        without?: Variable[]
    ): boolean;

    abstract extractSkills(): Skill[];

    abstract toJson(): string;

    abstract filterSkillsByWithout(
        globalKnowledge: GlobalKnowledge,
        without?: Variable[]
    ): SkillExpression[];
}
