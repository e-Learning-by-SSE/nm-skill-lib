import { Skill } from "../types";
import { SkillExpression } from "./skillExpression";
import { Variable } from "./variable";
import { SkillsRelations } from "./skillsRelation";

// And skill expression
export class Empty extends SkillExpression {
    type: string;

	constructor(private terms: SkillExpression[]) {
		super();
        this.type = "Empty";
	}

	evaluate(learnedSkills: ReadonlyArray<string>, skillsRelations: SkillsRelations, without?: Variable[]): boolean {
		return true;
	}

	extractSkills(): Skill[] {
        return [];
	}

	toJson(): string {
		return "";
	}

	filterSkillsByWithout(skillsRelations: SkillsRelations, without?: Variable[]): SkillExpression[] {
		return [];
	}

}
