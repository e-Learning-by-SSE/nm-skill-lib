import { And } from "../ast/and";
import { Empty } from "../ast/empty";
import { Variable } from "../ast/variable";
import { LearningUnit, Skill } from "../types";
import { DistanceMap } from "./distanceMap";

describe("getDistance", () => {
    it("2 connected Units; No nesting", () => {
        const skills: Skill[] = [
            { id: "skill:1", children: [] },
            { id: "skill:2", children: [] },
            { id: "skill:3", children: [] }
        ];
        const units: LearningUnit[] = [
            newLearningUnit(skills, "unit:1", ["skill:1"], ["skill:2"]),
            newLearningUnit(skills, "unit:2", ["skill:2"], ["skill:3"])
        ];

        const dMap = new DistanceMap(skills, units);

        expect(dMap.getDistance("unit:1", "skill:1")).toBe(Infinity);
        expect(dMap.getDistance("unit:1", "skill:2")).toBe(1);
        expect(dMap.getDistance("unit:1", "skill:3")).toBe(2);
        expect(dMap.getDistance("unit:2", "skill:1")).toBe(Infinity);
        expect(dMap.getDistance("unit:2", "skill:2")).toBe(Infinity);
        expect(dMap.getDistance("unit:2", "skill:3")).toBe(1);
    });

    it("2 connected Units; Nesting (Child used)", () => {
        const skills: Skill[] = [
            { id: "skill:1", children: [] },
            { id: "skill:parent:2", children: ["skill:child:2"] },
            { id: "skill:child:2", children: [] },
            { id: "skill:3", children: [] }
        ];
        const units: LearningUnit[] = [
            newLearningUnit(skills, "unit:1", ["skill:1"], ["skill:child:2"]),
            newLearningUnit(skills, "unit:2", ["skill:parent:2"], ["skill:3"])
        ];

        const dMap = new DistanceMap(skills, units);

        expect(dMap.getDistance("unit:1", "skill:1")).toBe(Infinity);
        expect(dMap.getDistance("unit:1", "skill:child:2")).toBe(1);
        expect(dMap.getDistance("unit:1", "skill:parent:2")).toBe(1);
        expect(dMap.getDistance("unit:1", "skill:3")).toBe(2);
        expect(dMap.getDistance("unit:2", "skill:1")).toBe(Infinity);
        expect(dMap.getDistance("unit:2", "skill:child:2")).toBe(Infinity);
        expect(dMap.getDistance("unit:2", "skill:parent:2")).toBe(Infinity);
        expect(dMap.getDistance("unit:2", "skill:3")).toBe(1);
    });

    it("2 connected Units; Nesting (Parent used)", () => {
        const skills: Skill[] = [
            { id: "skill:1", children: [] },
            { id: "skill:parent:2", children: ["skill:child:2"] },
            { id: "skill:child:2", children: [] },
            { id: "skill:3", children: [] }
        ];
        const units: LearningUnit[] = [
            newLearningUnit(skills, "unit:1", ["skill:1"], ["skill:parent:2"]),
            newLearningUnit(skills, "unit:2", ["skill:child:2"], ["skill:3"])
        ];

        const dMap = new DistanceMap(skills, units);

        expect(dMap.getDistance("unit:1", "skill:1")).toBe(Infinity);
        expect(dMap.getDistance("unit:1", "skill:child:2")).toBe(1);
        expect(dMap.getDistance("unit:1", "skill:parent:2")).toBe(1);
        expect(dMap.getDistance("unit:1", "skill:3")).toBe(2);
        expect(dMap.getDistance("unit:2", "skill:1")).toBe(Infinity);
        expect(dMap.getDistance("unit:2", "skill:child:2")).toBe(Infinity);
        expect(dMap.getDistance("unit:2", "skill:parent:2")).toBe(Infinity);
        expect(dMap.getDistance("unit:2", "skill:3")).toBe(1);
    });
});

function newLearningUnit(map: Skill[], id: string, requires: string[], provides: string[]) {
    const variables = map
        .filter(skill => requires.includes(skill.id))
        .map(skill => new Variable(skill));

    const skillExpression = variables.length > 0 ? new And(variables) : new Empty();

    return {
        id: id,
        requires: skillExpression,
        provides: map.filter(skill => provides.includes(skill.id)),
        suggestedSkills: []
    };
}
