import { LearningUnit, Skill, Path, isCompositeGuard, Unit, CompositeUnit } from "../types";

import { CostFunction, DefaultCostParameter } from "./fdTypes";
import { search } from "./fast-downward-new";

describe("FastDownward v2", () => {
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

    describe("pathForSkill", () => {
        const guard: isCompositeGuard<LearningUnit> = (
            element: Unit<LearningUnit>
        ): element is CompositeUnit<LearningUnit> => {
            return false;
        };
        it("No knowledge; 1 map; no nested skills; 1 goal", async () => {
            // Test: Compute path
            const path = search({
                allSkills: firstMap,
                allUnits: straightPathOfLus,
                goal: [firstMap[2]],
                knowledge: [],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter
            });

            // Assert: Path should be: 1 -> 2 -> 3
            const expectedIDs = straightPathOfLus
                .map(lu => lu.id)
                .sort((a, b) => a.localeCompare(b));
            expectPath(path, [expectedIDs], 3);
        });

        it("Intermediate knowledge; 1 map; no nested skills; 1 goal", async () => {
            // Test: Compute path
            const path = search({
                allSkills: firstMap,
                allUnits: straightPathOfLus,
                goal: [firstMap[2]],
                knowledge: [firstMap[1]],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter
            });

            // Assert: Path should be: 3 (as 2 is already known)
            const expectedIDs = [straightPathOfLus[2].id];
            expectPath(path, [expectedIDs], 1);
        });

        it("No knowledge; 1 map; with nested skills; 1 goal", async () => {
            // Test: Compute path
            const path = search({
                allSkills: thirdMapHierarchy,
                allUnits: structuredPathOfLus,
                goal: thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
                knowledge: [],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter
            });

            // Assert: Path should be: (7 & 8) -> 9
            expectPath(
                path,
                [
                    ["lu:7", "lu:8", "lu:9"],
                    ["lu:8", "lu:7", "lu:9"]
                ],
                3.2
            );
        });

        it("No knowledge; 1 map; no nested skills; multiple requirements for 1 LU; 1 goal", async () => {
            // Test: Compute path
            const path = search({
                allSkills: firstMap,
                allUnits: multipleRequirementsOfLu,
                goal: firstMap.filter(skill => skill.id === "sk:3"),
                knowledge: [],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter
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
            const path = search({
                allSkills: [...firstMap, ...thirdMapHierarchy],
                allUnits: [...multipleRequirementsOfLu, ...structuredPathOfLus],
                goal: [
                    ...firstMap.filter(skill => skill.id === "sk:3"),
                    ...thirdMapHierarchy.filter(skill => skill.id === "sk:8")
                ],
                knowledge: [],
                fnCost: () => 1,
                isComposite: guard,
                costOptions: DefaultCostParameter
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
                    ["lu:7", "lu:10", "lu:8", "lu:11", "lu:9", "lu:12"],
                    ["lu:8", "lu:11", "lu:10", "lu:12", "lu:7", "lu:9"],
                    ["lu:7", "lu:11", "lu:10", "lu:12", "lu:8", "lu:9"]
                ],
                6.2 // TODO SE: Should be 6, but parent of taught skills is not considered (should be fixable by means of conditions)
            );
        });

        it("No knowledge; 1 map; no nested skills; multiple paths; 1 goal; CostFunction", async () => {
            // Test data preparation
            const fnCost: CostFunction<LearningUnit & { lang: string }> = lu => {
                // Simulate that only english units can be understood, all others should be avoided
                return lu.lang === "en" ? 1 : Infinity;
            };

            // Test: Compute path
            const path = search({
                allSkills: thirdMap,
                allUnits: alternativeLanguagesOfLus,
                goal: thirdMap.filter(skill => skill.id === "sk:4"),
                knowledge: [],
                fnCost: fnCost,
                isComposite: guard,
                costOptions: DefaultCostParameter
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
            const path = search({
                allSkills: thirdMap,
                allUnits: alternativeCostsOfLus,
                goal: thirdMap.filter(skill => skill.id === "sk:3"),
                knowledge: [],
                fnCost: fnCost,
                isComposite: guard,
                costOptions: DefaultCostParameter
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
                const path = search({
                    allSkills: firstMap,
                    allUnits: suggestedOrderingOfLus,
                    goal: firstMap.filter(skill => skill.id === "sk:3"),
                    knowledge: [],
                    fnCost: () => 1,
                    isComposite: guard,
                    costOptions: DefaultCostParameter
                });

                // Assert: Path should be: lu:1 -> lu:3
                expectPath(path, [["lu:1", "lu:3"]], 2.2);
            });

            it("Include suggested skill -> Ensure Ordering", async () => {
                // Test: Compute path
                const path = search({
                    allSkills: firstMap,
                    allUnits: suggestedOrderingOfLus,
                    goal: firstMap.filter(skill => skill.id === "sk:3" || skill.id === "sk:2"),
                    knowledge: [],
                    fnCost: () => 1,
                    isComposite: guard,
                    costOptions: DefaultCostParameter
                });

                // Assert: Path should be: lu:1 -> lu:2 -> lu:3
                expectPath(path, [["lu:1", "lu:2", "lu:3"]], 3.2);
            });
        });

        // describe("Scenarios - DigiMedia", () => {
        //     let [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, ch11, ch12]: Skill[] = [];
        //     let digiMediaSkillMap: Skill[];
        //     let digiMediaLUs: LearningUnit[];
        //     // Maybe further alternatives possible, add them if necessary
        //     const expectedPathsOfChapter4 = [
        //         [
        //             "lu:22",
        //             "lu:1",
        //             "lu:2",
        //             "lu:3",
        //             "lu:4",
        //             "lu:6",
        //             "lu:7",
        //             "lu:8",
        //             "lu:12",
        //             "lu:23",
        //             "lu:24",
        //             "lu:25",
        //             "lu:26",
        //             "lu:27",
        //             "lu:28",
        //             "lu:29"
        //         ],
        //         [
        //             "lu:1",
        //             "lu:2",
        //             "lu:3",
        //             "lu:4",
        //             "lu:6",
        //             "lu:7",
        //             "lu:8",
        //             "lu:12",
        //             "lu:22",
        //             "lu:23",
        //             "lu:24",
        //             "lu:26",
        //             "lu:27",
        //             "lu:28",
        //             "lu:29",
        //             "lu:25"
        //         ],
        //         [
        //             "lu:24",
        //             "lu:22",
        //             "lu:1",
        //             "lu:2",
        //             "lu:3",
        //             "lu:4",
        //             "lu:6",
        //             "lu:7",
        //             "lu:8",
        //             "lu:12",
        //             "lu:23",
        //             "lu:25",
        //             "lu:26",
        //             "lu:27",
        //             "lu:28",
        //             "lu:29"
        //         ],
        //         [
        //             "lu:1",
        //             "lu:2",
        //             "lu:3",
        //             "lu:4",
        //             "lu:6",
        //             "lu:7",
        //             "lu:8",
        //             "lu:12",
        //             "lu:24",
        //             "lu:25",
        //             "lu:29",
        //             "lu:28",
        //             "lu:22",
        //             "lu:23",
        //             "lu:26",
        //             "lu:27"
        //         ],
        //         [
        //             "lu:1",
        //             "lu:2",
        //             "lu:3",
        //             "lu:4",
        //             "lu:6",
        //             "lu:7",
        //             "lu:22",
        //             "lu:8",
        //             "lu:12",
        //             "lu:23",
        //             "lu:28",
        //             "lu:26",
        //             "lu:27",
        //             "lu:29",
        //             "lu:24",
        //             "lu:25"
        //         ],
        //         [
        //             "lu:1",
        //             "lu:2",
        //             "lu:3",
        //             "lu:4",
        //             "lu:6",
        //             "lu:7",
        //             "lu:8",
        //             "lu:22",
        //             "lu:12",
        //             "lu:23",
        //             "lu:29",
        //             "lu:24",
        //             "lu:25",
        //             "lu:26",
        //             "lu:27",
        //             "lu:28"
        //         ],
        //         [
        //             "lu:1",
        //             "lu:2",
        //             "lu:3",
        //             "lu:4",
        //             "lu:6",
        //             "lu:7",
        //             "lu:8",
        //             "lu:12",
        //             "lu:24",
        //             "lu:22",
        //             "lu:28",
        //             "lu:25",
        //             "lu:29",
        //             "lu:23",
        //             "lu:26",
        //             "lu:27"
        //         ],
        //         [
        //             "lu:1",
        //             "lu:2",
        //             "lu:3",
        //             "lu:4",
        //             "lu:6",
        //             "lu:7",
        //             "lu:8",
        //             "lu:22",
        //             "lu:12",
        //             "lu:23",
        //             "lu:24",
        //             "lu:28",
        //             "lu:29",
        //             "lu:26",
        //             "lu:27",
        //             "lu:25"
        //         ]
        //     ];

        //     // Creation of many test objects in a collapsable function ;-)
        //     beforeAll(() => {
        //         // Create Skills 1-202
        //         const digiMediaSkills: Skill[] = [...Array(202).keys()].map(index => ({
        //             id: `sk:${index + 1}`,
        //             repositoryId: "1",
        //             nestedSkills: []
        //         }));
        //         ch1 = {
        //             id: "ch:1",
        //             repositoryId: "1",
        //             nestedSkills: [...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => `sk:${value}`)]
        //         };
        //         ch2 = {
        //             id: "ch:2",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[
        //                     13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
        //                     31, 32, 33, 34, 35, 36, 37, 38, 39
        //                 ].map(value => `sk:${value}`)
        //             ]
        //         };
        //         ch3 = {
        //             id: "ch:3",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51].map(
        //                     value => `sk:${value}`
        //                 )
        //             ]
        //         };
        //         ch4 = {
        //             id: "ch:4",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[
        //                     52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69,
        //                     70, 71, 72, 73, 74, 75, 76, 77
        //                 ].map(value => `sk:${value}`)
        //             ]
        //         };
        //         ch5 = {
        //             id: "ch:5",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91].map(
        //                     value => `sk:${value}`
        //                 )
        //             ]
        //         };
        //         ch6 = {
        //             id: "ch:6",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105].map(
        //                     value => `sk:${value}`
        //                 )
        //             ]
        //         };
        //         ch7 = {
        //             id: "ch:7",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[
        //                     106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
        //                     120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133,
        //                     134, 135, 136, 137
        //                 ].map(value => `sk:${value}`)
        //             ]
        //         };
        //         ch8 = {
        //             id: "ch:8",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150].map(
        //                     value => `sk:${value}`
        //                 )
        //             ]
        //         };
        //         ch9 = {
        //             id: "ch:9",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[151, 152, 153, 154, 155, 156, 157, 158, 159, 160].map(
        //                     value => `sk:${value}`
        //                 )
        //             ]
        //         };
        //         ch10 = {
        //             id: "ch:10",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[
        //                     161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174,
        //                     175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185
        //                 ].map(value => `sk:${value}`)
        //             ]
        //         };
        //         ch11 = {
        //             id: "ch:11",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[186, 187, 188, 189, 190, 191, 192, 193, 194].map(value => `sk:${value}`)
        //             ]
        //         };
        //         ch12 = {
        //             id: "ch:12",
        //             repositoryId: "1",
        //             nestedSkills: [
        //                 ...[195, 196, 197, 198, 199, 200, 201, 202].map(value => `sk:${value}`)
        //             ]
        //         };
        //         digiMediaSkillMap = [
        //             ...digiMediaSkills,
        //             ch1,
        //             ch2,
        //             ch3,
        //             ch4,
        //             ch5,
        //             ch6,
        //             ch7,
        //             ch8,
        //             ch9,
        //             ch10,
        //             ch11,
        //             ch12
        //         ];
        //         digiMediaLUs = [
        //             newLearningUnit(digiMediaSkillMap, "lu:1", [], ["sk:1", "sk:2"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:2", ["sk:2"], ["sk:3", "sk:4", "sk:5"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:3", ["sk:5"], ["sk:6", "sk:7", "sk:8"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:4", ["sk:8"], ["sk:9"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:5", ["sk:4"], ["sk:10"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:6", ["sk:9"], ["sk:11"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:7", ["sk:11"], ["sk:12"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:8",
        //                 ["sk:12"],
        //                 ["sk:13", "sk:14", "sk:15"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:9",
        //                 ["sk:13"],
        //                 ["sk:16", "sk:17", "sk:18"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:10",
        //                 ["sk:13"],
        //                 ["sk:19", "sk:20", "sk:21"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:11",
        //                 ["sk:13"],
        //                 ["sk:22", "sk:23", "sk:24"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:12",
        //                 ["sk:13"],
        //                 ["sk:25", "sk:26", "sk:27"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:13",
        //                 ["sk:11"],
        //                 ["sk:28", "sk:29", "sk:30"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:14", ["sk:25"], ["sk:31"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:15", ["sk:4"], ["sk:32", "sk:33"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:16", [], ["sk:34", "sk:35"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:17",
        //                 ["sk:7"],
        //                 ["sk:36", "sk:37", "sk:38", "sk:39"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:18", ["sk:4"], ["sk:40", "sk:41"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:19",
        //                 ["sk:41"],
        //                 ["sk:42", "sk:43", "sk:44", "sk:45"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:20",
        //                 ["sk:9"],
        //                 ["sk:46", "sk:47", "sk:48"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:21",
        //                 ["sk:47", "sk:41"],
        //                 ["sk:49", "sk:50", "sk:51"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:22",
        //                 [],
        //                 ["sk:52", "sk:53", "sk:54", "sk:55"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:23",
        //                 ["sk:25", "sk:52"],
        //                 ["sk:56", "sk:57", "sk:58", "sk:59", "sk:60"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:24", [], ["sk:61", "sk:62", "sk:63"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:25",
        //                 ["sk:27", "sk:63"],
        //                 ["sk:64", "sk:65"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:26",
        //                 ["sk:56"],
        //                 ["sk:66", "sk:67", "sk:68"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:27",
        //                 ["sk:66"],
        //                 ["sk:69", "sk:70", "sk:71", "sk:72"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:28", [], ["sk:73", "sk:74"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:29", [], ["sk:75", "sk:76", "sk:77"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:30",
        //                 ["sk:25", "sk:26"],
        //                 ["sk:78", "sk:79", "sk:80"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:31", ["sk:80"], ["sk:81", "sk:82"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:32",
        //                 ["sk:26"],
        //                 ["sk:83", "sk:84", "sk:85", "sk:86", "sk:87"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:33", ["sk:86"], ["sk:88", "sk:89"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:34", [], ["sk:90", "sk:91"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:35", [], ["sk:92", "sk:93", "sk:94"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:36",
        //                 ["sk:93"],
        //                 ["sk:95", "sk:96", "sk:97"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:37",
        //                 ["sk:95", "sk:96", "sk:97"],
        //                 ["sk:98", "sk:99", "sk:100"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:38",
        //                 ["sk:93", "sk:99"],
        //                 ["sk:101", "sk:102", "sk:103", "sk:104"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:39", ["sk:93"], ["sk:105"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:40",
        //                 ["sk:43"],
        //                 ["sk:106", "sk:107", "sk:108", "sk:109"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:41", ["sk:108"], ["sk:110", "sk:111"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:42",
        //                 ["sk:108"],
        //                 ["sk:112", "sk:113", "sk:114"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:43",
        //                 ["sk:108"],
        //                 ["sk:115", "sk:116", "sk:117", "sk:118", "sk:119"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:44",
        //                 ["sk:108"],
        //                 ["sk:120", "sk:121", "sk:122"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:45",
        //                 ["sk:108"],
        //                 ["sk:123", "sk:124", "sk:125"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:46",
        //                 ["sk:108"],
        //                 ["sk:126", "sk:127", "sk:128", "sk:129"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:47",
        //                 ["sk:108"],
        //                 ["sk:130", "sk:131", "sk:132", "sk:133"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:48",
        //                 ["sk:108"],
        //                 ["sk:134", "sk:135", "sk:136", "sk:137"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:49", [], ["sk:138", "sk:139"]),
        //             newLearningUnit(digiMediaSkillMap, "lu:50", [], ["sk:140", "sk:141", "sk:142"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:51",
        //                 [],
        //                 ["sk:143", "sk:144", "sk:145", "sk:146"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:52",
        //                 [],
        //                 ["sk:147", "sk:148", "sk:149", "sk:150"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:53",
        //                 ["sk:146"],
        //                 ["sk:151", "sk:152", "sk:153"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:54",
        //                 ["sk:151"],
        //                 ["sk:154", "sk:155", "sk:156", "sk:157"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:55",
        //                 ["sk:154"],
        //                 ["sk:158", "sk:159", "sk:160"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:56", [], ["sk:161", "sk:162"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:57",
        //                 [],
        //                 ["sk:163", "sk:164", "sk:165", "sk:166"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:58",
        //                 ["sk:161"],
        //                 ["sk:167", "sk:168", "sk:169"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:59",
        //                 ["sk:161", "sk:167"],
        //                 ["sk:170", "sk:171", "sk:172"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:60",
        //                 ["sk:161"],
        //                 ["sk:173", "sk:174", "sk:175", "sk:176"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:61",
        //                 ["sk:161"],
        //                 ["sk:177", "sk:178", "sk:179", "sk:180"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:62", ["sk:161"], ["sk:181", "sk:182"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:63",
        //                 ["sk:161"],
        //                 ["sk:183", "sk:184", "sk:185"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:64", [], ["sk:186", "sk:187"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:65",
        //                 ["sk:186"],
        //                 ["sk:188", "sk:189", "sk:190"]
        //             ),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:66",
        //                 ["sk:190"],
        //                 ["sk:191", "sk:192", "sk:193"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:67", ["sk:193"], ["sk:194"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:68",
        //                 ["sk:12"],
        //                 ["sk:195", "sk:196", "sk:197"]
        //             ),
        //             newLearningUnit(digiMediaSkillMap, "lu:69", ["sk:197"], ["sk:198", "sk:199"]),
        //             newLearningUnit(
        //                 digiMediaSkillMap,
        //                 "lu:70",
        //                 ["sk:198"],
        //                 ["sk:200", "sk:201", "sk:202"]
        //             )
        //         ];
        //     });

        //     it("Greedy path for Chapter 4", async () => {
        //         const path = getPath({
        //             skills: digiMediaSkillMap,
        //             learningUnits: digiMediaLUs,
        //             goal: [ch4],
        //             optimalSolution: false,
        //             contextSwitchPenalty: 1.2
        //         });

        //         expect(path!.cost).toBe(19);
        //         expectPath(path, expectedPathsOfChapter4, 19);
        //     });

        //     it("Optimal path for Chapter 4", async () => {
        //         const path = getPath({
        //             skills: digiMediaSkillMap,
        //             learningUnits: digiMediaLUs,
        //             goal: [ch4],
        //             optimalSolution: true,
        //             contextSwitchPenalty: 1.2
        //         });

        //         expect(path!.cost).toBe(19);
        //         expectPath(path, expectedPathsOfChapter4, 19);
        //     });
        // });
    });

    // describe("computeSuggestedSkills", () => {
    //     it("Apply first constraints", async () => {
    //         // Compute default order and exchange first to positions
    //         const path = getPath({
    //             skills: thirdMapHierarchy,
    //             learningUnits: structuredPathOfLus,
    //             goal: thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
    //             optimalSolution: true,
    //             contextSwitchPenalty: 1
    //         });

    //         if (path === null) {
    //             throw new Error("Path is null, but was not expected to be null");
    //         }

    //         path.path = [path.path[1], path.path[0], path.path[2]];

    //         structuredPathOfLus.sort((a, b) => {
    //             return path.path.indexOf(a) - path.path.indexOf(b);
    //         });

    //         // Test: Simulate
    //         await computeSuggestedSkills(
    //             structuredPathOfLus,
    //             async (lu: LearningUnit, missingSkills: string[]) => {
    //                 switch (lu.id) {
    //                     case path.path[0].id:
    //                         if (missingSkills.length > 0) {
    //                             throw new Error(
    //                                 "Must not compute any constraints for the first LU"
    //                             );
    //                         }
    //                         break;
    //                     case path.path[1].id:
    //                         expect(missingSkills).toEqual(
    //                             path.path[0].teachingGoals.map(skill => skill.id)
    //                         );
    //                         break;
    //                     case path.path[2].id:
    //                         expect(missingSkills).toEqual(
    //                             path.path[1].teachingGoals.map(skill => skill.id)
    //                         );
    //                         break;
    //                 }
    //             }
    //         );

    //         // Apply constraints
    //         await computeSuggestedSkills(
    //             structuredPathOfLus,
    //             async (lu: LearningUnit, missingSkills: string[]) => {
    //                 const suggestedSkills = missingSkills
    //                     .filter(skill => skill != undefined)
    //                     .map(skill => thirdMapHierarchy.find(s => s.id === skill))
    //                     .filter(skill => skill != undefined) as Skill[];

    //                 lu.suggestedSkills = suggestedSkills.map(skill => ({
    //                     weight: 1,
    //                     skill: skill
    //                 }));
    //             }
    //         );

    //         // Compute path with new constraints
    //         const changedPath = getPath({
    //             skills: thirdMapHierarchy,
    //             learningUnits: structuredPathOfLus,
    //             goal: thirdMapHierarchy.filter(skill => skill.id === "sk:8"),
    //             optimalSolution: true,
    //             contextSwitchPenalty: 1
    //         });

    //         if (changedPath === null) {
    //             throw new Error("Path is null, but was not expected to be null");
    //         }

    //         // Test: Verify that path has changed
    //         expect(changedPath.path).toEqual(path.path);
    //     });

    //     it("Repeating taught skills", async () => {
    //         const repeatingSkillsLus: LearningUnit[] = [
    //             newLearningUnit(thirdMap, "lu:1", [], ["sk:1", "sk:2"]),
    //             newLearningUnit(thirdMap, "lu:2", [], ["sk:2", "sk:3", "sk:4"]),
    //             newLearningUnit(thirdMap, "lu:3", [], ["sk:1", "sk:3", "sk:5"])
    //         ];

    //         // Test: Simulate
    //         await computeSuggestedSkills(
    //             repeatingSkillsLus,
    //             async (lu: LearningUnit, missingSkills: string[]) => {
    //                 switch (lu.id) {
    //                     case "lu:1":
    //                         if (missingSkills.length > 0) {
    //                             throw new Error(
    //                                 "Must not compute any constraints for the first LU"
    //                             );
    //                         }
    //                         break;
    //                     case "lu:2":
    //                         expect(missingSkills).toEqual(["sk:1"]);
    //                         break;
    //                     case "lu:3":
    //                         expect(missingSkills.sort()).toEqual(["sk:2", "sk:4"]);
    //                         break;
    //                 }
    //             }
    //         );
    //     });
    // });
});

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
