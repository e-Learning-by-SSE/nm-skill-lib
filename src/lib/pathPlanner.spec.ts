import {
    LearningUnit,
    Skill,
    Graph,
    isCompositeGuard,
    Unit,
    CompositeUnit,
    isSkill,
    isLearningUnit,
    PotentialNode
} from "./types";
import {
    computeSuggestedSkills,
    getConnectedGraphForLearningUnit,
    getConnectedGraphForSkill,
    getPath,
    getPaths,
    getSkillAnalysis,
    isAcyclic
} from "./pathPlanner";
import { DefaultCostParameter } from "./fastDownward/fdTypes";

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
    // More learningUnits for multiple paths
    const multipleRequirementsOfLu: LearningUnit[] = [
        newLearningUnit(firstMap, "lu:10", [], ["sk:1"]),
        newLearningUnit(firstMap, "lu:11", [], ["sk:2"]),
        newLearningUnit(firstMap, "lu:12", ["sk:1", "sk:2"], ["sk:3"])
    ];

    describe("check learning unit type", () => {
        it("check learning unit", () => {
            const elements = [...firstMap, ...straightPathOfLus];

            // Check learning unit to be false
            expect(isLearningUnit(elements[0])).toBeFalsy();

            // Check learning unit to be true
            expect(isLearningUnit(elements[3])).toBeTruthy();
        });
    });

    describe("check skill type", () => {
        it("check skill", () => {
            const elements = [...firstMap, ...straightPathOfLus];

            // Check Skill to be true
            expect(isSkill(elements[0])).toBeTruthy();

            // Check Skill to be false
            expect(isSkill(elements[3])).toBeFalsy();
        });
    });

    describe("check cycles in learning units and skills ", () => {
        it("check cycles", () => {
            const elements = [...firstMap, ...straightPathOfLus];

            // Should be no cycles (false)
            expect(isAcyclic(thirdMapHierarchy, structuredPathOfLus)).toBeFalsy();
        });
    });

    describe("get paths", () => {
        const guard: isCompositeGuard<LearningUnit> = (
            element: Unit<LearningUnit>
        ): element is CompositeUnit<LearningUnit> => {
            return false;
        };

        it("find exactly one path", async () => {
            // Test: Compute path
            const path = getPath({
                skills: firstMap,
                learningUnits: straightPathOfLus,
                goal: [firstMap[2]],
                knowledge: [],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter
            });

            // Assert: find one path
            expect(path).toBeDefined();
        });

        it("find exactly one path without cost function", async () => {
            // Test: Compute path
            const path = getPath({
                skills: firstMap,
                learningUnits: straightPathOfLus,
                goal: [firstMap[2]],
                knowledge: [],
                isComposite: guard,
                costOptions: DefaultCostParameter
            });

            // Assert: find one path
            expect(path).toBeDefined();
        });

        it("No path found", async () => {
            // Test: Compute path
            const path = getPath({
                skills: thirdMap,
                learningUnits: straightPathOfLus,
                goal: [thirdMap[3]],
                knowledge: [],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter
            });

            // Assert: find one path
            expect(path).toBeNull();
        });

        it("find multiple paths", async () => {
            // Test: Compute path
            const paths = getPaths({
                skills: firstMap,
                learningUnits: [...straightPathOfLus, ...multipleRequirementsOfLu],
                goal: [firstMap[2]],
                knowledge: [],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter,
                alternatives: 2
            });

            // Assert: find one path
            expect(paths).toBeDefined();
            expect(paths?.length).toBeGreaterThan(1);
        });
    });

    describe("get skill analysis", () => {
        it("find one missing skill in a path", () => {
            const structuredPathOfLusMissingSk8: LearningUnit[] = [
                newLearningUnit(thirdMapHierarchy, "lu:7", [], ["sk:10"]),
                newLearningUnit(thirdMapHierarchy, "lu:8", [], ["sk:11"]),
                newLearningUnit(thirdMapHierarchy, "lu:9", ["sk:9"], [])
            ];

            // Test: Compute paths
            const analysis = getSkillAnalysis({
                goal: [
                    ...firstMap.filter(skill => skill.id === "sk:3"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:10"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:12")
                ],
                learningUnits: [...multipleRequirementsOfLu, ...structuredPathOfLusMissingSk8],
                skills: [...firstMap, ...thirdMapHierarchy],
                knowledge: []
            })!;

            const path = extractPath(analysis[0]);

            // Assert: Find missing skill:
            expect(analysis[0].missingSkill).toBe("sk:8");
            expect(path).toEqual(["sk:8", "sk:7"]);
        });
    });

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

    describe("computeSuggestedSkills", () => {
        const guard: isCompositeGuard<LearningUnit> = (
            element: Unit<LearningUnit>
        ): element is CompositeUnit<LearningUnit> => {
            return false;
        };

        it("Apply first constraints", async () => {
            // Compute default order and exchange first to positions
            const path = getPath({
                skills: thirdMapHierarchy,
                learningUnits: structuredPathOfLus,
                goal: thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
                knowledge: [],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter
            });

            if (path === null) {
                throw new Error("Path is null, but was not expected to be null");
            }

            path.path = [path.path[1], path.path[0], path.path[2]];

            structuredPathOfLus.sort((a, b) => {
                return (
                    path.path.map(partialPath => partialPath.origin).indexOf(a) -
                    path.path.map(partialPath => partialPath.origin).indexOf(b)
                );
            });

            // Test: Simulate
            await computeSuggestedSkills(
                structuredPathOfLus,
                async (lu: LearningUnit, missingSkills: string[]) => {
                    switch (lu.id) {
                        case path.path[0].origin!.id:
                            if (missingSkills.length > 0) {
                                throw new Error(
                                    "Must not compute any constraints for the first LU"
                                );
                            }
                            break;
                        case path.path[1].origin!.id:
                            expect(missingSkills).toEqual(
                                path.path[0].origin!.teachingGoals.map(skill => skill.id)
                            );
                            break;
                        case path.path[2].origin!.id:
                            expect(missingSkills).toEqual(
                                path.path[1].origin!.teachingGoals.map(skill => skill.id)
                            );
                            break;
                    }
                }
            );

            // Apply constraints
            await computeSuggestedSkills(
                structuredPathOfLus,
                async (lu: LearningUnit, missingSkills: string[]) => {
                    const suggestedSkills = missingSkills
                        .filter(skill => skill != undefined)
                        .map(skill => thirdMapHierarchy.find(s => s.id === skill))
                        .filter(skill => skill != undefined) as Skill[];

                    lu.suggestedSkills = suggestedSkills.map(skill => ({
                        weight: 1,
                        skill: skill
                    }));
                }
            );

            // Compute path with new constraints
            const changedPath = getPath({
                skills: thirdMapHierarchy,
                learningUnits: structuredPathOfLus,
                goal: thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
                knowledge: [],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter
            });

            if (changedPath === null) {
                throw new Error("Path is null, but was not expected to be null");
            }
            // Test: Verify that path has changed
            const pathLus = path.path.map(partialPath => partialPath.origin);
            const changedPathLus = changedPath.path.map(partialPath => partialPath.origin);

            expect(changedPathLus).toEqual(pathLus);
        });

        it("Repeating taught skills", async () => {
            const repeatingSkillsLus: LearningUnit[] = [
                newLearningUnit(thirdMap, "lu:1", [], ["sk:1", "sk:2"]),
                newLearningUnit(thirdMap, "lu:2", [], ["sk:2", "sk:3", "sk:4"]),
                newLearningUnit(thirdMap, "lu:3", [], ["sk:1", "sk:3", "sk:5"])
            ];

            // Test: Simulate
            await computeSuggestedSkills(
                repeatingSkillsLus,
                async (lu: LearningUnit, missingSkills: string[]) => {
                    switch (lu.id) {
                        case "lu:1":
                            if (missingSkills.length > 0) {
                                throw new Error(
                                    "Must not compute any constraints for the first LU"
                                );
                            }
                            break;
                        case "lu:2":
                            expect(missingSkills).toEqual(["sk:1"]);
                            break;
                        case "lu:3":
                            expect(missingSkills.sort()).toEqual(["sk:2", "sk:4"]);
                            break;
                    }
                }
            );
        });

        it("Apply constraints on empty learning unit list", async () => {
            const repeatingSkillsLus: LearningUnit[] = [];

            // Test: Simulate
            await computeSuggestedSkills(repeatingSkillsLus, async () => {});

            expect(repeatingSkillsLus).toEqual([]);
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

function extractPath(potentialPath: PotentialNode<LearningUnit>): string[] {
    return potentialPath.id ? [potentialPath.id].concat(extractPath(potentialPath.parent)) : [];
}
