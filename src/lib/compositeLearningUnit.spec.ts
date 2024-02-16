import { LearningUnit, Skill } from "./types";
import { computeSkills, getTeachingGoals, getRequiredSkills, getSuggestedSkills} from "./compositeLearningUnit"
import { getPath, getSkillAnalysis } from "./pathPlanner";

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

		const compositeLus: LearningUnit[] = [
			newLearningUnit(skillsMap, "lu:10", [], ["sk:1"]),
			newLearningUnit(skillsMap, "lu:20", [], ["sk:2"]),
			newLearningUnit(skillsMap, "lu:50", [], ["sk:5"]),
			newLearningUnit(skillsMap, "lu:A10", [], ["sk:A"]),
			newLearningUnit(skillsMap, "lu:1", ["sk:1", "sk:2"], ["sk:3"]),
			newLearningUnit(skillsMap, "lu:2", ["sk:3", "sk:4"], ["sk:6"]),
			newLearningUnit(skillsMap, "lu:3", ["sk:5"], ["sk:4"]),
			newCompositeLearningUnit(skillsMap, "cu:A", ["sk:A"], ["sk:B"], []
			, ["sk:5"]
			, []),
		];

		compositeLus.find(lu => lu.id == "cu:A").children!.push(
			compositeLus.find(lu => lu.id == "lu:1")!,
			compositeLus.find(lu => lu.id == "lu:2")!,
			compositeLus.find(lu => lu.id == "lu:3")!
		)

		computeSkills(compositeLus.filter(lu => lu.children.length > 0));
		
		it("check composite unit", () => {

			const compositeLus: LearningUnit[] = [
				newLearningUnit(skillsMap, "lu:10", [], ["sk:1"]),
				newLearningUnit(skillsMap, "lu:20", [], ["sk:2"]),
				newLearningUnit(skillsMap, "lu:50", [], ["sk:5"]),
				newLearningUnit(skillsMap, "lu:A10", [], ["sk:A"]),
				newLearningUnit(skillsMap, "lu:1", ["sk:1", "sk:2"], ["sk:3"],
				[{ weight: 0.4, skill: "sk:4" }]),
				newLearningUnit(skillsMap, "lu:2", ["sk:3", "sk:4"], ["sk:6"],
				[{ weight: 0.3, skill: "sk:3" }]),
				newLearningUnit(skillsMap, "lu:3", ["sk:5"], ["sk:4"]),
				newCompositeLearningUnit(skillsMap, "cu:A", ["sk:A"], ["sk:B"], [{ weight: 0.1, skill: "sk:1" }]
				, ["sk:5"]
				, [{ weight: 0.4, skill: "sk:4" }]),
			];
	
			compositeLus.find(lu => lu.id == "cu:A").children!.push(
				compositeLus.find(lu => lu.id == "lu:1")!,
				compositeLus.find(lu => lu.id == "lu:2")!,
				compositeLus.find(lu => lu.id == "lu:3")!
			)
	
			computeSkills(compositeLus.filter(lu => lu.children.length > 0));

			const externalRequiredSkills: Skill[] = [
				{ id: "sk:A", repositoryId: "3", nestedSkills: [] }
			];

			const exportedRequiredSkills: Skill[] = [
				{ id: "sk:5", repositoryId: "3", nestedSkills: [] }
			];

			const unusedRequiredSkills: Skill[] = [
				{ id: "sk:1", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:2", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:3", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:4", repositoryId: "3", nestedSkills: [] }
			];

			const taughtSkills: Skill[] = [
				{ id: "sk:B", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:3", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:6", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:4", repositoryId: "3", nestedSkills: [] },
			];

			const externalRecommendedSkills = [{ weight: 0.1, skill: skillsMap.find(skill => skill.id == "sk:1") }];

			const exportedRecommendedSkills = [{ weight: 0.4, skill: skillsMap.find(skill => skill.id == "sk:4") }];

			const unusedRecommendedSkills = [{ weight: 0.3, skill: skillsMap.find(skill => skill.id == "sk:3") }];

			const cuA = compositeLus.find(lu => lu.id == "cu:A")!;
			expect(cuA.externalRequiredSkills).toEqual(externalRequiredSkills);
			expect(cuA.exportedRequiredSkills).toEqual(exportedRequiredSkills);
			expect(cuA.unusedRequiredSkills).toEqual(unusedRequiredSkills);

			expect(cuA.taughtSkills).toEqual(taughtSkills);

			expect(cuA.externalRecommendedSkills).toEqual(externalRecommendedSkills);
			expect(cuA.exportedRecommendedSkills).toEqual(exportedRecommendedSkills);
			expect(cuA.unusedRecommendedSkills).toEqual(unusedRecommendedSkills);

		});

		/*it("check validity of composite unit", () => {

			const skillMap: Skill[] = [
				{ id: "sk:1", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:2", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:3", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:4", repositoryId: "3", nestedSkills: [] }
			].sort((a, b) => a.id.localeCompare(b.id));

			const compositeLus: LearningUnit[] = [
				newLearningUnit(skillMap, "lu:1", [], ["sk:1"]),
				newLearningUnit(skillMap, "lu:2", [], ["sk:2"]),
				newLearningUnit(skillMap, "lu:3", [], ["sk:3"])
			];

			compositeLus.find(lu => lu.id == "lu:1").children!.push(
				compositeLus.find(lu => lu.id == "lu:2")!,
				compositeLus.find(lu => lu.id == "lu:3")!
			)

			const lu1 = compositeLus.find(lu => lu.id == "lu:1")!;
			const lu1Validity = checkCompositeUnitValidity(lu1);

			expect(lu1Validity).toBeFalsy();
		});*/

		it("check path for skill 3", () => {

			const goals = [
				...skillsMap.filter(skill => skill.id === "sk:3")
			];

			const path = getPath({
				skills: skillsMap,
				learningUnits: compositeLus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...compositeLus.filter(skill => skill.id === "lu:10"),
				...compositeLus.filter(skill => skill.id === "lu:20"),
				...compositeLus.filter(skill => skill.id === "lu:1"),
				];

			expect(path.cost).toBe(3.4);
			expect(path.path.length).toBe(3);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for skill 4", () => {

			const goals = [
				...skillsMap.filter(skill => skill.id === "sk:4")
			];

			const path = getPath({
				skills: skillsMap,
				learningUnits: compositeLus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...compositeLus.filter(skill => skill.id === "lu:50"),
				...compositeLus.filter(skill => skill.id === "lu:3"),
				];

			expect(path.cost).toBe(2.2);
			expect(path.path.length).toBe(2);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for skill 6", () => {

			const goals = [
				...skillsMap.filter(skill => skill.id === "sk:6")
			];

			const path = getPath({
				skills: skillsMap,
				learningUnits: compositeLus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...compositeLus.filter(skill => skill.id === "lu:A10"),
				...compositeLus.filter(skill => skill.id === "lu:50"),
				...compositeLus.filter(skill => skill.id === "cu:A"),
				];

			expect(path.cost).toBe(5.62);
			expect(path.path.length).toBe(3);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for skill B", () => {

			const goals = [
				...skillsMap.filter(skill => skill.id === "sk:B")
			];

			const path = getPath({
				skills: skillsMap,
				learningUnits: compositeLus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...compositeLus.filter(skill => skill.id === "lu:50"),
				...compositeLus.filter(skill => skill.id === "lu:A10"),
				...compositeLus.filter(skill => skill.id === "cu:A"),
				];

			expect(path.cost).toBe(5.62);
			expect(path.path.length).toBe(3);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for Composite unit against multi Learning units", () => {

			const compositeLus: LearningUnit[] = [
				newLearningUnit(skillsMap, "lu:A", [], ["sk:1", "sk:2"]),
				newLearningUnit(skillsMap, "lu:1", ["sk:1", "sk:2"], ["sk:3"]),
				newLearningUnit(skillsMap, "lu:2", ["sk:3", "sk:4"], ["sk:6"]),
				newLearningUnit(skillsMap, "lu:3", [], ["sk:4"]),
				newCompositeLearningUnit(skillsMap, "cu:A", [], [], []
				, []
				, []),
			];
	
			compositeLus.find(lu => lu.id == "cu:A").children!.push(
				compositeLus.find(lu => lu.id == "lu:1")!,
				compositeLus.find(lu => lu.id == "lu:2")!,
				compositeLus.find(lu => lu.id == "lu:3")!,
				compositeLus.find(lu => lu.id == "lu:A")!
			)
	
			computeSkills(compositeLus.filter(lu => lu.children.length > 0));
			
			const goals = [
				...skillsMap.filter(skill => skill.id === "sk:1"),
				...skillsMap.filter(skill => skill.id === "sk:2"),
				...skillsMap.filter(skill => skill.id === "sk:3"),
				...skillsMap.filter(skill => skill.id === "sk:4"),
				...skillsMap.filter(skill => skill.id === "sk:6"),
			];

			const path = getPath({
				skills: skillsMap,
				learningUnits: compositeLus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...compositeLus.filter(skill => skill.id === "cu:A"),
				];

			expect(path.cost).toBe(3.8);
			expect(path.path.length).toBe(1);
			expect(path.path).toEqual(expectedPath);
		});

		it("check path for two Composite units", () => {

			const compositeLus: LearningUnit[] = [
				newLearningUnit(skillsMap, "lu:A", [], ["sk:1", "sk:2"]),
				newLearningUnit(skillsMap, "lu:1", ["sk:1", "sk:2"], ["sk:3"]),
				newLearningUnit(skillsMap, "lu:2", ["sk:4"], ["sk:6"]),
				newLearningUnit(skillsMap, "lu:3", [], ["sk:4"]),
				newCompositeLearningUnit(skillsMap, "cu:A", [], [], []
				, []
				, []),
				newCompositeLearningUnit(skillsMap, "cu:B", [], [], []
				, []
				, []),
			];
	
			compositeLus.find(lu => lu.id == "cu:A").children!.push(
				compositeLus.find(lu => lu.id == "lu:1")!,
				compositeLus.find(lu => lu.id == "lu:A")!
			)
	
			compositeLus.find(lu => lu.id == "cu:B").children!.push(
				compositeLus.find(lu => lu.id == "lu:2")!,
				compositeLus.find(lu => lu.id == "lu:3")!
			)

			computeSkills(compositeLus.filter(lu => lu.children.length > 0));
			
			const goals = [
				...skillsMap.filter(skill => skill.id === "sk:3"),
				...skillsMap.filter(skill => skill.id === "sk:6"),
			];

			const path = getPath({
				skills: skillsMap,
				learningUnits: compositeLus,
				goal: goals,
				optimalSolution: true,
				contextSwitchPenalty: 1.2
			});

			const expectedPath = [
				...compositeLus.filter(skill => skill.id === "cu:B"),
				...compositeLus.filter(skill => skill.id === "cu:A"),
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
		children: [],
		requiredSkills: map.filter(skill => requiredSkills.includes(skill.id)),
		teachingGoals: map.filter(skill => teachingGoals.includes(skill.id)),
		suggestedSkills: suggestions,
		getTeachingGoals: getTeachingGoals,
		getRequiredSkills: getRequiredSkills,
		getSuggestedSkills: getSuggestedSkills,
	};
}

function newCompositeLearningUnit(
	map: Skill[],
	id: string,
	requiredSkills: string[],
	teachingGoals: string[],
	suggestedSkills: { weight: number; skill: string }[] = [],
	exportedRequiredSkills: string[],
	exportedRecommendedSkills: { weight: number; skill: string }[] = [],
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

	const exportedSuggestions: { weight: number; skill: Skill }[] = [];
	if (exportedRecommendedSkills.length > 0) {
		for (const suggestion of exportedRecommendedSkills) {
			const skill = map.find(skill => suggestion.skill.includes(skill.id));
			if (skill) {
				exportedSuggestions.push({ weight: suggestion.weight, skill: skill });
			}
		}
	}

	return {
		id: id,
		children: [],
		requiredSkills: map.filter(skill => requiredSkills.includes(skill.id)),
		teachingGoals: map.filter(skill => teachingGoals.includes(skill.id)),
		suggestedSkills: suggestions,
		exportedRequiredSkills: map.filter(skill => exportedRequiredSkills.includes(skill.id)),
		exportedRecommendedSkills: exportedSuggestions,
		getTeachingGoals: getTeachingGoals,
		getRequiredSkills: getRequiredSkills,
		getSuggestedSkills: getSuggestedSkills,
	};
}