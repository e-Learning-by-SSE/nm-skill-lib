import { LearningUnit, Skill } from "../..";
import { filterForUnitsAndSkills } from "./backward-search";

describe("Backward Search Tests", () => {
    const largeSkillMap: Skill[] = [];
    const largeLearningUnits: LearningUnit[] = [];

    for (let index = 1; index < 1001; index++) {
        largeSkillMap.push({ id: "sk:" + index, repositoryId: "1", nestedSkills: [] });
        largeLearningUnits.push(newLearningUnit(largeSkillMap, "lu:" + index, [], ["sk:" + index]));
    }

    for (let index = 1; index < 100; index++) {
        largeLearningUnits[index].requiredSkills.push(largeSkillMap[index - 1]);
    }

    const parentSkillMap: Skill[] = [
        { id: "sk:1", repositoryId: "1", nestedSkills: [] },
        { id: "sk:2", repositoryId: "1", nestedSkills: [] },
        { id: "sk:3", repositoryId: "1", nestedSkills: [] },
        { id: "sk:4", repositoryId: "1", nestedSkills: [] },
        { id: "sk:5", repositoryId: "1", nestedSkills: [] },
        { id: "sk:6", repositoryId: "1", nestedSkills: ["sk:1", "sk:2"] },
        { id: "sk:7", repositoryId: "1", nestedSkills: ["sk:3", "sk:4"] },
        { id: "sk:8", repositoryId: "1", nestedSkills: [] },
        { id: "sk:9", repositoryId: "1", nestedSkills: [] },
        { id: "sk:10", repositoryId: "1", nestedSkills: [] },
        { id: "sk:11", repositoryId: "1", nestedSkills: [] },
        { id: "sk:12", repositoryId: "1", nestedSkills: [] }
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
        const goal = largeSkillMap.filter(skill => skill.id === "sk:8");
        const knowledge = [];

        const [inScopeLearningUnits] = filterForUnitsAndSkills(
            goal,
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
        const knowledge = [];
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
        const knowledge = [];
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
        const knowledge = [];
        const [inScopeLearningUnits] = filterForUnitsAndSkills(
            goal,
            parentLearningUnit,
            largeSkillMap,
            knowledge
        );

        expect(inScopeLearningUnits.length).toBe(8);
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
        requiredSkills: map.filter(skill => requiredSkills.includes(skill.id)),
        teachingGoals: map.filter(skill => teachingGoals.includes(skill.id)),
        suggestedSkills: suggestions
    };
}
