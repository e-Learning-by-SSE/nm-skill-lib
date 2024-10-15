import { LearningUnit, Skill, Graph, Path } from "./types";
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
        it("Only skills available; no nested skills -> return all skills of the same map", () => {
            // Test: Compute graph
            const graph = getConnectedGraphForSkill(firstMap);

            // Assert: All skills of the first map are returned
            const [nodeIDs, nodeElements] = extractElements(graph);
            // Compare IDs
            expect(nodeIDs).toEqual(firstMap.map(skill => skill.id));
            // Compare elements
            expect(nodeElements).toEqual(firstMap);
        });

        it("Only skills available; nested skills -> return all skills of the same map", () => {
            // Test: Compute graph
            const graph = getConnectedGraphForSkill(thirdMapHierarchy);

            // Assert: All skills of the third map are returned
            const [nodeIDs, nodeElements] = extractElements(graph);
            // Compare IDs
            expect(nodeIDs).toEqual(thirdMapHierarchy.map(skill => skill.id));
            // Compare elements
            expect(nodeElements).toEqual(thirdMapHierarchy);
        });

        it("Skills & LearningUnits available; no nested skills -> return all skills of the same map", () => {
            // Test: Compute graph
            const graph = getConnectedGraphForSkill(firstMap);

            // Assert: All skills of the first map are returned
            const [nodeIDs, nodeElements] = extractElements(graph);
            // Compare IDs
            expect(nodeIDs).toEqual(firstMap.map(skill => skill.id));
            // Compare elements
            expect(nodeElements).toEqual(firstMap);
        });
    });

    describe("getConnectedGraphForSkill - Skills & LearningUnits", () => {
        it("Only skills available; no nested skills -> return all skills of the same map", () => {
            // Test: Compute graph
            const graph = getConnectedGraphForSkill(firstMap);

            // Assert: All skills of the first map are returned
            const [nodeIDs, nodeElements] = extractElements(graph);
            // Compare IDs
            expect(nodeIDs).toEqual(firstMap.map(skill => skill.id));
            // Compare elements
            expect(nodeElements).toEqual(firstMap);
        });

        it("Skills & LearningUnits using Skills of the same repository; no nested skills -> return all skills and LearningUnits", async () => {
            // Test: Compute graph
            const graph = getConnectedGraphForLearningUnit(straightPathOfLus, firstMap);

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
            const graph = getConnectedGraphForLearningUnit(straightPathOfLus, firstMap);

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
        throw new Error(
            `Path is null, but there was at least one path expected: ${expectedPaths[0]}`
        );
    }

    const pathIds = path.path.map(lu => lu.id);
    const pathIsValid = expectedPaths.some(expectedPath =>
        pathIds.every((id, index) => id === expectedPath[index])
    );

    if (!pathIsValid) {
        // Return one wrong result
        expect(pathIds).toEqual(expectedPaths[0]);
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
