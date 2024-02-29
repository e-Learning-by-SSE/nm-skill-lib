import { CompositeDefinition, LearningUnit, Skill, WeightedSkill } from "../types";
import {
	computeHiddenRequiredSkills,
	computeHiddenSuggestionsSkills,
	computeTaughtSkills
} from "./computation-helpers";

describe("computeHiddenSuggestionsSkills", () => {
	it("should correctly compute hidden suggested skills", () => {
		const unit = {
			children: [
				{
					suggestedSkills: [
						{ skill: { id: "1" }, weight: 1 },
						{ skill: { id: "2" }, weight: 2 }
					]
				},
				{
					suggestedSkills: [
						{ skill: { id: "2" }, weight: 2 },
						{ skill: { id: "3" }, weight: 3 }
					]
				}
			],
			suggestedExposedSkills: [{ skill: { id: "1" }, weight: 1 }]
		} as CompositeDefinition;
		const expectedSuggestions = [
			{ skill: { id: "2" }, weight: 2 },
			{ skill: { id: "3" }, weight: 3 }
			// removed the exposed one and the duplicate
		];

		const result = computeHiddenSuggestionsSkills(unit);

		expect(result).toEqual(expectedSuggestions);
	});
});

describe("computeHiddenRequiredSkills", () => {
	it("should correctly compute hidden required skills", () => {
		const unit = {
			id: "composite1",
			children: [
				{
					id: "unit1",
					requiredSkills: [{ id: "skill1" }, { id: "skill2" }]
				},
				{
					id: "unit2",
					requiredSkills: [{ id: "skill2" }, { id: "skill3" }]
				}
			],
			requiredExposedSkills: [{ id: "skill1" } as Skill]
		} as CompositeDefinition;

		const expectedSkills = [{ id: "skill2" }, { id: "skill3" }]; // no duplicate an no exposed

		const result = computeHiddenRequiredSkills(unit);

		expect(result).toEqual(expectedSkills);
	});
});

describe("computeTaughtSkills", () => {
	it("should compute taught skills correctly - 1 nesting level ", () => {
		const skill1 = { id: "1", name: "Skill 1", repositoryId: "repo1", nestedSkills: [] };
		const skill2 = { id: "2", name: "Skill 2", repositoryId: "repo2", nestedSkills: [] };
		const skill3 = { id: "3", name: "Skill 3", repositoryId: "repo3", nestedSkills: [] };
		const skill4 = { id: "4", name: "Skill 4", repositoryId: "repo4", nestedSkills: [] };

		const childLu1 = {
			id: "child1",
			teachingGoals: [skill2, skill3],
			requiredSkills: [],
			suggestedSkills: []
		};

		const childLu2 = {
			id: "child2",
			teachingGoals: [skill1],
			requiredSkills: [],
			suggestedSkills: []
		};

		const compositeUnit: CompositeDefinition = {
			id: "unit",
			children: [childLu1, childLu2],
			teachingGoals: [skill4],
			suggestedSkills: [],
			requiredSkills: [],
			requiredExposedSkills: [],
			suggestedExposedSkills: []
		};

		const expectedSkills: Skill[] = [skill1, skill2, skill3, skill4];

		const result = computeTaughtSkills(compositeUnit).sort((a, b) => a.id.localeCompare(b.id));
		expect(result).toEqual(expectedSkills);
	});
});
