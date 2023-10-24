import { LearningUnit, Skill, Graph, Path } from "./types";
import {
	computeSuggestedSkills,
	getConnectedGraphForLearningUnit,
	getConnectedGraphForSkill,
	getPath
} from "./pathPlanner";
import { CostFunction } from "./fastDownward/fdTypes";

describe("Path Planer", () => {
	// Re-usable test data (must be passed to dataHandler.init() before each test)
	// Skills sorted by IDs to simplify comparisons during tests
	// Flat map
	const firstMap: Skill[] = [
		{ id: "sk:1", repositoryId: "1", nestedSkills: [] },
		{ id: "sk:2", repositoryId: "1", nestedSkills: [] },
		{ id: "sk:3", repositoryId: "1", nestedSkills: [] }
	].sort((a, b) => a.id.localeCompare(b.id));
	// Flat map
	const secondMap: Skill[] = [
		{ id: "sk:4", repositoryId: "2", nestedSkills: [] },
		{ id: "sk:5", repositoryId: "2", nestedSkills: [] },
		{ id: "sk:6", repositoryId: "2", nestedSkills: [] }
	].sort((a, b) => a.id.localeCompare(b.id));
	// Flat map, but longer (no conflict with Map1 as they are from a different repository)
	const thirdMap: Skill[] = [
		{ id: "sk:1", repositoryId: "3", nestedSkills: [] },
		{ id: "sk:2", repositoryId: "3", nestedSkills: [] },
		{ id: "sk:3", repositoryId: "3", nestedSkills: [] },
		{ id: "sk:4", repositoryId: "3", nestedSkills: [] },
		{ id: "sk:5", repositoryId: "3", nestedSkills: [] }
	].sort((a, b) => a.id.localeCompare(b.id));
	// Skills with nested skills
	const thirdMapHierarchy: Skill[] = [
		{ id: "sk:7", repositoryId: "3", nestedSkills: ["sk:8"] },
		{ id: "sk:8", repositoryId: "3", nestedSkills: [] },
		{ id: "sk:9", repositoryId: "3", nestedSkills: ["sk:10", "sk:11"] },
		{ id: "sk:10", repositoryId: "3", nestedSkills: ["sk:12"] },
		{ id: "sk:11", repositoryId: "3", nestedSkills: [] },
		{ id: "sk:12", repositoryId: "3", nestedSkills: [] }
	].sort((a, b) => a.id.localeCompare(b.id));
	// LearningUnits
	const straightPathOfLus: LearningUnit[] = [
		newLearningUnit(firstMap, "lu:1", [], ["sk:1"]),
		newLearningUnit(firstMap, "lu:2", ["sk:1"], ["sk:2"]),
		newLearningUnit(firstMap, "lu:3", ["sk:2"], ["sk:3"])
	];
	const straightPathOfLus2: LearningUnit[] = [
		newLearningUnit(secondMap, "lu:4", [], ["sk:4"]),
		newLearningUnit(secondMap, "lu:5", ["sk:4"], ["sk:5"]),
		newLearningUnit(secondMap, "lu:5", ["sk:4"], ["sk:6"])
	];
	// lu:7 and lu:8 must be learned to understand sk:9 (which is group of sk:10 and sk:11)
	const structuredPathOfLus: LearningUnit[] = [
		newLearningUnit(thirdMapHierarchy, "lu:7", [], ["sk:10"]),
		newLearningUnit(thirdMapHierarchy, "lu:8", [], ["sk:11"]),
		newLearningUnit(thirdMapHierarchy, "lu:9", ["sk:9"], ["sk:8"])
	];
	const multipleRequirementsOfLu: LearningUnit[] = [
		newLearningUnit(firstMap, "lu:10", [], ["sk:1"]),
		newLearningUnit(firstMap, "lu:11", [], ["sk:2"]),
		newLearningUnit(firstMap, "lu:12", ["sk:1", "sk:2"], ["sk:3"])
	];
	// Alternative languages (de is shorter than en)
	const alternativeLanguagesOfLus: (LearningUnit & { lang: string })[] = [
		{ ...newLearningUnit(thirdMap, "lu:13:de", [], ["sk:1"]), lang: "de" },
		{ ...newLearningUnit(thirdMap, "lu:14:de", ["sk:1"], ["sk:2"]), lang: "de" },
		{ ...newLearningUnit(thirdMap, "lu:15:de", ["sk:2"], ["sk:3", "sk:4"]), lang: "de" },
		{ ...newLearningUnit(thirdMap, "lu:13:en", [], ["sk:1"]), lang: "en" },
		{ ...newLearningUnit(thirdMap, "lu:14:en", ["sk:1"], ["sk:2"]), lang: "en" },
		{ ...newLearningUnit(thirdMap, "lu:15:en", ["sk:2"], ["sk:3"]), lang: "en" },
		{ ...newLearningUnit(thirdMap, "lu:16:en", ["sk:3"], ["sk:4"]), lang: "en" }
	];
	// Two alternative paths with different costs
	const alternativeCostsOfLus: (LearningUnit & { cost: number })[] = [
		// 1st alternative path, cost: 7
		{ ...newLearningUnit(thirdMap, "lu:17", [], ["sk:1"]), cost: 1 },
		{ ...newLearningUnit(thirdMap, "lu:18", ["sk:1"], ["sk:2"]), cost: 1 },
		{ ...newLearningUnit(thirdMap, "lu:19", ["sk:2"], ["sk:3"]), cost: 5 },
		// 2nd alternative path, cost: 5
		{ ...newLearningUnit(thirdMap, "lu:20", [], ["sk:4"]), cost: 3 },
		{ ...newLearningUnit(thirdMap, "lu:21", ["sk:4"], ["sk:5"]), cost: 1 },
		{ ...newLearningUnit(thirdMap, "lu:22", ["sk:5"], ["sk:3"]), cost: 1 }
	];

	describe("getConnectedGraphForSkill - Skills Only", () => {
		it("Only skills available; no nested skills -> return all skills of the same map", async () => {
			// Test: Compute graph
			const graph = await getConnectedGraphForSkill(firstMap);

			// Assert: All skills of the first map are returned
			const [nodeIDs, nodeElements] = extractElements(graph);
			// Compare IDs
			expect(nodeIDs).toEqual(firstMap.map(skill => skill.id));
			// Compare elements
			expect(nodeElements).toEqual(firstMap);
		});

		it("Only skills available; nested skills -> return all skills of the same map", async () => {
			// Test: Compute graph
			const graph = await getConnectedGraphForSkill(thirdMapHierarchy);

			// Assert: All skills of the third map are returned
			const [nodeIDs, nodeElements] = extractElements(graph);
			// Compare IDs
			expect(nodeIDs).toEqual(thirdMapHierarchy.map(skill => skill.id));
			// Compare elements
			expect(nodeElements).toEqual(thirdMapHierarchy);
		});

		it("Skills & LearningUnits available; no nested skills -> return all skills of the same map", async () => {
			// Test: Compute graph
			const graph = await getConnectedGraphForSkill(firstMap);

			// Assert: All skills of the first map are returned
			const [nodeIDs, nodeElements] = extractElements(graph);
			// Compare IDs
			expect(nodeIDs).toEqual(firstMap.map(skill => skill.id));
			// Compare elements
			expect(nodeElements).toEqual(firstMap);
		});
	});

	describe("getConnectedGraphForSkill - Skills & LearningUnits", () => {
		it("Only skills available; no nested skills -> return all skills of the same map", async () => {
			// Test: Compute graph
			const graph = await getConnectedGraphForSkill(firstMap);

			// Assert: All skills of the first map are returned
			const [nodeIDs, nodeElements] = extractElements(graph);
			// Compare IDs
			expect(nodeIDs).toEqual(firstMap.map(skill => skill.id));
			// Compare elements
			expect(nodeElements).toEqual(firstMap);
		});

		it("Skills & LearningUnits using Skills of the same repository; no nested skills -> return all skills and LearningUnits", async () => {
			// Test: Compute graph
			const graph = await getConnectedGraphForLearningUnit(straightPathOfLus, firstMap);

			// Assert: All skills of the first map and all LUs of the straight path are returned
			const [nodeIDs, nodeElements] = extractElements(graph);
			const [expectedIDs, expectedElements] = sortExpectedElements([
				...firstMap,
				...straightPathOfLus
			]);
			// Compare IDs
			expect(nodeIDs).toEqual(expectedIDs);
			// Compare elements
			expect(nodeElements).toEqual(expectedElements);
		});

		it("Skills & LearningUnits of multiple repositories; no nested skills -> return only connected elements", async () => {
			// Test: Compute graph
			const graph = await getConnectedGraphForLearningUnit(straightPathOfLus, firstMap);

			// Assert: All skills of the first map and all LUs of straightPathOfLus1 are returned
			// straightPathOfLus2 is not connected and must not be returned
			const [nodeIDs, nodeElements] = extractElements(graph);
			const [expectedIDs, expectedElements] = sortExpectedElements([
				...firstMap,
				...straightPathOfLus
			]);
			// Compare IDs
			expect(nodeIDs).toEqual(expectedIDs);
			// Compare elements
			expect(nodeElements).toEqual(expectedElements);
		});
	});

	describe("pathForSkill", () => {
		it("No knowledge; 1 map; no nested skills; 1 goal", async () => {
			// Test: Compute path
			const path = await getPath({
				skills: firstMap,
				learningUnits: straightPathOfLus,
				desiredSkills: [firstMap[2]],
				optimalSolution: true,
				contextSwitchPenalty: 1
			});

			// Assert: Path should be: 1 -> 2 -> 3
			const expectedIDs = straightPathOfLus
				.map(lu => lu.id)
				.sort((a, b) => a.localeCompare(b));
			expectPath(path, [expectedIDs], 3);
		});

		it("Intermediate knowledge; 1 map; no nested skills; 1 goal", async () => {
			// Test: Compute path
			const path = await getPath({
				skills: firstMap,
				learningUnits: straightPathOfLus,
				desiredSkills: [firstMap[2]],
				ownedSkill: [firstMap[1]],
				optimalSolution: true,
				contextSwitchPenalty: 1
			});

			// Assert: Path should be: 3 (as 2 is already known)
			const expectedIDs = [straightPathOfLus[2].id];
			expectPath(path, [expectedIDs], 1);
		});

		it("No knowledge; 1 map; with nested skills; 1 goal", async () => {
			// Test: Compute path
			const path = await getPath({
				skills: thirdMapHierarchy,
				learningUnits: structuredPathOfLus,
				desiredSkills: thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
				optimalSolution: true,
				contextSwitchPenalty: 1
			});

			// Assert: Path should be: (7 & 8) -> 9
			expectPath(
				path,
				[
					["lu:7", "lu:8", "lu:9"],
					["lu:8", "lu:7", "lu:9"]
				],
				3
			);
		});

		it("No knowledge; 1 map; no nested skills; multiple requirements for 1 LU; 1 goal", async () => {
			// Test: Compute path
			const path = await getPath({
				skills: firstMap,
				learningUnits: multipleRequirementsOfLu,
				desiredSkills: firstMap.filter(skill => skill.id === "sk:3"),
				optimalSolution: true,
				contextSwitchPenalty: 1
			});

			// Assert: Path should be: (10 & 11) -> 12
			expectPath(
				path,
				[
					["lu:10", "lu:11", "lu:12"],
					["lu:11", "lu:10", "lu:12"]
				],
				3
			);
		});

		it("No knowledge; 2 maps; with nested skills; multiple requirements for 1 LU; 2 goals", async () => {
			// Test: Compute path
			const path = await getPath({
				skills: [...firstMap, ...thirdMapHierarchy],
				learningUnits: [...multipleRequirementsOfLu, ...structuredPathOfLus],
				desiredSkills: [
					...firstMap.filter(skill => skill.id === "sk:3"),
					...thirdMapHierarchy.filter(skill => skill.id === "sk:8")
				],
				optimalSolution: true,
				contextSwitchPenalty: 1
			});

			// Assert: Path contain LUs from two paths:
			// Path 1: (10 & 11) -> 12
			// Path 2: (7 & 8) -> 9
			expectPath(
				path,
				[
					// Path 1, Path 2
					["lu:10", "lu:11", "lu:12", "lu:7", "lu:8", "lu:9"],
					["lu:11", "lu:10", "lu:12", "lu:7", "lu:8", "lu:9"],
					["lu:10", "lu:11", "lu:12", "lu:8", "lu:7", "lu:9"],
					["lu:11", "lu:10", "lu:12", "lu:8", "lu:7", "lu:9"],
					// Path 2, Path 1
					["lu:7", "lu:8", "lu:9", "lu:10", "lu:11", "lu:12"],
					["lu:8", "lu:7", "lu:9", "lu:10", "lu:11", "lu:12"],
					["lu:7", "lu:8", "lu:9", "lu:11", "lu:10", "lu:12"],
					["lu:8", "lu:7", "lu:9", "lu:11", "lu:10", "lu:12"],
					// Mixed paths (not complete, add if necessary)
					["lu:7", "lu:8", "lu:10", "lu:11", "lu:9", "lu:12"],
					["lu:7", "lu:8", "lu:11", "lu:10", "lu:9", "lu:12"],
					["lu:8", "lu:7", "lu:10", "lu:11", "lu:9", "lu:12"],
					["lu:8", "lu:7", "lu:11", "lu:10", "lu:9", "lu:12"],
					["lu:7", "lu:10", "lu:8", "lu:11", "lu:9", "lu:12"]
				],
				6
			);
		});

		it("No knowledge; 1 map; no nested skills; multiple paths; 1 goal; CostFunction", async () => {
			// Test data preparation
			const fnCost: CostFunction<LearningUnit & { lang: string }> = lu => {
				// Simulate that only english units can be understood, all others should be avoided
				return lu.lang === "en" ? 1 : Infinity;
			};

			// Test: Compute path
			const path = await getPath({
				skills: thirdMap,
				learningUnits: alternativeLanguagesOfLus,
				desiredSkills: thirdMap.filter(skill => skill.id === "sk:4"),
				fnCost: fnCost,
				optimalSolution: true,
				contextSwitchPenalty: 1
			});

			// Assert: Path should be: lu:13:en -> lu:14:en -> lu:14:en -> lu:15:en
			const expectedIDs = alternativeLanguagesOfLus
				.filter(lu => lu.lang === "en")
				.map(lu => lu.id)
				.sort((a, b) => a.localeCompare(b));
			expectPath(path, [expectedIDs], 4);
		});

		it("No knowledge; 1 map; no nested skills; multiple paths; 1 goal; CostFunction; Cheap path becomes expensive at the end", async () => {
			// Test data preparation
			const fnCost: CostFunction<LearningUnit & { cost: number }> = lu => {
				// Simulate that the LearningUnits have any properties which are more expensive for a learner
				return lu.cost;
			};

			// Test: Compute path
			const path = await getPath({
				skills: thirdMap,
				learningUnits: alternativeCostsOfLus,
				desiredSkills: thirdMap.filter(skill => skill.id === "sk:3"),
				fnCost: fnCost,
				optimalSolution: true,
				contextSwitchPenalty: 1
			});

			// Assert: Path should be: lu:20 -> lu:21 -> lu:22
			expectPath(path, [["lu:20", "lu:21", "lu:22"]], 5);
		});

		describe("Suggested Ordering", () => {
			// Suggested Ordering: LU1 -> (optional) LU2 -> LU3
			const suggestedOrderingOfLus: LearningUnit[] = [
				newLearningUnit(firstMap, "lu:1", [], ["sk:1"]),
				newLearningUnit(firstMap, "lu:2", ["sk:1"], ["sk:2"]),
				newLearningUnit(
					firstMap,
					"lu:3",
					["sk:1"],
					["sk:3"],
					[{ weight: 0.2, skill: "sk:2" }]
				)
			];

			it("Only necessary skills / skip suggested skills", async () => {
				// Test: Compute path
				const path = await getPath({
					skills: thirdMap,
					learningUnits: suggestedOrderingOfLus,
					desiredSkills: thirdMap.filter(skill => skill.id === "sk:3"),
					optimalSolution: true,
					contextSwitchPenalty: 1
				});

				// Assert: Path should be: lu:1 -> lu:3
				expectPath(path, [["lu:1", "lu:3"]], 2.2);
			});

			it("Include suggested skill -> Ensure Ordering", async () => {
				// Test: Compute path
				const path = await getPath({
					skills: thirdMap,
					learningUnits: suggestedOrderingOfLus,
					desiredSkills: firstMap.filter(
						skill => skill.id === "sk:3" || skill.id === "sk:2"
					),
					optimalSolution: true,
					contextSwitchPenalty: 1
				});

				// Assert: Path should be: lu:1 -> lu:2 -> lu:3
				expectPath(path, [["lu:1", "lu:2", "lu:3"]], 3);
			});
		});
	});

	describe("computeSuggestedSkills", () => {
		it("Apply first constraints", async () => {
			// Compute default order and exchange first to positions
			const path = await getPath({
				skills: thirdMapHierarchy,
				learningUnits: structuredPathOfLus,
				desiredSkills: thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
				optimalSolution: true,
				contextSwitchPenalty: 1
			});

			path.path = [path.path[1], path.path[0], path.path[2]];
			structuredPathOfLus.sort((a, b) => {
				return path.path.indexOf(a) - path.path.indexOf(b);
			});

			// Test: Simulate
			await computeSuggestedSkills(
				structuredPathOfLus,
				async (lu: LearningUnit, missingSkills: string[]) => {
					switch (lu.id) {
						case path.path[0].id:
							fail("Must not compute any constraints for the first LU");
						case path.path[1].id:
							expect(missingSkills).toEqual(
								path.path[0].teachingGoals.map(skill => skill.id)
							);
							break;
						case path.path[2].id:
							expect(missingSkills).toEqual(
								path.path[1].teachingGoals.map(skill => skill.id)
							);
							break;
					}
				}
			);

			// Apply constraints
			await computeSuggestedSkills(
				structuredPathOfLus,
				async (lu: LearningUnit, missingSkills: string[]) => {
					lu.suggestedSkills = missingSkills.map(skill => ({
						weight: 1,
						skill: thirdMapHierarchy.find(s => s.id === skill)
					}));
				}
			);

			// Compute path with new constraints
			const changedPath = await getPath({
				skills: thirdMapHierarchy,
				learningUnits: structuredPathOfLus,
				desiredSkills: thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
				optimalSolution: true,
				contextSwitchPenalty: 1
			});

			// Test: Verify that path has changed
			expect(changedPath.path).toEqual(path.path);
		});
	});
});

