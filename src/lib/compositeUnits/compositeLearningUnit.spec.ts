import { CompositeDefinition, CompositeLearningUnit, Skill, WeightedSkill } from "../types";
import { toUnifiedLearningUnit } from "./compositeLearningUnit";

describe("computeTaughtSkills", () => {
	let skill1: Skill, skill2: Skill, skill3: Skill, skill4: Skill;
	let weightedSkill1: WeightedSkill;
	let level3Child: CompositeLearningUnit,
		level2Child: CompositeLearningUnit,
		level1Child: CompositeLearningUnit,
		level1Child2: CompositeLearningUnit;
	let unit: CompositeDefinition;

	const emptyUnitData = {
		teachingGoals: [],
		suggestedSkills: [],
		requiredSkills: []
	};

	beforeEach(() => {
		skill1 = { id: "skill1", repositoryId: "skill1", nestedSkills: [] };
		skill2 = { id: "skill2", repositoryId: "skill1", nestedSkills: [] };
		skill3 = { id: "skill3", repositoryId: "skill1", nestedSkills: [] };
		skill4 = { id: "skill4", repositoryId: "skill1", nestedSkills: [] };
		weightedSkill1 = { skill: skill1, weight: 1 };

		level3Child = {
			id: "level3Child1",
			...emptyUnitData
		};

		level2Child = {
			id: "level2Child1",
			children: [level3Child],
			...emptyUnitData
		};

		level1Child = {
			id: "level1Child1",
			children: [level2Child],
			...emptyUnitData
		};

		level1Child2 = {
			id: "level1Child2",
			children: [],
			...emptyUnitData
		};

		unit = {
			id: "root",
			children: [level1Child],
			teachingGoals: [],
			suggestedSkills: [],
			requiredSkills: [],
			requiredExposedSkills: [],
			suggestedExposedSkills: []
		};
	});
	it("should correctly reduce taughtSkills", () => {
		level1Child.teachingGoals = [skill1];
		level2Child.teachingGoals = [skill2, skill3];
		unit.teachingGoals = [skill4];

		const expectedSkills = [skill1, skill2, skill3, skill4];
		const result = toUnifiedLearningUnit({ unit });
		expect(result.teachingGoals).toEqual(expectedSkills);
	});
	it("should correctly reduce requiredSkills", () => {
		level1Child.requiredSkills = [skill1];
		level2Child.requiredSkills = [skill2, skill3];
		unit.requiredSkills = [skill4];

		const expectedSkills = [skill1, skill2, skill3, skill4];
		const result = toUnifiedLearningUnit({ unit });
		expect(result.requiredSkills).toEqual(expectedSkills);
	});
	it("should correctly reduce suggestedSkills", () => {
		level1Child.suggestedSkills = [weightedSkill1];
		level2Child.suggestedSkills = [weightedSkill1];
		unit.suggestedSkills = [weightedSkill1];

		const expectedSkills = [weightedSkill1, weightedSkill1, weightedSkill1];
		const result = toUnifiedLearningUnit({ unit });
		expect(result.suggestedSkills).toEqual(expectedSkills);
	});
	it("should correctly reduce mediaTime", () => {
		level3Child.mediaTime = 10;
		level1Child.mediaTime = 20;
		level2Child.mediaTime = 30;
		const result = toUnifiedLearningUnit({ unit });
		expect(result.mediaTime).toBe(60);
	});
	it("should correctly reduce words", () => {
		level3Child.words = 10;
		level1Child.words = 20;
		level2Child.words = 30;
		const result = toUnifiedLearningUnit({ unit });
		expect(result.words).toBe(60);
	});
});
