/**
 * Test cases to test the toString methods of classes,
 * which are explicity written to support debugging.
 * Tests meaningful output and avoidance of null pointers.
 */
import { And } from "../ast/and";
import { Empty } from "../ast/empty";
import { Variable } from "../ast/variable";
import { LearningUnit, Path, Skill } from "../types";
import { DistanceMap } from "./distanceMap";
import { GlobalKnowledge } from "./global-knowledge";
import { SearchNode } from "./searchNode";
import { State } from "./state";

describe("toString() methods", () => {
    // Test data to be used across al tests
    const skills: Skill[] = [
        { id: "parent:1", children: ["child:1", "child:2"] },
        { id: "child:1", children: [] },
        { id: "child:2", children: [] },
        { id: "skill:1", children: [] }
    ];
    const units: LearningUnit[] = [
        newLearningUnit(skills, "unit:1", [], ["child:1"]),
        newLearningUnit(skills, "unit:2", [], ["child:2"]),
        newLearningUnit(skills, "unit:3", ["parent:1"], ["skill:1"])
    ];
    const globalKnowledge = new GlobalKnowledge(skills);

    describe("distanceMap", () => {
        it("Empty map", () => {
            const dMap = new DistanceMap([], []);
            expect(dMap.toString()).toBe("");
        });

        it("Map without cost function", () => {
            const dMap = new DistanceMap(skills, units);
            // TODO: Order of skills is not defined
            const unit1Str = "unit:1:\n  child:1: 1\n  child:2: 1\n  parent:1: 1\n  skill:1: 2";
            const unit2Str = "unit:2:\n  child:1: 1\n  child:2: 1\n  parent:1: 1\n  skill:1: 2";
            const unit3Str = "unit:3:\n  skill:1: 1";
            expect(dMap.toString().trim()).toBe(`${unit1Str}\n${unit2Str}\n${unit3Str}`);
        });

        it("Map with cost function", () => {
            const dMap = new DistanceMap(skills, units, lu => 2);
            // TODO: Order of skills is not defined
            const unit1Str = "unit:1:\n  child:1: 2\n  child:2: 2\n  parent:1: 2\n  skill:1: 4";
            const unit2Str = "unit:2:\n  child:1: 2\n  child:2: 2\n  parent:1: 2\n  skill:1: 4";
            const unit3Str = "unit:3:\n  skill:1: 2";
            expect(dMap.toString().trim()).toBe(`${unit1Str}\n${unit2Str}\n${unit3Str}`);
        });
    });

    describe("SearchNode", () => {
        it("Empty node", () => {
            const cost = 0;
            const node = new SearchNode<LearningUnit>(
                new State([], globalKnowledge),
                null,
                null,
                cost,
                0
            );
            expect(node.toString()).toBe(` (${cost})`);
        });

        it("Non-empty nodes", () => {
            const emptyState = new State([], globalKnowledge);

            // Initial node
            let cost = 0;
            let node = new SearchNode<LearningUnit>(emptyState, null, null, cost, 0);
            let unit: Path<LearningUnit> = new Path<LearningUnit>();
            expect(node.toString()).toBe(` (${cost})`);

            // Unit 1
            cost = 1;
            unit.cost = cost;
            unit.origin = units[0];
            node = new SearchNode<LearningUnit>(emptyState, unit, node, cost, 0);
            expect(node.toString()).toBe(`${units[0].id} (${cost})`);

            // Unit 2
            cost = 21;
            unit = new Path<LearningUnit>();
            unit.cost = cost;
            unit.origin = units[1];
            node = new SearchNode<LearningUnit>(emptyState, unit, node, cost, 0);
            expect(node.toString()).toBe(`${units[0].id}, ${units[1].id} (${cost})`);

            // Unit 3
            cost = 42;
            unit = new Path<LearningUnit>();
            unit.cost = cost;
            unit.origin = units[2];
            node = new SearchNode<LearningUnit>(emptyState, unit, node, cost, 0);
            expect(node.toString()).toBe(
                `${units[0].id}, ${units[1].id}, ${units[2].id} (${cost})`
            );
        });
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
