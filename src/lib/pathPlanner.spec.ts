import { LearningUnit, Skill, Graph, LearningUnitProvider, Path } from "./types";
import {
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
		{ id: "lu:1", requiredSkills: [], teachingGoals: ["sk:1"] },
		{ id: "lu:2", requiredSkills: ["sk:1"], teachingGoals: ["sk:2"] },
		{ id: "lu:3", requiredSkills: ["sk:2"], teachingGoals: ["sk:3"] }
	];
	const straightPathOfLus2: LearningUnit[] = [
		{ id: "lu:4", requiredSkills: [], teachingGoals: ["sk:4"] },
		{ id: "lu:5", requiredSkills: ["sk:4"], teachingGoals: ["sk:5"] },
		{ id: "lu:6", requiredSkills: ["sk:5"], teachingGoals: ["sk:6"] }
	];
	// lu:7 and lu:8 must be learned to understand sk:9 (which is group of sk:10 and sk:11)
	const structuredPathOfLus: LearningUnit[] = [
		{ id: "lu:7", requiredSkills: [], teachingGoals: ["sk:10"] },
		{ id: "lu:8", requiredSkills: [], teachingGoals: ["sk:11"] },
		{ id: "lu:9", requiredSkills: ["sk:9"], teachingGoals: ["sk:8"] }
	];
	const multipleRequirementsOfLu: LearningUnit[] = [
		{ id: "lu:10", requiredSkills: [], teachingGoals: ["sk:1"] },
		{ id: "lu:11", requiredSkills: [], teachingGoals: ["sk:2"] },
		{ id: "lu:12", requiredSkills: ["sk:1", "sk:2"], teachingGoals: ["sk:3"] }
	];
	// Alternative languages (de is shorter than en)
	const alternativeLanguagesOfLus: (LearningUnit & { lang: string })[] = [
		{ id: "lu:13:de", requiredSkills: [], teachingGoals: ["sk:1"], lang: "de" },
		{ id: "lu:14:de", requiredSkills: ["sk:1"], teachingGoals: ["sk:2"], lang: "de" },
		{ id: "lu:15:de", requiredSkills: ["sk:2"], teachingGoals: ["sk:3", "sk:4"], lang: "de" },
		{ id: "lu:13:en", requiredSkills: [], teachingGoals: ["sk:1"], lang: "en" },
		{ id: "lu:14:en", requiredSkills: ["sk:1"], teachingGoals: ["sk:2"], lang: "en" },
		{ id: "lu:15:en", requiredSkills: ["sk:2"], teachingGoals: ["sk:3"], lang: "en" },
		{ id: "lu:16:en", requiredSkills: ["sk:3"], teachingGoals: ["sk:4"], lang: "en" }
	];
	// Two alternative paths with different costs
	const alternativeCostsOfLus: (LearningUnit & { cost: number })[] = [
		// 1st alternative path, cost: 7
		{ id: "lu:17", requiredSkills: [], teachingGoals: ["sk:1"], cost: 1 },
		{ id: "lu:18", requiredSkills: ["sk:1"], teachingGoals: ["sk:2"], cost: 1 },
		{ id: "lu:19", requiredSkills: ["sk:2"], teachingGoals: ["sk:3"], cost: 5 },
		// 2nd alternative path, cost: 5
		{ id: "lu:20", requiredSkills: [], teachingGoals: ["sk:4"], cost: 3 },
		{ id: "lu:21", requiredSkills: ["sk:4"], teachingGoals: ["sk:5"], cost: 1 },
		{ id: "lu:22", requiredSkills: ["sk:5"], teachingGoals: ["sk:3"], cost: 1 }
	];

	describe("getConnectedGraphForSkill - Skills Only", () => {
		it("Only skills available; no nested skills -> return all skills of the same map", async () => {
			// Test data preparation
			dataHandler.init([...firstMap, ...secondMap, ...thirdMapHierarchy], []);

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
			// Test data preparation
			dataHandler.init([...firstMap, ...secondMap, ...thirdMapHierarchy], []);

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
			// Test data preparation
			dataHandler.init(
				[...firstMap, ...secondMap, ...thirdMapHierarchy],
				[...straightPathOfLus]
			);

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
			// Test data preparation
			dataHandler.init([...firstMap, ...secondMap, ...thirdMapHierarchy], []);

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
			// Test data preparation
			dataHandler.init(
				[...firstMap, ...secondMap, ...thirdMapHierarchy],
				[...straightPathOfLus]
			);

			// Test: Compute graph
			const graph = await getConnectedGraphForLearningUnit(dataHandler, firstMap);

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
			// Test data preparation
			dataHandler.init(
				[...firstMap, ...secondMap, ...thirdMapHierarchy],
				[...straightPathOfLus, ...straightPathOfLus2]
			);

			// Test: Compute graph
			const graph = await getConnectedGraphForLearningUnit(dataHandler, firstMap);

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
			// Test data preparation
			dataHandler.init([...firstMap], [...straightPathOfLus]);

			// Test: Compute path
			const path = await getPath({
				skills: firstMap,
				luProvider: dataHandler,
				desiredSkills: [firstMap[2]],
				optimalSolution: true
			});

			// Assert: Path should be: 1 -> 2 -> 3
			const expectedIDs = straightPathOfLus
				.map(lu => lu.id)
				.sort((a, b) => a.localeCompare(b));
			expectPath(path, [expectedIDs], 3);
		});

		it("Intermediate knowledge; 1 map; no nested skills; 1 goal", async () => {
			// Test data preparation
			dataHandler.init([...firstMap], [...straightPathOfLus]);

			// Test: Compute path
			const path = await getPath({
				skills: firstMap,
				luProvider: dataHandler,
				desiredSkills: [firstMap[2]],
				ownedSkill: [firstMap[1]],
				optimalSolution: true
			});

			// Assert: Path should be: 3 (as 2 is already known)
			const expectedIDs = [straightPathOfLus[2].id];
			expectPath(path, [expectedIDs], 1);
		});

		it("No knowledge; 1 map; with nested skills; 1 goal", async () => {
			// Test data preparation
			dataHandler.init([...thirdMapHierarchy], [...structuredPathOfLus]);

			// Test: Compute path
			const path = await getPath({
				skills: thirdMapHierarchy,
				luProvider: dataHandler,
				desiredSkills: thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
				optimalSolution: true
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
			// Test data preparation
			dataHandler.init([...firstMap], [...multipleRequirementsOfLu]);

			// Test: Compute path
			const path = await getPath({
				skills: firstMap,
				luProvider: dataHandler,
				desiredSkills: firstMap.filter(skill => skill.id === "sk:3"),
				optimalSolution: true
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
			// Test data preparation
			dataHandler.init(
				[...firstMap, ...thirdMapHierarchy],
				[...multipleRequirementsOfLu, ...structuredPathOfLus]
			);

			// Test: Compute path
			const path = await getPath({
				skills: [...firstMap, ...thirdMapHierarchy],
				luProvider: dataHandler,
				desiredSkills: [
					...firstMap.filter(skill => skill.id === "sk:3"),
					...thirdMapHierarchy.filter(skill => skill.id === "sk:8")
				],
				optimalSolution: true
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
					["lu:8", "lu:7", "lu:11", "lu:10", "lu:9", "lu:12"]
				],
				6
			);
		});

		it("No knowledge; 1 map; no nested skills; multiple paths; 1 goal; CostFunction", async () => {
			// Test data preparation
			dataHandler.init([...thirdMap], [...alternativeLanguagesOfLus]);

			const fnCost: CostFunction<LearningUnit & { lang: string }> = lu => {
				// Simulate that only english units can be understood, all others should be avoided
				return lu.lang === "en" ? 1 : Infinity;
			};

			// Test: Compute path
			const path = await getPath({
				skills: thirdMap,
				luProvider: dataHandler,
				desiredSkills: thirdMap.filter(skill => skill.id === "sk:4"),
				fnCost: fnCost,
				optimalSolution: true
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
			dataHandler.init([...thirdMap], [...alternativeCostsOfLus]);

			const fnCost: CostFunction<LearningUnit & { cost: number }> = lu => {
				// Simulate that the LearningUnits have any properties which are more expensive for a learner
				return lu.cost;
			};

			// Test: Compute path
			const path = await getPath({
				skills: thirdMap,
				luProvider: dataHandler,
				desiredSkills: thirdMap.filter(skill => skill.id === "sk:3"),
				fnCost: fnCost,
				optimalSolution: true
			});

			// Assert: Path should be: lu:20 -> lu:21 -> lu:22
			expectPath(path, [["lu:20", "lu:21", "lu:22"]], 5);
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
		fail(`Path is null, but there was at least one path expected: ${expectPath[0]}`);
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

class TestDataHandler implements LearningUnitProvider<LearningUnit> {
	private skillMaps: Map<string, Skill[]> = new Map<string, Skill[]>();
	private learningUnits: LearningUnit[] = [];

	init(skills: Skill[], learningUnits: LearningUnit[]) {
		// Create SkillMaps on the fly
		skills.forEach(skill => {
			const skillMap = this.skillMaps.get(skill.repositoryId);
			if (skillMap) {
				// Add skill to existing map
				skillMap.push(skill);
			} else {
				// Create new map
				this.skillMaps.set(skill.repositoryId, [skill]);
			}
		});

		this.learningUnits = learningUnits;
	}

	getLearningUnitsBySkillIds(skillIds: string[]): Promise<LearningUnit[]> {
		return Promise.resolve(
			this.learningUnits.filter(lu => lu.teachingGoals.some(goal => skillIds.includes(goal)))
		);
	}
}

const dataHandler = new TestDataHandler();
