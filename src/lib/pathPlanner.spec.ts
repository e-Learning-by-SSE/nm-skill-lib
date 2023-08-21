import { LearningUnitProvider, SkillProvider } from "./dataProviders";
import { PathPlanner } from "./pathPlanner";
import { LearningUnit, Skill } from "./types";

describe("Path Planer", () => {
	let dataHandler: TestDataHandler;
	let planer: PathPlanner;

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

	beforeEach(() => {
		dataHandler = new TestDataHandler();
		planer = new PathPlanner(dataHandler, dataHandler);
	});

	describe("getConnectedGraphForSkill - Skills Only", () => {
		it("Only skills available; no nested skills -> return all skills of the same map", async () => {
			// Test data preparation
			dataHandler.init([...firstMap, ...secondMap, ...thirdMapHierarchy], []);

			// Test: Compute graph
			const graph = await planer.getConnectedGraphForSkill(firstMap[0], false);

			// Assert: All skills of the first map are returned
			const nodeIDs = graph.nodes.map(node => node.id).sort((a, b) => a.localeCompare(b));
			const nodeElements = graph.nodes
				.map(node => node.element)
				.sort((a, b) => a.id.localeCompare(b.id));
			// Compare IDs
			expect(nodeIDs).toEqual(firstMap.map(skill => skill.id));
			// Compare elements
			expect(nodeElements).toEqual(firstMap);
		});

		it("Only skills available; nested skills -> return all skills of the same map", async () => {
			// Test data preparation
			dataHandler.init([...firstMap, ...secondMap, ...thirdMapHierarchy], []);

			// Test: Compute graph
			const graph = await planer.getConnectedGraphForSkill(thirdMapHierarchy[0], false);

			// Assert: All skills of the third map are returned
			const nodeIDs = graph.nodes.map(node => node.id).sort((a, b) => a.localeCompare(b));
			const nodeElements = graph.nodes
				.map(node => node.element)
				.sort((a, b) => a.id.localeCompare(b.id));
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
			const graph = await planer.getConnectedGraphForSkill(firstMap[0], false);

			// Assert: All skills of the first map are returned
			const nodeIDs = graph.nodes.map(node => node.id).sort((a, b) => a.localeCompare(b));
			const nodeElements = graph.nodes
				.map(node => node.element)
				.sort((a, b) => a.id.localeCompare(b.id));
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
			const graph = await planer.getConnectedGraphForSkill(firstMap[0], true);

			// Assert: All skills of the first map are returned
			const nodeIDs = graph.nodes.map(node => node.id).sort((a, b) => a.localeCompare(b));
			const nodeElements = graph.nodes
				.map(node => node.element)
				.sort((a, b) => a.id.localeCompare(b.id));
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
			const graph = await planer.getConnectedGraphForSkill(firstMap[0], true);

			// Assert: All skills of the first map and all LUs of the straight path are returned
			// Compare IDs
			const nodeIDs = graph.nodes.map(node => node.id).sort((a, b) => a.localeCompare(b));
			const expectedIDs = [
				...firstMap.map(skill => skill.id),
				...straightPathOfLus.map(lu => lu.id)
			].sort((a, b) => a.localeCompare(b));
			expect(nodeIDs).toEqual(expectedIDs);
			// Compare elements
			const nodeElements = graph.nodes
				.map(node => node.element)
				.sort((a, b) => a.id.localeCompare(b.id));
			const expectedElements = [...firstMap, ...straightPathOfLus].sort((a, b) =>
				a.id.localeCompare(b.id)
			);
			expect(nodeElements).toEqual(expectedElements);
		});
	});
});

class TestDataHandler implements LearningUnitProvider, SkillProvider {
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

	getSkillsByRepository(repositoryId: string): Promise<Skill[]> {
		return Promise.resolve(this.skillMaps.get(repositoryId));
	}

	getLearningUnitsBySkills(skillIds: string[]): Promise<LearningUnit[]> {
		return Promise.resolve(
			this.learningUnits.filter(lu => lu.teachingGoals.some(goal => skillIds.includes(goal)))
		);
	}
}
