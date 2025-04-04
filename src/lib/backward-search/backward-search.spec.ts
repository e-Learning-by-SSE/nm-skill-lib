import { Graph } from "@dagrejs/graphlib";
import { LearningUnit, PotentialNode, Skill } from "../types";
import { createGoalsGraph, filterForUnitsAndSkills, skillAnalysis } from "./backward-search";
import { And } from "../ast/and";
import { Variable } from "../ast/variable";
import { Empty } from "../ast/empty";

describe("Backward Search Tests", () => {
    describe("a graph for a goal(s)", () => {
        const firstMap: Skill[] = [
            { id: "sk:1", children: [] },
            { id: "sk:2", children: [] },
            { id: "sk:3", children: [] }
        ].sort((a, b) => a.id.localeCompare(b.id));
        // Skills with nested skills
        const thirdMapHierarchy: Skill[] = [
            { id: "sk:7", children: ["sk:8"] },
            { id: "sk:8", children: [] },
            { id: "sk:9", children: ["sk:10", "sk:11"] },
            { id: "sk:10", children: ["sk:12"] },
            { id: "sk:11", children: [] },
            { id: "sk:12", children: [] }
        ].sort((a, b) => a.id.localeCompare(b.id));
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

        it("build a graph for a goal", () => {
            // Test: Compute paths
            const graph = createGoalsGraph(
                [...firstMap.filter(skill => skill.id === "sk:3")],
                [...firstMap, ...thirdMapHierarchy],
                [...multipleRequirementsOfLu, ...structuredPathOfLus]
            );

            const units = graph.nodes().filter(node => node.startsWith("lu"));
            const skills = graph.nodes().filter(node => node.startsWith("sk"));
            // Assert: graph:
            expect(graph.nodeCount()).toBe(6);
            expect(units.length).toBe(3);
            expect(skills.length).toBe(3);
        });

        it("build a graph for a goal with user knowledge", () => {
            // Test: Compute paths
            const graph = createGoalsGraph(
                [...thirdMapHierarchy.filter(skill => skill.id === "sk:7")],
                [...firstMap, ...thirdMapHierarchy],
                [...multipleRequirementsOfLu, ...structuredPathOfLus],
                [...thirdMapHierarchy.filter(skill => skill.id === "sk:9")]
            );

            const units = graph.nodes().filter(node => node.startsWith("lu"));
            const skills = graph.nodes().filter(node => node.startsWith("sk"));
            // Assert: graph:
            expect(graph.nodeCount()).toBe(4);
            expect(units.length).toBe(1);
            expect(skills.length).toBe(3);
        });

        it("check starting and ending nodes in a graph for a goal", () => {
            // Test: Compute paths
            const graph = createGoalsGraph(
                [...firstMap.filter(skill => skill.id === "sk:3")],
                [...firstMap, ...thirdMapHierarchy],
                [...multipleRequirementsOfLu, ...structuredPathOfLus]
            );

            // Assert: graph starting node for a goal skill:
            expect(graph.sources().length).toBe(1);
            // Assert: graph ending node:
            expect(graph.sinks().length).toBe(2);
        });

        it("trace a graph for a goal, from start to end", () => {
            // Test: Compute paths
            const graph = createGoalsGraph(
                [...firstMap.filter(skill => skill.id === "sk:3")],
                [...firstMap, ...thirdMapHierarchy],
                [...multipleRequirementsOfLu, ...structuredPathOfLus]
            );

            const expectedGraph: GraphNode = {
                name: "sk:3",
                next: [
                    {
                        name: "lu:12",
                        next: [
                            { name: "sk:1", next: [{ name: "lu:10", next: [] }] },
                            { name: "sk:2", next: [{ name: "lu:11", next: [] }] }
                        ]
                    }
                ]
            };

            // Assert: tracing graph node:
            expect(checkGraph(graph, expectedGraph)).toBeTruthy();
        });
    });

    describe("missing skills test", () => {
        const firstMap: Skill[] = [
            { id: "sk:1", children: [] },
            { id: "sk:2", children: [] },
            { id: "sk:3", children: [] }
        ].sort((a, b) => a.id.localeCompare(b.id));
        // Flat map, but longer (no conflict with Map1 as they are from a different repository)
        const thirdMap: Skill[] = [
            { id: "sk:1", children: [] },
            { id: "sk:2", children: [] },
            { id: "sk:3", children: [] },
            { id: "sk:4", children: [] },
            { id: "sk:5", children: [] }
        ].sort((a, b) => a.id.localeCompare(b.id));
        // Skills with nested skills
        const thirdMapHierarchy: Skill[] = [
            { id: "sk:7", children: ["sk:8"] },
            { id: "sk:8", children: [] },
            { id: "sk:9", children: ["sk:10", "sk:11"] },
            { id: "sk:10", children: ["sk:12"] },
            { id: "sk:11", children: [] },
            { id: "sk:12", children: [] }
        ].sort((a, b) => a.id.localeCompare(b.id));
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

        it("Find one missing skill", () => {
            const structuredPathOfLusMissingSk8: LearningUnit[] = [
                newLearningUnit(thirdMapHierarchy, "lu:7", [], ["sk:10"]),
                newLearningUnit(thirdMapHierarchy, "lu:8", [], ["sk:11"]),
                newLearningUnit(thirdMapHierarchy, "lu:9", ["sk:9"], [])
            ];

            // Test: Compute paths
            const analysis = skillAnalysis(
                [
                    ...firstMap.filter(skill => skill.id === "sk:3"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:10"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:12")
                ],
                [...multipleRequirementsOfLu, ...structuredPathOfLusMissingSk8],
                [...firstMap, ...thirdMapHierarchy],
                []
            );

            const analysisPath = analysis[0].path.map(unit => unit.id);

            // Assert: Find missing skill:
            expect(analysis[0].missingSkill).toBe("sk:8");
            expect(analysis[0].fullPath).toStrictEqual(["sk:8", "sk:7"]);
            expect(analysisPath).toStrictEqual([]);
        });

        it("No missing skill", () => {
            // Test: Analyze skill
            const analysis = skillAnalysis(
                [
                    ...firstMap.filter(skill => skill.id === "sk:3"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:10"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:12")
                ],
                [...multipleRequirementsOfLu, ...structuredPathOfLus],
                [...firstMap, ...thirdMapHierarchy],
                []
            );

            // Assert: Find no missing skill:
            expect(analysis.length).toBe(0);
        });

        it("Analysis one missing skill", () => {
            const multipleRequirementsOfLuMissingSk2: LearningUnit[] = [
                newLearningUnit(firstMap, "lu:10", [], ["sk:1"]),
                newLearningUnit(firstMap, "lu:11", [], []),
                newLearningUnit(firstMap, "lu:12", ["sk:1", "sk:2"], ["sk:3"])
            ];

            // Test: Analyze skill
            const analysis = skillAnalysis(
                [
                    ...firstMap.filter(skill => skill.id === "sk:3"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:10"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:12")
                ],
                [...multipleRequirementsOfLuMissingSk2, ...structuredPathOfLus],
                [...firstMap, ...thirdMapHierarchy],
                []
            );

            const analysisPath = analysis[0].path.map(unit => unit.id);

            // Assert: Finds missing skill and nested skills:
            expect(analysis.length).toBeGreaterThan(0);
            expect(analysis[0].missingSkill).toBe("sk:2");
            expect(analysis[0].fullPath).toStrictEqual(["sk:2", "lu:12", "sk:3"]);
            expect(analysisPath).toStrictEqual(["lu:12"]);
        });

        it("Analysis missing skills and nested skills", () => {
            const structuredPathOfLusMissingSk10: LearningUnit[] = [
                newLearningUnit(thirdMapHierarchy, "lu:7", [], []),
                newLearningUnit(thirdMapHierarchy, "lu:8", [], ["sk:11"]),
                newLearningUnit(thirdMapHierarchy, "lu:9", ["sk:9"], ["sk:8"])
            ];

            // Test: Analyze skill
            const analysis = skillAnalysis(
                [
                    ...firstMap.filter(skill => skill.id === "sk:3"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:10"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:12")
                ],
                [...multipleRequirementsOfLu, ...structuredPathOfLusMissingSk10],
                [...firstMap, ...thirdMapHierarchy],
                []
            );

            const analysisPath = analysis[0].path.map(unit => unit.id);

            // Assert: Finds missing skill and nested skills:
            expect(analysis.length).toBeGreaterThan(0);
            expect(analysis[0].missingSkill).toBe("sk:12");
            expect(analysis[0].fullPath).toStrictEqual([
                "sk:12",
                "sk:10",
                "sk:9",
                "lu:9",
                "sk:8",
                "sk:7"
            ]);
            expect(analysisPath).toStrictEqual(["lu:9"]);
        });

        it("Analysis missing skills with a sub paths", () => {
            const multipleRequirementsOfLuMissingSk1: LearningUnit[] = [
                newLearningUnit(thirdMap, "lu:10", [], []),
                newLearningUnit(thirdMap, "lu:11", [], ["sk:2"]),
                newLearningUnit(thirdMap, "lu:12", ["sk:1", "sk:2"], ["sk:3"]),
                newLearningUnit(thirdMap, "lu:13", ["sk:3"], ["sk:4"]),
                newLearningUnit(thirdMap, "lu:14", ["sk:4"], ["sk:5"])
            ];

            // Test: Analyze skill
            const analysis = skillAnalysis(
                [...thirdMap.filter(skill => skill.id === "sk:5")],
                [...multipleRequirementsOfLuMissingSk1],
                [...thirdMap],
                []
            );

            const analysisPath = analysis[0].path.map(unit => unit.id);

            // Assert: Finds missing skill with sub path:
            expect(analysis.length).toBeGreaterThan(0);
            expect(analysis[0].missingSkill).toBe("sk:1");
            expect(analysis[0].fullPath).toStrictEqual([
                "sk:1",
                "lu:12",
                "sk:3",
                "lu:13",
                "sk:4",
                "lu:14",
                "sk:5"
            ]);
            expect(analysisPath).toStrictEqual(["lu:12", "lu:13", "lu:14"]);
        });

        it("Analysis missing skills with nested skills", () => {
            const thirdNestedMap: Skill[] = [
                { id: "sk:1", children: [] },
                { id: "sk:2", children: [] },
                { id: "sk:3", children: [] },
                { id: "sk:4", children: ["sk:1", "sk:2", "sk:6"] },
                { id: "sk:5", children: ["sk:4", "sk:3"] },
                { id: "sk:6", children: [] }
            ].sort((a, b) => a.id.localeCompare(b.id));

            const multipleRequirementsOfLuNested: LearningUnit[] = [
                newLearningUnit(thirdNestedMap, "lu:10", [], ["sk:1"]),
                newLearningUnit(thirdNestedMap, "lu:11", [], ["sk:2"]),
                newLearningUnit(thirdNestedMap, "lu:12", ["sk:1", "sk:2"], ["sk:3"])
            ];

            // Test: Analyze skill
            const analysis = skillAnalysis(
                [...thirdNestedMap.filter(skill => skill.id === "sk:5")],
                [...multipleRequirementsOfLuNested],
                [...thirdNestedMap],
                []
            );

            const analysisPath = analysis[0].path.map(unit => unit.id);

            // Assert: Finds missing skill with nested skills:
            expect(analysis.length).toBeGreaterThan(0);
            expect(analysis[0].missingSkill).toBe("sk:6");
            expect(analysis[0].fullPath).toStrictEqual(["sk:6", "sk:4", "sk:5"]);
            expect(analysisPath).toStrictEqual([]);
        });

        it("Analysis missing skills with multiple nested skills", () => {
            const thirdNestedMap: Skill[] = [
                { id: "sk:1", children: [] },
                { id: "sk:2", children: [] },
                { id: "sk:3", children: [] },
                { id: "sk:4", children: [] },
                { id: "sk:5", children: [] },
                { id: "sk:6", children: ["sk:7", "sk:9"] },
                { id: "sk:7", children: ["sk:13", "sk:9"] },
                { id: "sk:8", children: ["sk:6", "sk:2"] },
                { id: "sk:9", children: ["sk:1", "sk:4"] },
                { id: "sk:13", children: [] }
            ].sort((a, b) => a.id.localeCompare(b.id));

            const multipleRequirementsOfLuNested: LearningUnit[] = [
                newLearningUnit(thirdNestedMap, "lu:10", [], ["sk:1"]),
                newLearningUnit(thirdNestedMap, "lu:11", [], ["sk:2"]),
                newLearningUnit(thirdNestedMap, "lu:12", ["sk:1", "sk:2"], ["sk:3"]),
                newLearningUnit(thirdNestedMap, "lu:13", [], ["sk:4"]),
                newLearningUnit(thirdNestedMap, "lu:14", [], ["sk:5"])
            ];

            // Test: Analyze skill
            const analysis = skillAnalysis(
                [
                    ...thirdNestedMap.filter(skill => skill.id === "sk:4"),
                    ...thirdNestedMap.filter(skill => skill.id === "sk:8")
                ],
                [...multipleRequirementsOfLuNested],
                [...thirdNestedMap],
                []
            );

            const analysisPath = analysis[0].path.map(unit => unit.id);

            // Assert: Finds missing skill with nested skills:
            expect(analysis.length).toBeGreaterThan(0);
            expect(analysis[0].missingSkill).toBe("sk:13");
            expect(analysis[0].fullPath).toStrictEqual(["sk:13", "sk:7", "sk:6", "sk:8"]);
            expect(analysisPath).toStrictEqual([]);
        });
    });

    describe("Backward Search Tests", () => {
        const largeSkillMap: Skill[] = [];
        const largeLearningUnits: LearningUnit[] = [];

        for (let index = 1; index < 1001; index++) {
            largeSkillMap.push({ id: "sk:" + index, children: [] });
            largeLearningUnits.push(
                newLearningUnit(largeSkillMap, "lu:" + index, [], ["sk:" + index])
            );
        }

        for (let index = 1; index < 100; index++) {
            largeLearningUnits[index].requires = new Variable(largeSkillMap[index - 1]);
        }

        const parentSkillMap: Skill[] = [
            { id: "sk:1", children: [] },
            { id: "sk:2", children: [] },
            { id: "sk:3", children: [] },
            { id: "sk:4", children: [] },
            { id: "sk:5", children: [] },
            { id: "sk:6", children: ["sk:1", "sk:2"] },
            { id: "sk:7", children: ["sk:3", "sk:4"] },
            { id: "sk:8", children: [] },
            { id: "sk:9", children: [] },
            { id: "sk:10", children: [] },
            { id: "sk:11", children: [] },
            { id: "sk:12", children: [] }
        ].sort((a, b) => a.id.localeCompare(b.id));

        const parentLearningUnit: LearningUnit[] = [
            newLearningUnit(parentSkillMap, "lu:1", [], ["sk:1"]),
            newLearningUnit(parentSkillMap, "lu:2", [], ["sk:2"]),
            newLearningUnit(parentSkillMap, "lu:3", [], ["sk:3"]),
            newLearningUnit(parentSkillMap, "lu:4", [], ["sk:4"]),
            newLearningUnit(parentSkillMap, "lu:5", [], ["sk:5"]),
            newLearningUnit(parentSkillMap, "lu:8", ["sk:6", "sk:7"], ["sk:8"]),
            newLearningUnit(parentSkillMap, "lu:9", [], ["sk:9"]),
            newLearningUnit(parentSkillMap, "lu:10", ["sk:8"], ["sk:10"]),
            newLearningUnit(parentSkillMap, "lu:11", ["sk:8"], ["sk:11"]),
            newLearningUnit(parentSkillMap, "lu:12", ["sk:11", "sk:10"], ["sk:12"])
        ];

        it("filter learning units 'without knowledge'", () => {
            const goal = largeSkillMap.find(skill => skill.id === "sk:8")!;
            const knowledge: Skill[] = [];

            const [inScopeLearningUnits] = filterForUnitsAndSkills(
                [goal],
                largeLearningUnits,
                largeSkillMap,
                knowledge
            );

            expect(inScopeLearningUnits.length).toBe(8);
        });

        it("filter learning units 'with knowledge'", () => {
            const goal = largeSkillMap.filter(skill => skill.id === "sk:8");
            const knowledge = largeSkillMap.filter(skill => skill.id === "sk:4");

            const [inScopeLearningUnits] = filterForUnitsAndSkills(
                goal,
                largeLearningUnits,
                largeSkillMap,
                knowledge
            );

            expect(inScopeLearningUnits.length).toBe(4);
        });

        it("filter learning units with parent skills 'without knowledge'", () => {
            const goal = parentSkillMap.filter(skill => skill.id === "sk:8");
            const knowledge: Skill[] = [];
            const [inScopeLearningUnits] = filterForUnitsAndSkills(
                goal,
                parentLearningUnit,
                largeSkillMap,
                knowledge
            );

            expect(inScopeLearningUnits.length).toBe(5);
        });

        it("filter learning units with one parent skills 'with knowledge'", () => {
            const goal = parentSkillMap.filter(skill => skill.id === "sk:8");
            const knowledge = parentSkillMap.filter(skill => ["sk:2", "sk:4"].includes(skill.id));
            const [inScopeLearningUnits] = filterForUnitsAndSkills(
                goal,
                parentLearningUnit,
                largeSkillMap,
                knowledge
            );

            expect(inScopeLearningUnits.length).toBe(3);
        });

        it("filter learning units with nested parent skills 'without knowledge'", () => {
            const goal = parentSkillMap.filter(skill => skill.id === "sk:10");
            const knowledge: Skill[] = [];
            const [inScopeLearningUnits] = filterForUnitsAndSkills(
                goal,
                parentLearningUnit,
                largeSkillMap,
                knowledge
            );

            expect(inScopeLearningUnits.length).toBe(6);
        });

        it("filter learning units with same required skills 'without knowledge'", () => {
            const goal = parentSkillMap.filter(skill => skill.id === "sk:12");
            const knowledge: Skill[] = [];
            const [inScopeLearningUnits] = filterForUnitsAndSkills(
                goal,
                parentLearningUnit,
                largeSkillMap,
                knowledge
            );

            expect(inScopeLearningUnits.length).toBe(8);
        });
    });
});

