import { Skill } from "../types";
import { SkillsRelations } from "./skillsRelation";
import { Variable } from "./variable";

/*
 * An abstract representing conjunctive expression (expression or variable)
 * @author Alamoush
 * @abstract
 */
export abstract class SkillExpression {
    protected type: string;

    getExpressionType() {
        return this.type;
    }

    abstract evaluate(
        learnedSkills: ReadonlyArray<string>,
        skillsRelations: SkillsRelations,
        without?: Variable[]
    ): boolean;

    abstract extractSkills(): Skill[];

    abstract toJson(): string;

    abstract filterSkillsByWithout(
        skillsRelations: SkillsRelations,
        without?: Variable[]
    ): SkillExpression[];
}
