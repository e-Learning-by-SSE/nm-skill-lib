import { Skill } from "../types";
import { Or } from "./or";
import { And } from "./and";
import { SkillExpression } from "./skillExpression";
import { parseJsonExpression } from "./jsonHandler";
import { Variable } from "./variable";
import { SkillsRelations } from "./skillsRelation";
import { Empty } from "./empty";

describe("precondition formula", () => {

	const skill1 = { id: "skill:1", repositoryId: "Map 1", nestedSkills: [] };
	const skill2 = { id: "skill:2", repositoryId: "Map 1", nestedSkills: [] };
	const skill3 = { id: "skill:3", repositoryId: "Map 1", nestedSkills: [] };
	const skill4 = { id: "skill:4", repositoryId: "Map 1", nestedSkills: [] };
	const skill5 = { id: "skill:5", repositoryId: "Map 1", nestedSkills: [] };
	const skill6 = { id: "skill:6", repositoryId: "Map 1", nestedSkills: [] };
	const skill7 = { id: "skill:7", repositoryId: "Map 1", nestedSkills: [] };
	const skill8 = { id: "skill:8", repositoryId: "Map 1", nestedSkills: [] };
	const skill9 = { id: "skill:9", repositoryId: "Map 1", nestedSkills: ["skill:7", "skill:8"] };
	const skill10 = { id: "skill:10", repositoryId: "Map 1", nestedSkills: 
    ["skill:1", "skill:2", "skill:3", "skill:4", "skill:5", "skill:6"] };

	const skills: Skill[] = [skill1, skill2, skill3, skill4,
		skill5, skill6, skill7, skill8, skill9, skill10];

	const skillsRelations = new SkillsRelations(skills);

	it("skillExpression type", () => {

        const emptySkills = new Empty([]);
        const orSkills = new Or([new Variable(skill1)]);
        const andSkills = new And([new Variable(skill2)]);
		const variable = new Variable(skill3);

        expect(emptySkills.getExpressionType()).toBe("Empty");
        expect(orSkills.getExpressionType()).toBe("Or");
        expect(andSkills.getExpressionType()).toBe("And");
		expect(variable.getExpressionType()).toBe("Variable");

	});

	it("empty expression, no required skill for the expression", () => {

        const emptySkills = new Empty([]);

        expect(emptySkills.evaluate([], skillsRelations)).toBeTruthy();
        expect(emptySkills.extractSkills().length).toBe(0);
		expect(emptySkills.toJson()).toBe("");
	});

	it("skills in precondition formula", () => {

        const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
        const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

        expect(orSkills.evaluate(["skill:1"], skillsRelations)).toBeTruthy();
        expect(andSkills.evaluate(["skill:1"], skillsRelations)).toBeFalsy();
		expect(andSkills.evaluate(["skill:3", "skill:4"], skillsRelations)).toBeTruthy();
	});

	it("nested skill expression in precondition formula", () => {

        const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
        const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

        const orSkillExpression = new Or([orSkills, andSkills]);
        const andSkillExpression = new And([orSkills, andSkills]);

        expect(orSkillExpression.evaluate(["skill:1"], skillsRelations)).toBeTruthy();
        expect(andSkillExpression.evaluate(["skill:1"], skillsRelations)).toBeFalsy();

	});

	it("complex skills expression with nested skills expressions precondition formula", () => {

        const andSkills = new And([new Variable(skill1), new Variable(skill2)]);
        const orSkills = new Or([new Variable(skill3), new Variable(skill4)]);

		const skillExpression3 = new And([new Or([new Variable(skill5), new Variable(skill6)]), 
										  new And([andSkills, orSkills])]);

		expect(skillExpression3.evaluate(["skill:5", "skill:6"], skillsRelations)).toBeFalsy();
		expect(skillExpression3.evaluate(["skill:1", "skill:2", "skill:3", "skill:5"], skillsRelations)).toBeTruthy();
	});

	it("extract all skills from skill expression", () => {

        const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
        const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

        const orSkillExpression = new Or([orSkills, andSkills]);
        const andSkillExpression = new And([orSkills, andSkills]);

		expect(orSkillExpression.extractSkills()).toEqual([skill1, skill2, skill3, skill4]);
		expect(andSkillExpression.extractSkills()).toEqual([skill1, skill2, skill3, skill4]);

	});

	it("convert skill expression to Json format string", () => {

        const orSkills = new Or([new Variable(skill1)]);
        const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

		const orSkillsJson = orSkills.toJson();
		const andSkillsJson = andSkills.toJson();

        expect(orSkillsJson).toBe('{"operator":"Or","skills":["skill:1"]}')
        expect(andSkillsJson).toBe('{"operator":"And","skills":["skill:3","skill:4"]}')

	});

	it("convert 'and Json' format string to skill expression", () => {

        const jsonSkillExpression = '{"operator":"And","skills":["skill:3","skill:4"]}'

		const skillExpression = parseJsonExpression(jsonSkillExpression, skillsRelations);

		expect(skillExpression.extractSkills().length).toBe(2);
		expect(skillExpression.evaluate(["skill:3"], skillsRelations)).toBeFalsy();
		expect(skillExpression.evaluate(["skill:3", "skill:4"], skillsRelations)).toBeTruthy();

	});

	it("convert 'or Json' format string to skill expression", () => {

        const jsonSkillExpression = '{"operator":"Or","skills":["skill:1"]}';

		const skillExpression = parseJsonExpression(jsonSkillExpression, skillsRelations);

		expect(skillExpression.extractSkills().length).toBe(1);
		expect(skillExpression.evaluate(["skill:1"], skillsRelations)).toBeTruthy();

	});

	it("convert nested skill expression to Json format string", () => {

        const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
        const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

        const orSkillExpression = new Or([orSkills, andSkills]);

		const orSkillExpressionJson = orSkillExpression.toJson()

		expect(orSkillExpressionJson).toBe("{\"operator\":\"Or\",\"skills\":[\"{\\\"operator\\\":\\\"Or\\\",\\\"skills\\\":[\\\"skill:1\\\",\\\"skill:2\\\"]}\",\"{\\\"operator\\\":\\\"And\\\",\\\"skills\\\":[\\\"skill:3\\\",\\\"skill:4\\\"]}\"]}")

	});

	it("convert nested Json format string to skill expression", () => {

		const jsonSkillExpression = "{\"operator\":\"Or\",\"skills\":[\"{\\\"operator\\\":\\\"Or\\\",\\\"skills\\\":[\\\"skill:1\\\",\\\"skill:2\\\"]}\",\"{\\\"operator\\\":\\\"And\\\",\\\"skills\\\":[\\\"skill:3\\\",\\\"skill:4\\\"]}\"]}";
		
		const skillExpression = parseJsonExpression(jsonSkillExpression, skillsRelations);

		expect(skillExpression.extractSkills().length).toBe(4);
		expect(skillExpression.evaluate(["skill:3"], skillsRelations)).toBeFalsy();
		expect(skillExpression.evaluate(["skill:1"], skillsRelations)).toBeTruthy();
	});

	it("skills check without", () => {

        const without = [new Variable(skill1)];
		const andSkillsWithSkill1 = new And([new Variable(skill1), new Variable(skill2), new Variable(skill3)]);
		const andSkillsWithoutSkill1 = new And([new Variable(skill2), new Variable(skill3)]);

		expect(andSkillsWithSkill1.evaluate(["skill:1", "skill:2", "skill:3"], skillsRelations, without)).toBeTruthy();
		expect(andSkillsWithoutSkill1.evaluate(["skill:2", "skill:3"], skillsRelations, without)).toBeTruthy();

	});

	it("parent skills check without", () => {

        const without = [new Variable(skill1), new Variable(skill2), new Variable(skill3)];
		const orSkills = new Or([new Variable(skill10)]);
		const andSkills = new And([new Variable(skill10), new Variable(skill1)]);

		expect(orSkills.evaluate(["skill:4"], skillsRelations, without)).toBeTruthy();
		expect(andSkills.evaluate(["skill:4"], skillsRelations, without)).toBeFalsy();
		expect(andSkills.evaluate(["skill:4", "skill:5", "skill:6"], skillsRelations, without)).toBeFalsy();
        expect(andSkills.evaluate(["skill:1", "skill:4", "skill:5", "skill:6"], skillsRelations, without)).toBeTruthy();

	});
	
	it("parent skill check without parent skill", () => {

        const without = [new Variable(skill10)];
		const andSkills = new And([new Variable(skill10)]);

		expect(andSkills.evaluate(["skill:4"], skillsRelations, without)).toBeFalsy();
		expect(andSkills.evaluate(["skill:4", "skill:5", "skill:6"], skillsRelations, without)).toBeFalsy();
        expect(andSkills.evaluate(["skill:1", "skill:2", "skill:3", "skill:4", "skill:5", "skill:6"], skillsRelations, without)).toBeTruthy();

	});

	it("learning units filtering by precondition formula", () => {

		const skillExpression1 = new And([new Variable(skill1), new Variable(skill2), new Variable(skill3)]);
		const skillExpression2 = new Or([new Variable(skill4), new Variable(skill5)]);
		const skillExpression3 = new Or([new Variable(skill5), new Variable(skill6), 
										new And([new Variable(skill7), new Variable(skill8)])]);

		const unit1 = newLearningUnit(skillsRelations,
			"unit1",
			skillExpression1,
			[],
			[]);
	
		const unit2 = newLearningUnit(skillsRelations,
			"unit2",
			skillExpression2,
			[],
			[]);
	
		const unit3 = newLearningUnit(skillsRelations,
			"unit3",
			skillExpression3,
			[],
			[]);	
	
		const learningUnits = [unit1, unit2, unit3];

		const evaluateString1 = [skill1.id, skill2.id, skill3.id];
		const evaluateString2 = [skill4.id];
		const evaluateString3 = [skill5.id];
		const evaluateString4 = [skill7.id, skill8.id];

		const firstCheck = learningUnits.filter(unit => unit.requiredSkills.evaluate(evaluateString1, skillsRelations));
		const secondCheck = learningUnits.filter(unit => unit.requiredSkills.evaluate(evaluateString2, skillsRelations));
		const thirdCheck = learningUnits.filter(unit => unit.requiredSkills.evaluate(evaluateString3, skillsRelations));
		const fourCheck = learningUnits.filter(unit => unit.requiredSkills.evaluate(evaluateString4, skillsRelations));
		
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
	skillsRelations: SkillsRelations,
	id: string,
	requiredSkills: SkillExpression,
	teachingGoals: string[],
	suggestedSkills: { weight: number; skill: string }[] = []
): preCondLearningUnit {
	const suggestions: { weight: number; skill: Skill }[] = [];
	if (suggestedSkills.length > 0) {
		for (const suggestion of suggestedSkills) {
			const skill = skillsRelations.skills.find(skill => suggestion.skill.includes(skill.id));
			if (skill) {
				suggestions.push({ weight: suggestion.weight, skill: skill });
			}
		}
	}

	return {
		id: id,
		requiredSkills: requiredSkills,
		teachingGoals: skillsRelations.skills.filter(skill => teachingGoals.includes(skill.id)),
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