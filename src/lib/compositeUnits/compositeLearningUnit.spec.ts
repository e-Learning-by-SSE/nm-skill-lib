import { CompositeDefinition, LearningUnit, Skill, WeightedSkill } from "../types";
import { sortById } from "../util/duplicate-remover/duplicate-remover";
import { toUnifiedLearningUnit } from "./compositeLearningUnit";

const clone = org => JSON.parse(JSON.stringify(org));
const sortWeighted = (a: WeightedSkill, b: WeightedSkill) =>
	a.skill.id.localeCompare(b.skill.id) + a.weight - b.weight;

describe("deepCloneTest", () => {
	it("Test if different memory reference but it should contain same content", () => {
		const orgObj = { id: "1" };
		const result = clone(orgObj);

		if (result !== orgObj) {
			console.log("hallo");
		}

		expect(result).not.toBe(orgObj);
		expect(result).toEqual(orgObj);
	});
});

describe("toUnifiedLearningUnit", () => {
	let skill1: Skill, skill2: Skill, skill3: Skill, skill4: Skill;
	let weightedSkill1: WeightedSkill, weightedSkill2: WeightedSkill;
	let luLevel1Child2: LearningUnit, luLevel3Child: LearningUnit;
	let compLevel2Child: CompositeDefinition, compLevel1Child: CompositeDefinition;
	let baseUnit: CompositeDefinition;

	const emptyUnitData = {
		teachingGoals: [],
		suggestedSkills: [],
		requiredSkills: []
	};

	const emptyCompositeData = {
		teachingGoals: [],
		suggestedSkills: [],
		requiredSkills: [],
		requiredExposedSkills: [],
		suggestedExposedSkills: []
	};
	/*General structure before each test-case:
		baseUnit (CompositeDefinition)
		└── compLevel1Child (CompositeLearningUnit)
			├── compLevel2Child (CompositeLearningUnit)
			│   └── luLevel3Child (LearningUnit)
			└── luLevel1Child2 (LearningUnit)
	*/
	beforeEach(() => {
		skill1 = { id: "skill1", repositoryId: "skill1", nestedSkills: [] };
		skill2 = { id: "skill2", repositoryId: "skill1", nestedSkills: [] };
		skill3 = { id: "skill3", repositoryId: "skill1", nestedSkills: [] };
		skill4 = { id: "skill4", repositoryId: "skill1", nestedSkills: [] };
		weightedSkill1 = { skill: skill1, weight: 1 };
		weightedSkill2 = { skill: skill2, weight: 2 };

		luLevel3Child = {
			id: "luLevel3Child",
			...emptyUnitData
		};

		luLevel1Child2 = {
			id: "luLevel1Child2",
			...emptyUnitData
		};

		compLevel2Child = {
			id: "compLevel2Child",
			children: [luLevel3Child],
			...emptyCompositeData
		};

		compLevel1Child = {
			id: "compLevel1Child",
			children: [compLevel2Child, luLevel1Child2],
			...emptyCompositeData
		};

		baseUnit = {
			id: "root",
			children: [compLevel1Child],
			teachingGoals: [],
			suggestedSkills: [],
			requiredSkills: [],
			requiredExposedSkills: [],
			suggestedExposedSkills: []
		};
	});
	it("should correctly reduce taughtSkills", () => {
		compLevel1Child.teachingGoals = [skill1];
		compLevel2Child.teachingGoals = [skill2, skill3];
		baseUnit.teachingGoals = [skill4];

		const expectedSkills = [skill1, skill2, skill3, skill4];
		const result = toUnifiedLearningUnit({ unit: baseUnit });

		expect(result.teachingGoals).toEqual(expect.arrayContaining(expectedSkills));
	});
	it("should correctly reduce exposed requiredSkills by combining all non duplicates", () => {
		compLevel1Child.requiredSkills = [skill1];
		compLevel2Child.requiredExposedSkills = [skill2];
		baseUnit.requiredSkills = [skill4, clone(skill2)];

		const expectedSkills = [skill1, skill2, skill4].sort(sortById);
		const result = toUnifiedLearningUnit({ unit: baseUnit });

		expect(result.requiredSkills.sort(sortById)).toEqual(expectedSkills);
	});

	it("should correctly reduce exposed suggestedSkills by combining all non duplicates", () => {
		compLevel1Child.suggestedSkills = [clone(weightedSkill1)];
		compLevel2Child.suggestedExposedSkills = [weightedSkill2];
		baseUnit.suggestedExposedSkills = [clone(weightedSkill1)];

		const expectedSkills = [weightedSkill1, weightedSkill2]; // union of exposed and normal but  no duplicate
		const result = toUnifiedLearningUnit({ unit: baseUnit }).suggestedSkills;

		expect(result.sort(sortWeighted)).toEqual(expectedSkills.sort(sortWeighted));
	});
	it("reduce exposed suggestedSkills but don't remove duplicates on different weights", () => {
		// same but different weights
		const weightedSkill1 = { skill: skill1, weight: 1 };
		const weightedSkill2 = { skill: skill1, weight: 2 };

		compLevel2Child.suggestedExposedSkills = [weightedSkill1];
		baseUnit.suggestedExposedSkills = [weightedSkill2];

		const expectedSkills = [weightedSkill1, weightedSkill2];
		const result = toUnifiedLearningUnit({ unit: baseUnit }).suggestedSkills;

		expect(result.sort(sortWeighted)).toEqual(expectedSkills.sort(sortWeighted));
	});
	it("should correctly reduce suggestedSkills", () => {
		const sort = (a: WeightedSkill, b: WeightedSkill) => a.skill.id.localeCompare(b.skill.id);

		compLevel1Child.suggestedSkills = [weightedSkill1];
		baseUnit.suggestedSkills = [weightedSkill2];

		const expectedSkills = [weightedSkill1, weightedSkill2];
		const result = toUnifiedLearningUnit({ unit: baseUnit });

		expect(result.suggestedSkills.sort(sort)).toEqual(expectedSkills.sort(sort));
	});
	it("should correctly reduce requiredSkills", () => {
		compLevel1Child.requiredSkills = [skill1];
		compLevel2Child.requiredSkills = [skill2, skill3];
		baseUnit.requiredSkills = [skill4];

		const expectedSkills = [skill1, skill2, skill3, skill4];
		const result = toUnifiedLearningUnit({ unit: baseUnit });
		expect(result.requiredSkills).toEqual(expect.arrayContaining(expectedSkills));
	});
	it("should correctly reduce mediaTime", () => {
		luLevel3Child.mediaTime = 10;
		luLevel1Child2.mediaTime = 20;
		const result = toUnifiedLearningUnit({ unit: baseUnit });
		expect(result.mediaTime).toBe(30);
	});
	it("should correctly reduce words", () => {
		luLevel3Child.words = 10;
		luLevel1Child2.words = 20;
		const result = toUnifiedLearningUnit({ unit: baseUnit });
		expect(result.words).toBe(30);
	});
	it("should correctly calculate the cost of the learning units", () => {

		const baseUnitResult = toUnifiedLearningUnit({ unit: baseUnit });
		expect(baseUnitResult.cost).toEqual(2);

		const compLevel1ChildResult = toUnifiedLearningUnit({ unit: compLevel1Child });
		expect(compLevel1ChildResult.cost).toEqual(2);

		const compLevel2ChildResult = toUnifiedLearningUnit({ unit: compLevel2Child });
		expect(compLevel2ChildResult.cost).toEqual(1);

	});
});
