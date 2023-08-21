import { LearningUnit, Skill, Graph, LearningUnitProvider } from "./types";
import { getConnectedGraphForLearningUnit, getConnectedGraphForSkill } from "./pathPlanner";

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
	].sort((a, b) => a.id.localeCompare(b.id));
	const straightPathOfLus2: LearningUnit[] = [
		{ id: "lu:4", requiredSkills: [], teachingGoals: ["sk:4"] },
		{ id: "lu:5", requiredSkills: ["sk:4"], teachingGoals: ["sk:5"] },
		{ id: "lu:6", requiredSkills: ["sk:5"], teachingGoals: ["sk:6"] }
	].sort((a, b) => a.id.localeCompare(b.id));
	const structuredPathOfLus: LearningUnit[] = [
		{ id: "lu:7", requiredSkills: [], teachingGoals: ["sk:10"] },
		{ id: "lu:8", requiredSkills: [], teachingGoals: ["sk:11"] },
		{ id: "lu:9", requiredSkills: ["sk:9"], teachingGoals: ["sk:8"] }
	].sort((a, b) => a.id.localeCompare(b.id));

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

		it.skip("Skills & LearningUnits of multiple repositories; no nested skills -> return only connected elements", async () => {
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
		it("No knowledge; only 1 map; no nested skills", async () => {
			// Test data preparation
			dataHandler.init([...firstMap], [...straightPathOfLus]);

			// Test: Compute path
			const path = await planer.pathForSkill(firstMap[2]);

			// Assert: Path should be: 1 -> 2 -> 3
			const expectedIDs = straightPathOfLus
				.map(lu => lu.id)
				.sort((a, b) => a.localeCompare(b));
			expect(path).toEqual(expectedIDs);
		});

		it("Intermediate knowledge; only 1 map; no nested skills", async () => {
			// Test data preparation
			dataHandler.init([...firstMap], [...straightPathOfLus]);

			// Test: Compute path
			const path = await planer.pathForSkill(firstMap[2], [firstMap[1]]);

			// Assert: Path should be: 3 (as 2 is already known)
			const expectedIDs = [straightPathOfLus[2].id];
			expect(path).toEqual(expectedIDs);
		});

		it("No knowledge; only 1 map; with nested skills", async () => {
			// Test data preparation
			dataHandler.init([...thirdMapHierarchy], [...structuredPathOfLus]);

			// Test: Compute path
			const path = await planer.pathForSkill(
				thirdMapHierarchy.find(skill => skill.id === "sk:8")
			);

			// Assert: Path should be: 7 -> 8 -> 9
			const expectedIDs = structuredPathOfLus
				.map(lu => lu.id)
				.sort((a, b) => a.localeCompare(b));
			expect(path).toEqual(expectedIDs);
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

class TestDataHandler implements LearningUnitProvider {
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
