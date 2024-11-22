import { GlobalKnowledge } from "../fastDownward/global-knowledge";
import { Skill } from "../types";
import { And } from "./and";
import { SkillExpression } from "./skillExpression";

export class Variable extends SkillExpression {
    constructor(private skill: Skill) {
        super();
        this.type = "Variable";
    }

    evaluate(
        learnedSkills: readonly string[],
        globalKnowledge: GlobalKnowledge,
        without?: Variable[]
    ): boolean {
        if (globalKnowledge.getParent(this.skill.id) && without) {
            const filterTerms = this.filterSkillsByWithout(globalKnowledge, without);
            return filterTerms.every(value =>
                value.evaluate(learnedSkills, globalKnowledge, without)
            );
        }
        return learnedSkills.includes(this.skill.id);
    }

    extractSkills(): Skill[] {
        return [this.skill];
    }

    toJson(): string {
        return this.skill.id;
    }

    filterSkillsByWithout(
        globalKnowledge: GlobalKnowledge,
        without?: Variable[]
    ): SkillExpression[] {
        let childSkills = globalKnowledge.getChildrenSkills(this.skill);
        if (childSkills.length > 0) {
            childSkills = childSkills.filter(childSkill =>
                without!.every(variable => !variable.evaluate([childSkill.id], globalKnowledge))
            );
        } else {
            childSkills = [this.skill];
        }

        return childSkills.length == 1
            ? childSkills.map(skill => new Variable(skill))
            : [new And(childSkills.map(skill => new Variable(skill)))];
    }
}