function newLearningUnit(
    map: Skill[],
    id: string,
    requires: string[],
    provides: string[],
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

    const variables = map
        .filter(skill => requires.includes(skill.id))
        .map(skill => new Variable(skill));

    const skillExpression = variables.length > 0 ? new And(variables) : new Empty();

    return {
        id: id,
        requires: skillExpression,
        provides: map.filter(skill => provides.includes(skill.id)),
        suggestedSkills: suggestions
    };
}

export type GraphNode = {
    name: string;
    next: GraphNode[];
};

function checkGraph(graph: Graph, expectedGraph: GraphNode): boolean {
    const startingNode = graph.sources().at(0)!;

    const graphNode: GraphNode = buildGraph(startingNode, graph);

    if (JSON.stringify(graphNode) != JSON.stringify(expectedGraph)) {
        return false;
    }

    return true;
}

function buildGraph(nodeName: string, graph: Graph): GraphNode {
    const nextNodes = graph.successors(nodeName)!;
    const successors: GraphNode[] = [];

    nextNodes.forEach(node => {
        const newNode = buildGraph(node, graph);
        successors.push(newNode);
    });

    const graphNode: GraphNode = { name: nodeName.substring(2), next: successors };

    return graphNode;
}

function extractPath(potentialNode: PotentialNode<LearningUnit>): string[] {
    if (potentialNode.parent) {
        return [potentialNode.id].concat(extractPath(potentialNode.parent));
    } else {
        return [potentialNode.id];
    }
}
