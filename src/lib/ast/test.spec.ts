import { LearningUnit, Skill } from "../types";
import { Or } from "./or";
import { And } from "./and";
import { SkillExpression } from "./formula";
import { parseJsonExpression } from "./jsonHandler";

describe("precondition formula", () => {

	const skill1 = { id: "skill:1", repositoryId: "Map 1", nestedSkills: [] };
	const skill2 = { id: "skill:2", repositoryId: "Map 1", nestedSkills: [] };
	const skill3 = { id: "skill:3", repositoryId: "Map 1", nestedSkills: [] };
	const skill4 = { id: "skill:4", repositoryId: "Map 1", nestedSkills: [] };
	const skill5 = { id: "skill:5", repositoryId: "Map 1", nestedSkills: [] };
	const skill6 = { id: "skill:6", repositoryId: "Map 1", nestedSkills: [] };
	const skill7 = { id: "skill:7", repositoryId: "Map 1", nestedSkills: [] };
	const skill8 = { id: "skill:8", repositoryId: "Map 1", nestedSkills: [] };
	
	const firstMap: Skill[] = [skill1, skill2, skill3, skill4,
		skill5, skill6, skill7, skill8];
		
	it("skills in precondition formula", () => {

        const orSkills = new Or([skill1, skill2]);
        const andSkills = new And([skill3, skill4]);

        expect(orSkills.evaluate(["skill:1"])).toBeTruthy();
        expect(andSkills.evaluate(["skill:1"])).toBeFalsy();
		expect(andSkills.evaluate(["skill:3", "skill:4"])).toBeTruthy();
	});

	it("nested skill expression in precondition formula", () => {

        const orSkills = new Or([skill1, skill2]);
        const andSkills = new And([skill3, skill4]);

        const orSkillExpression = new Or([], [orSkills, andSkills]);
        const andSkillExpression = new And([], [orSkills, andSkills]);

        expect(orSkillExpression.evaluate(["skill:1"])).toBeTruthy();
        expect(andSkillExpression.evaluate(["skill:1"])).toBeFalsy();

	});

	it("complex skills expression with nested skills expressions precondition formula", () => {

        const andSkills = new And([skill1, skill2]);
        const orSkills = new Or([skill3, skill4]);

		const skillExpression3 = new And([], [new Or([skill5, skill6]), new And([], [andSkills, orSkills])]);

		expect(skillExpression3.evaluate(["skill:5", "skill:6"])).toBeFalsy();
		expect(skillExpression3.evaluate(["skill:1", "skill:2", "skill:3", "skill:5"])).toBeTruthy();
	});

	it("extract all skills from skill expression", () => {

        const orSkills = new Or([skill1, skill2]);
        const andSkills = new And([skill3, skill4]);

        const orSkillExpression = new Or([], [orSkills, andSkills]);
        const andSkillExpression = new And([], [orSkills, andSkills]);

		expect(orSkillExpression.extractSkills()).toEqual([skill1, skill2, skill3, skill4]);
		expect(andSkillExpression.extractSkills()).toEqual([skill1, skill2, skill3, skill4]);

	});

	it("convert skill expression to Json format string", () => {

        const orSkills = new Or([skill1]);
        const andSkills = new And([skill3, skill4]);

		const orSkillsJson = orSkills.toJson();
		const andSkillsJson = andSkills.toJson();

        expect(orSkillsJson).toBe("{\"operator\":\"Or\",\"skills\":[{\"id\":\"skill:1\",\"repositoryId\":\"Map 1\",\"nestedSkills\":[]}],\"expression\":[]}")
        expect(andSkillsJson).toBe("{\"operator\":\"And\",\"skills\":[{\"id\":\"skill:3\",\"repositoryId\":\"Map 1\",\"nestedSkills\":[]},{\"id\":\"skill:4\",\"repositoryId\":\"Map 1\",\"nestedSkills\":[]}],\"expression\":[]}")

	});

	it("convert and Json format string to skill expression", () => {

        const jsonSkillExpression = "{\"operator\":\"And\",\"skills\":[{\"id\":\"skill:3\",\"repositoryId\":\"Map 1\",\"nestedSkills\":[]},{\"id\":\"skill:4\",\"repositoryId\":\"Map 1\",\"nestedSkills\":[]}],\"expression\":[]}"

		const skillExpression = parseJsonExpression(jsonSkillExpression);

		expect(skillExpression.extractSkills().length).toBe(2);
		expect(skillExpression.evaluate(["skill:3"])).toBeFalsy();
		expect(skillExpression.evaluate(["skill:3", "skill:4"])).toBeTruthy();

	});

	it("convert or Json format string to skill expression", () => {

        const jsonSkillExpression = "{\"operator\":\"Or\",\"skills\":[{\"id\":\"skill:1\",\"repositoryId\":\"Map 1\",\"nestedSkills\":[]}],\"expression\":[]}";

		const skillExpression = parseJsonExpression(jsonSkillExpression);

		expect(skillExpression.extractSkills().length).toBe(1);
		expect(skillExpression.evaluate(["skill:1"])).toBeTruthy();

	});

	it("convert nested skill expression to Json format string", () => {

        const orSkills = new Or([skill1, skill2]);
        const andSkills = new And([skill3, skill4]);

        const orSkillExpression = new Or([], [orSkills, andSkills]);

		const orSkillExpressionJson = orSkillExpression.toJson()

		expect(orSkillExpressionJson).toBe("{\"operator\":\"Or\",\"skills\":[],\"expression\":[\"{\\\"operator\\\":\\\"Or\\\",\\\"skills\\\":[{\\\"id\\\":\\\"skill:1\\\",\\\"repositoryId\\\":\\\"Map 1\\\",\\\"nestedSkills\\\":[]},{\\\"id\\\":\\\"skill:2\\\",\\\"repositoryId\\\":\\\"Map 1\\\",\\\"nestedSkills\\\":[]}],\\\"expression\\\":[]}\",\"{\\\"operator\\\":\\\"And\\\",\\\"skills\\\":[{\\\"id\\\":\\\"skill:3\\\",\\\"repositoryId\\\":\\\"Map 1\\\",\\\"nestedSkills\\\":[]},{\\\"id\\\":\\\"skill:4\\\",\\\"repositoryId\\\":\\\"Map 1\\\",\\\"nestedSkills\\\":[]}],\\\"expression\\\":[]}\"]}")

	});

	it("convert nested Json format string to skill expression", () => {

		const jsonSkillExpression = "{\"operator\":\"Or\",\"skills\":[],\"expression\":[\"{\\\"operator\\\":\\\"Or\\\",\\\"skills\\\":[{\\\"id\\\":\\\"skill:1\\\",\\\"repositoryId\\\":\\\"Map 1\\\",\\\"nestedSkills\\\":[]},{\\\"id\\\":\\\"skill:2\\\",\\\"repositoryId\\\":\\\"Map 1\\\",\\\"nestedSkills\\\":[]}],\\\"expression\\\":[]}\",\"{\\\"operator\\\":\\\"And\\\",\\\"skills\\\":[{\\\"id\\\":\\\"skill:3\\\",\\\"repositoryId\\\":\\\"Map 1\\\",\\\"nestedSkills\\\":[]},{\\\"id\\\":\\\"skill:4\\\",\\\"repositoryId\\\":\\\"Map 1\\\",\\\"nestedSkills\\\":[]}],\\\"expression\\\":[]}\"]}";
		
		const skillExpression = parseJsonExpression(jsonSkillExpression);

		expect(skillExpression.extractSkills().length).toBe(4);
		expect(skillExpression.evaluate(["skill:3"])).toBeFalsy();
		expect(skillExpression.evaluate(["skill:1"])).toBeTruthy();
	});

	it("learning units filtering by precondition formula", () => {

		const skillExpression1 = new And([skill1, skill2, skill3]);
		const skillExpression2 = new Or([skill4, skill5]);
		const skillExpression3 = new Or([skill5, skill6], [new And([skill7, skill8])]);

		const unit1 = newLearningUnit(firstMap,
			"unit1",
			skillExpression1,
			[],
			[]);
	
		const unit2 = newLearningUnit(firstMap,
			"unit2",
			skillExpression2,
			[],
			[]);
	
		const unit3 = newLearningUnit(firstMap,
			"unit3",
			skillExpression3,
			[],
			[]);	
	
		const learningUnits = [unit1, unit2, unit3];

		const evaluateString1 = [skill1.id, skill2.id, skill3.id];
		const evaluateString2 = [skill4.id];
		const evaluateString3 = [skill5.id];
		const evaluateString4 = [skill7.id, skill8.id];

		const firstCheck = learningUnits.filter(unit => unit.requiredSkills.evaluate(evaluateString1));
		const secondCheck = learningUnits.filter(unit => unit.requiredSkills.evaluate(evaluateString2));
		const thirdCheck = learningUnits.filter(unit => unit.requiredSkills.evaluate(evaluateString3));
		const fourCheck = learningUnits.filter(unit => unit.requiredSkills.evaluate(evaluateString4));
		
		expect(firstCheck.length).toBe(1);
		expect(firstCheck.at(0).id).toBe(unit1.id);

		expect(secondCheck.length).toBe(1);
		expect(secondCheck.at(0).id).toBe(unit2.id);

		expect(thirdCheck.length).toBe(2);
		expect(thirdCheck.at(0).id).toBe(unit2.id);
		expect(thirdCheck.at(1).id).toBe(unit3.id);

		expect(fourCheck.length).toBe(1);
		expect(fourCheck.at(0).id).toBe(unit3.id);

	});
});

function newLearningUnit(
	map: Skill[],
	id: string,
	requiredSkills: SkillExpression,
	teachingGoals: string[],
	suggestedSkills: { weight: number; skill: string }[] = []
): preCondLearningUnit {
	const suggestions: { weight: number; skill: Skill }[] = [];
	if (suggestedSkills.length > 0) {
		for (const suggestion of suggestedSkills) {
			const skill = map.find(skill => suggestion.skill.includes(skill.id));
			if (skill) {
				suggestions.push({ weight: suggestion.weight, skill: skill });
			}
		}
	}

	return {
		id: id,
		requiredSkills: requiredSkills,
		teachingGoals: map.filter(skill => teachingGoals.includes(skill.id)),
		suggestedSkills: suggestions
	};
}

export type preCondLearningUnit = {
	id: string;
	mediaTime?: number;
	words?: number;
	requiredSkills: SkillExpression;
	teachingGoals: Skill[];
	suggestedSkills: { weight: number; skill: Skill }[];
};