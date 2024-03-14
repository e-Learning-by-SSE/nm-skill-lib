import { CompositeDefinition, LearningUnit, Skill } from "../types";
import { getPath, getSkillAnalysis } from "../pathPlanner";
import { toUnifiedLearningUnit } from "./compositeLearningUnit";

describe("Composite Unit", () => {
	describe("testing composite unit", () => {
		const skillsMap: Skill[] = [
			{ id: "sk:1", repositoryId: "3", nestedSkills: [] },
			{ id: "sk:2", repositoryId: "3", nestedSkills: [] },
			{ id: "sk:3", repositoryId: "3", nestedSkills: [] },
			{ id: "sk:4", repositoryId: "3", nestedSkills: [] },
			{ id: "sk:5", repositoryId: "3", nestedSkills: [] },
			{ id: "sk:6", repositoryId: "3", nestedSkills: [] },
			{ id: "sk:A", repositoryId: "3", nestedSkills: [] },
			{ id: "sk:B", repositoryId: "3", nestedSkills: [] }
		].sort((a, b) => a.id.localeCompare(b.id));

		const learningUnits: (LearningUnit)[] = [
			newLearningUnit(skillsMap, "lu:10", [], ["sk:1"]),
			newLearningUnit(skillsMap, "lu:20", [], ["sk:2"]),
			newLearningUnit(skillsMap, "lu:50", [], ["sk:5"]),
			newLearningUnit(skillsMap, "lu:A10", [], ["sk:A"]),
			newLearningUnit(skillsMap, "lu:1", ["sk:1", "sk:2"], ["sk:3"]),
			newLearningUnit(skillsMap, "lu:2", ["sk:3", "sk:4"], ["sk:6"]),
			newLearningUnit(skillsMap, "lu:3", ["sk:5"], ["sk:4"]),
		];

		const children = learningUnits.filter(lu => ["lu:1","lu:2","lu:3"].includes(lu.id));
		const compositeLus: (CompositeDefinition)[] = [
			newCompositeLearningUnit(skillsMap, 
									 "cu:A", 
									 children, 
									 ["sk:A"], 
									 ["sk:B"], 
									 [], 
									 ["sk:5"], 
									 [])
		];
		
		const lus = learningUnits.concat(compositeLus.map(lu => toUnifiedLearningUnit({ unit: lu })));

		it("check composite unit", () => {
			
			const learningUnits: LearningUnit[] = [
				newLearningUnit(skillsMap, "lu:10", [], ["sk:1"]),
				newLearningUnit(skillsMap, "lu:20", [], ["sk:2"]),
				newLearningUnit(skillsMap, "lu:50", [], ["sk:5"]),
				newLearningUnit(skillsMap, "lu:A10", [], ["sk:A"]),
				newLearningUnit(
					skillsMap,
					"lu:1",
					["sk:1", "sk:2"],
					["sk:3"],
					[{ weight: 0.4, skill: "sk:4" }]
				),
				newLearningUnit(
					skillsMap,
					"lu:2",
					["sk:3", "sk:4"],
					["sk:6"],
					[{ weight: 0.3, skill: "sk:3" }]
				),
				newLearningUnit(skillsMap, "lu:3", ["sk:5"], ["sk:4"]),
			];

			const children = learningUnits.filter(lu => ["lu:1","lu:2","lu:3"].includes(lu.id));
			const compositeLus: (CompositeDefinition)[] = [
				newCompositeLearningUnit(
					skillsMap,
					"cu:A",
					children,
					["sk:A"],
					["sk:B"],
					[{ weight: 0.1, skill: "sk:1" }],
					["sk:5"],
					[{ weight: 0.4, skill: "sk:4" }]
				)
			];
			
			const lus = learningUnits.concat(compositeLus.map(lu => toUnifiedLearningUnit({ unit: lu })));

			const expectedRequiredSkills: Skill[] = [
				{ id: "sk:A", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:5", repositoryId: "3", nestedSkills: [] }
			];

			const expectedTeachingGoals: Skill[] = [
				{ id: "sk:B", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:3", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:6", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:4", repositoryId: "3", nestedSkills: [] }
			];

			const expectedSuggested = [
				{ weight: 0.1, skill: skillsMap.find(skill => skill.id == "sk:1") },
				{ weight: 0.4, skill: skillsMap.find(skill => skill.id == "sk:4") }
			];

			const cuA = lus.find(lu => lu.id == "cu:A")!;
			expect(cuA.requiredSkills).toEqual(expectedRequiredSkills);
			expect(cuA.teachingGoals).toEqual(expectedTeachingGoals);
			expect(cuA.suggestedSkills).toEqual(expectedSuggested);
		});

		it("check path for skill 3", () => {
			const goals = [...skillsMap.filter(skill => skill.id === "sk:3")];

			const path = getPath({
				skills: skillsMap,
				learningUnits: lus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...lus.filter(lu => lu.id === "lu:10"),
				...lus.filter(lu => lu.id === "lu:20"),
				...lus.filter(lu => lu.id === "lu:1")
			];

			expect(path.cost).toBe(3.4);
			expect(path.path.length).toBe(3);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for skill 4", () => {
			const goals = [...skillsMap.filter(skill => skill.id === "sk:4")];

			const path = getPath({
				skills: skillsMap,
				learningUnits: lus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...lus.filter(lu => lu.id === "lu:50"),
				...lus.filter(lu => lu.id === "lu:3")
			];

			expect(path.cost).toBe(2.2);
			expect(path.path.length).toBe(2);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for skill 6", () => {
			const goals = [...skillsMap.filter(skill => skill.id === "sk:6")];

			const path = getPath({
				skills: skillsMap,
				learningUnits: lus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...lus.filter(lu => lu.id === "lu:A10"),
				...lus.filter(lu => lu.id === "lu:50"),
				...lus.filter(lu => lu.id === "cu:A")
			];

			expect(path.cost).toBe(5.62);
			expect(path.path.length).toBe(3);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for skill B", () => {
			const goals = [...skillsMap.filter(skill => skill.id === "sk:B")];

			const path = getPath({
				skills: skillsMap,
				learningUnits: lus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...lus.filter(lu => lu.id === "lu:50"),
				...lus.filter(lu => lu.id === "lu:A10"),
				...lus.filter(lu => lu.id === "cu:A")
			];

			expect(path.cost).toBe(5.62);
			expect(path.path.length).toBe(3);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for Composite unit against multi Learning units", () => {
			const learningUnits: LearningUnit[] = [
				newLearningUnit(skillsMap, "lu:A", [], ["sk:1", "sk:2"]),
				newLearningUnit(skillsMap, "lu:1", ["sk:1", "sk:2"], ["sk:3"]),
				newLearningUnit(skillsMap, "lu:2", ["sk:3", "sk:4"], ["sk:6"]),
				newLearningUnit(skillsMap, "lu:3", [], ["sk:4"])
			];

			const children = learningUnits.filter(lu => ["lu:A", "lu:1","lu:2","lu:3"].includes(lu.id));
			const compositeLus: (CompositeDefinition)[] = [
				newCompositeLearningUnit(
					skillsMap,
					"cu:A",
					children,
					[],
					[],
					[],
					[],
					[]
				)
			];
			
			const lus = learningUnits.concat(compositeLus.map(lu => toUnifiedLearningUnit({ unit: lu })));

			const goals = [
				...skillsMap.filter(skill => skill.id === "sk:1"),
				...skillsMap.filter(skill => skill.id === "sk:2"),
				...skillsMap.filter(skill => skill.id === "sk:3"),
				...skillsMap.filter(skill => skill.id === "sk:4"),
				...skillsMap.filter(skill => skill.id === "sk:6")
			];

			const path = getPath({
				skills: skillsMap,
				learningUnits: lus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [...lus.filter(lu => lu.id === "cu:A")];

			expect(path.cost).toBe(3.8);
			expect(path.path.length).toBe(1);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for two Composite units", () => {
			const learningUnits: LearningUnit[] = [
				newLearningUnit(skillsMap, "lu:A", [], ["sk:1", "sk:2"]),
				newLearningUnit(skillsMap, "lu:1", ["sk:1", "sk:2"], ["sk:3"]),
				newLearningUnit(skillsMap, "lu:2", ["sk:4"], ["sk:6"]),
				newLearningUnit(skillsMap, "lu:3", [], ["sk:4"])
			];

			const childrenForA = learningUnits.filter(lu => ["lu:A", "lu:1"].includes(lu.id));
			const childrenForB = learningUnits.filter(lu => ["lu:2","lu:3"].includes(lu.id));
			const compositeLus: (CompositeDefinition)[] = [
				newCompositeLearningUnit(
					skillsMap,
					"cu:A",
					childrenForA,
					[],
					[],
					[],
					[],
					[]
				),
				newCompositeLearningUnit(
					skillsMap,
					"cu:B",
					childrenForB,
					[],
					[],
					[],
					[],
					[]
				),
			];

			const lus = learningUnits.concat(compositeLus.map(lu => toUnifiedLearningUnit({ unit: lu })));

			const goals = [
				...skillsMap.filter(skill => skill.id === "sk:3"),
				...skillsMap.filter(skill => skill.id === "sk:6")
			];

			const path = getPath({
				skills: skillsMap,
				learningUnits: lus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...lus.filter(lu => lu.id === "cu:B"),
				...lus.filter(lu => lu.id === "cu:A")
			];

			expect(path.cost).toBe(4.18);
			expect(path.path.length).toBe(2);
			expect(path.path).toEqual(expectedPath);
		});
	});
});

function newLearningUnit(
	map: Skill[],
	id: string,
	requiredSkills: string[],
	teachingGoals: string[],
	suggestedSkills: { weight: number; skill: string }[] = []
): LearningUnit {
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
		requiredSkills: map.filter(skill => requiredSkills.includes(skill.id)),
		teachingGoals: map.filter(skill => teachingGoals.includes(skill.id)),
		suggestedSkills: suggestions
	};
}

function newCompositeLearningUnit(
	map: Skill[],
	id: string,
	children: (LearningUnit | CompositeDefinition)[],
	requiredSkills: string[],
	teachingGoals: string[],
	suggestedSkills: { weight: number; skill: string }[] = [],
	requiredExposedSkills: string[],
	suggestedExposedSkills: { weight: number; skill: string }[] = []
): CompositeDefinition {
	const suggestions: { weight: number; skill: Skill }[] = [];
	if (suggestedSkills.length > 0) {
		for (const suggestion of suggestedSkills) {
			const skill = map.find(skill => suggestion.skill.includes(skill.id));
			if (skill) {
				suggestions.push({ weight: suggestion.weight, skill: skill });
			}
		}
	}

	const exportedSuggestions: { weight: number; skill: Skill }[] = [];
	if (suggestedExposedSkills.length > 0) {
		for (const suggestion of suggestedExposedSkills) {
			const skill = map.find(skill => suggestion.skill.includes(skill.id));
			if (skill) {
				exportedSuggestions.push({ weight: suggestion.weight, skill: skill });
			}
		}
	}

	return {
		id: id,
		children: children,
		requiredSkills: map.filter(skill => requiredSkills.includes(skill.id)),
		teachingGoals: map.filter(skill => teachingGoals.includes(skill.id)),
		suggestedSkills: suggestions,
		requiredExposedSkills: map.filter(skill => requiredExposedSkills.includes(skill.id)),
		suggestedExposedSkills: exportedSuggestions
	};
}
