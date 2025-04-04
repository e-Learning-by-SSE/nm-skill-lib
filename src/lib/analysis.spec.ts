import { detectCycles, findParentsOfCycledSkills } from "./analysis";
import { And } from "./ast/and";
import { Empty } from "./ast/empty";
import { Variable } from "./ast/variable";
import { LearningUnit, Skill } from "./types";

describe("find cycles analysis", () => {
    // Re-usable test data (must be passed to dataHandler.init() before each test)
    // Skills sorted by IDs to simplify comparisons during tests
    // Flat map
    const firstMap: Skill[] = [
        { id: "sk:1", children: [] },
        { id: "sk:2", children: [] },
        { id: "sk:3", children: [] }
    ].sort((a, b) => a.id.localeCompare(b.id));

    describe("detectCycles", () => {
        /**
         * Tests:
         * Empty skills list
         */
        it("Empty skills list -> No Cycles", () => {
            const structuredMap: Skill[] = [];

            const cycles = detectCycles(structuredMap);
            expect(cycles).toEqual([]);
        });

        /**
         * Tests:
         * SK1 -> SK2 -> SK4 has no cycles
         */
        it("Tree of Skills -> OK", () => {
            const structuredMap: Skill[] = [
                { id: "sk:1", children: ["sk:2", "sk:3"] },
                { id: "sk:2", children: ["sk:4", "sk:5"] },
                { id: "sk:3", children: [] },
                { id: "sk:4", children: [] },
                { id: "sk:5", children: [] }
            ];

            const cycles = detectCycles(structuredMap);
            expect(cycles).toEqual([]);
        });

        /**
         * Tests:
         * SK1 -> SK2 -> SK4 -> SK1 has a cycle
         */
        it("Cycle of Skills -> Cycle", () => {
            const structuredMap: Skill[] = [
                { id: "sk:1", children: ["sk:2", "sk:3"] },
                { id: "sk:2", children: ["sk:4", "sk:5"] },
                { id: "sk:3", children: [] },
                { id: "sk:4", children: ["sk:1"] },
                { id: "sk:5", children: [] }
            ];

            const cycles = detectCycles(structuredMap);
            expect(cycles.length).toEqual(1);

            const expectedIDs = ["sk:1", "sk:2", "sk:4"];
            const expected = structuredMap
                .filter(skill => expectedIDs.includes(skill.id))
                .sort((a, b) => a.id.localeCompare(b.id));
            cycles[0] = (cycles[0] as Skill[]).sort((a, b) => a.id.localeCompare(b.id));
            expect(cycles).toEqual([expected]);
        });

        /**
         * Tests:
         * {} -> LU1 -> SK1 -> LU2 -> SK2 -> LU3 -> SK3 has no cycles
         */
        it("Cycle-free LearningUnits -> OK", () => {
            const skillMap: Skill[] = [
                { id: "sk:1", children: [] },
                { id: "sk:2", children: [] },
                { id: "sk:3", children: [] }
            ];

            const learningUnits: LearningUnit[] = [
                newLearningUnit(firstMap, "lu:1", [], ["sk:1"]),
                newLearningUnit(firstMap, "lu:2", ["sk:1"], ["sk:2"]),
                newLearningUnit(firstMap, "lu:3", ["sk:2"], ["sk:3"])
            ];

            const cycles = detectCycles(skillMap, learningUnits);
            expect(cycles).toEqual([]);
        });

        /**
         * Tests:
         * SK3 -> LU1 -> SK1 -> LU2 -> SK2 -> LU3 -> SK3 has a cycle
         */
        it("Flat cycle of LearningUnits -> Cycle", () => {
            const skillMap: Skill[] = [
                { id: "sk:1", children: [] },
                { id: "sk:2", children: [] },
                { id: "sk:3", children: [] }
            ];

            const learningUnits: LearningUnit[] = [
                newLearningUnit(firstMap, "lu:1", ["sk:3"], ["sk:1"]),
                newLearningUnit(firstMap, "lu:2", ["sk:1"], ["sk:2"]),
                newLearningUnit(firstMap, "lu:3", ["sk:2"], ["sk:3"])
            ];

            const cycles = detectCycles(skillMap, learningUnits);
            expect(cycles.length).toEqual(1);

            // All elements are affected (Skills & LUs)
            const affectedIds = cycles[0].map(elem => elem.id).sort((a, b) => a.localeCompare(b));
            const expectedIds = [...skillMap, ...learningUnits]
                .map(elem => elem.id)
                .sort((a, b) => a.localeCompare(b));
            expect(affectedIds).toEqual(expectedIds);
        });

        /**
         * Tests
         * Child -> LU1 -> Parent has no cycles
         */
        it("Nested Skill required to learn parent Skill -> OK", () => {
            const structuredMap: Skill[] = [
                { id: "sk:1", children: ["sk:2", "sk:3"] },
                { id: "sk:2", children: [] },
                { id: "sk:3", children: [] }
            ];

            const learningUnits: LearningUnit[] = [
                newLearningUnit(firstMap, "lu:1", ["sk:2"], ["sk:1"])
            ];

            const cycles = detectCycles(structuredMap, learningUnits);
            expect(cycles).toEqual([]);
        });

        /**
         * Tests
         * Parent -> LU1 -> Child has a cycle
         */
        it("Parent Skill required to learn nested Skill -> Cycle", () => {
            const structuredMap: Skill[] = [
                { id: "sk:1", children: ["sk:2", "sk:3"] },
                { id: "sk:2", children: [] },
                { id: "sk:3", children: [] }
            ];

            const learningUnits: LearningUnit[] = [
                newLearningUnit(firstMap, "lu:1", ["sk:1"], ["sk:2"])
            ];

            const cycles = detectCycles(structuredMap, learningUnits);
            expect(cycles.length).toEqual(1);

            // All elements are affected, except for SK3
            const affectedIds = cycles[0].map(elem => elem.id).sort((a, b) => a.localeCompare(b));
            const expectedIds = [
                ...structuredMap.filter(skill => skill.id !== "sk:3"),
                ...learningUnits
            ]
                .map(elem => elem.id)
                .sort((a, b) => a.localeCompare(b));
            expect(affectedIds).toEqual(expectedIds);
        });

        it("Suggested Skill without Cycle -> OK", () => {
            const skillMap: Skill[] = [
                { id: "sk:1", children: [] },
                { id: "sk:2", children: [] },
                { id: "sk:3", children: [] }
            ];

            const learningUnits: LearningUnit[] = [
                newLearningUnit(firstMap, "lu:1", ["sk:1"], ["sk:2"]),
                newLearningUnit(
                    firstMap,
                    "lu:2",
                    ["sk:2"],
                    ["sk:3"],
                    [{ weight: 0.1, skill: "sk:1" }]
                )
            ];

            const cycles = detectCycles(skillMap, learningUnits);
            expect(cycles).toEqual([]);
        });

        it("Suggested Skill with Cycle -> Cycle", () => {
            const skillMap: Skill[] = [
                { id: "sk:1", children: [] },
                { id: "sk:2", children: [] },
                { id: "sk:3", children: [] }
            ];

            const learningUnits: LearningUnit[] = [
                newLearningUnit(
                    skillMap,
                    "lu:1",
                    ["sk:1"],
                    ["sk:2"],
                    [{ weight: 0.1, skill: "sk:3" }]
                ),
                newLearningUnit(skillMap, "lu:2", ["sk:2"], ["sk:3"])
            ];

            const cycles = detectCycles(skillMap, learningUnits);
            expect(cycles.length).toEqual(1);

            // All elements are affected, except for SK1
            const affectedIds = cycles[0].map(elem => elem.id).sort((a, b) => a.localeCompare(b));
            const expectedIds = [...skillMap.filter(skill => skill.id !== "sk:1"), ...learningUnits]
                .map(elem => elem.id)
                .sort((a, b) => a.localeCompare(b));
            expect(affectedIds).toEqual(expectedIds);
        });
    });

    describe("findParentsOfCycledSkills", () => {
        it("No cycle -> null", () => {
            const skillMap: Skill[] = [
                { id: "sk:1", children: [] },
                { id: "sk:2", children: ["sk:1"] },
                { id: "sk:3", children: ["sk:2"] }
            ];

            const cycles = findParentsOfCycledSkills(skillMap);
            expect(cycles).toEqual(null);
        });

        it("Cycle with one parent -> parent", () => {
            /**
             * Cycle: sk:2 -> sk:4
             * Parent: sk:1
             */
            const skillMap: Skill[] = [
                { id: "sk:1", children: ["sk:2", "sk:3"] },
                { id: "sk:2", children: ["sk:4"] },
                { id: "sk:3", children: [] },
                { id: "sk:4", children: ["sk:2"] }
            ];

            const cycles = findParentsOfCycledSkills(skillMap);
            expect(cycles).not.toBeNull();

            const cycledSkills = cycles!.cycles
                .flatMap(cycle => cycle.map(skill => skill.id))
                .sort();
            expect(cycledSkills).toEqual(["sk:2", "sk:4"]);
            expect(cycles!.nestingSkills.map(skill => skill.id)).toEqual(["sk:1"]);
        });

        it("Cycle with multiple parents -> parents", () => {
            /**
             * Cycle: sk:2 -> sk:5 -> sk:8
             * Parents: sk:1, sk:9, sk:11, sk:12
             */
            const skillMap: Skill[] = [
                // First tree with parent: sk:1
                { id: "sk:1", children: ["sk:2", "sk:3", "sk:4"] },
                { id: "sk:2", children: ["sk:5", "sk:6"] },
                { id: "sk:3", children: [] },
                { id: "sk:4", children: ["sk:7"] },
                { id: "sk:5", children: ["sk:8"] },
                { id: "sk:6", children: [] },
                { id: "sk:7", children: [] },
                { id: "sk:8", children: ["sk:2"] },
                // Second tree with parent: sk:9
                { id: "sk:9", children: ["sk:10", "sk:11"] },
                { id: "sk:10", children: [] },
                { id: "sk:11", children: ["sk:12"] },
                { id: "sk:12", children: ["sk:8"] }
            ];

            const cycles = findParentsOfCycledSkills(skillMap);
            expect(cycles).not.toBeNull();

            const cycledSkills = cycles!.cycles
                .flatMap(cycle => cycle.map(skill => skill.id))
                .sort();
            expect(cycledSkills).toEqual(["sk:2", "sk:5", "sk:8"]);
            expect(cycles!.nestingSkills.map(skill => skill.id).sort()).toEqual([
                "sk:1",
                "sk:11",
                "sk:12",
                "sk:9"
            ]);
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