function extractElements(graph: Graph): [string[], (Skill | LearningUnit)[]] {
	const nodeIDs = graph.nodes.map(node => node.id).sort((a, b) => a.localeCompare(b));
	const nodeElements = graph.nodes
		.map(node => node.element)
		.sort((a, b) => a.id.localeCompare(b.id));
	return [nodeIDs, nodeElements];
}

function sortExpectedElements(expectedElements: (Skill | LearningUnit)[]) {
	expectedElements = expectedElements.sort((a, b) => a.id.localeCompare(b.id));
	const expectedIDs = expectedElements.map(element => element.id);
	return [expectedIDs, expectedElements];
}

function expectPath(path: Path | null, expectedPaths: string[][] | null, cost?: number) {
	if (!expectedPaths) {
		expect(path).toBeNull();
		return;
	}

	if (!path) {
		fail(`Path is null, but there was at least one path expected: ${expectedPaths[0]}`);
	}

	const pathIsValid = expectedPaths.some(expectedPath => {
		const pathIsEqual = path.path
			.map(lu => lu.id)
			.every((id, index) => id === expectedPath[index]);
		return pathIsEqual;
	});

	if (!pathIsValid) {
		// Return one wrong result
		expect(path).toEqual(expectedPaths[0]);
	} else {
		if (cost) {
			expect(path.cost).toBe(cost);
		} else {
			expect(pathIsValid).toBe(true);
		}
	}
}

function newLearningUnit(
	map: Skill[],
	id: string,
	requiredSkills: string[],
	teachingGoals: string[],
	suggestedSkills: { weight: number; skill: string }[] = []
) {
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
