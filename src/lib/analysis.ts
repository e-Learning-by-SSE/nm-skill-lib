import { alg } from "@dagrejs/graphlib";
import { createGoalsGraph } from "./backward-search/backward-search-new";
import { CycledSkills, LearningUnit, Skill } from "./types";

/**
 * Detects cycles in the given set of Skills and LearningUnits.
 * However, there exist corner cases that are not covered by this function.
 * @param skills The Skills to check. Will also check for cycles in the nestedSkills.
 * @param learningUnits The LearningUnits to check. Will check for cycles among the requiredSkills/suggestions and teachingGoals.
 * @returns An empty array if no cycles were detected or an array of detected cycles.
 */
export function findCycles<S extends Skill, LU extends LearningUnit>(
    skills: ReadonlyArray<S>,
    learningUnits: ReadonlyArray<LU>
) {
    // Mapping of internal IDs to objects
    const mapping = new Map<string, S | LU>();
    for (const skill of skills) {
        mapping.set("sk" + skill.id, skill);
    }
    if (learningUnits) {
        for (const lu of learningUnits) {
            mapping.set("lu" + lu.id, lu);
        }
    }

    // Build graph
    const graph = createGoalsGraph(skills.slice(), learningUnits, skills.slice(), []);

    const result: (S | LU)[][] = [];

    // isAcyclic is much more performant than findCycles -> Used as pre-check
    if (!alg.isAcyclic(graph)) {
        const cycles = alg.findCycles(graph);

        // Map (internal) IDs back to objects
        for (const cycle of cycles) {
            const cycleElements = cycle
                .map(nodeId => mapping.get(nodeId))
                .filter(element => element !== undefined) as (S | LU)[];
            result.push(cycleElements);
        }
    }

    return result;
}

/**
 * Find cycles of nested skills and determines upper skills that (indirectly) contain the cycled skills.
 * @param skills The Skills to check. Will also check for cycles in the nestedSkills.
 * @return A tuple: First parameter is the list of cycles, second parameter is list of upper skills that contain the cycled skills.
 * Or `null` if no cycles found.
 */
export function findParentsOfCycledSkills<S extends Skill>(
    skills: ReadonlyArray<S>
): CycledSkills<S> | null {
    const cycles = findCycles(skills, []);

    if (cycles.length === 0) {
        return null;
    }

    // skillId -> skill
    const skillMap = new Map<string, S>();
    // childId -> all parents
    const parentMap = new Map<string, string[]>();
    skills.forEach(skill => {
        skillMap.set(skill.id, skill);
        if (skill.nestedSkills) {
            const parent = skill.id;
            skill.nestedSkills.forEach(childId => {
                if (!parentMap.has(childId)) {
                    parentMap.set(childId, []);
                }
                parentMap.get(childId)!.push(parent);
            });
        }
    });

    // Determine all skills that are part of a cycle (avoid duplicates)
    const cycledSkills = Array.from(
        new Set(cycles.flatMap(cycle => cycle.map(element => element.id)))
    );
    const cycleParents = new Set<S>();
    cycledSkills.forEach(skillId => {
        findParentsOfSkills(skillId, cycledSkills, parentMap, skillMap, cycleParents);
    });

    return {
        cycles: cycles as S[][],
        nestingSkills: Array.from(cycleParents)
    };
}

/**
 * Recursive, private part of `findParentsOfCycledSkills`. To detect recursively all parents of a skill.
 * @param skillId The (nested) skill to start with.
 * @param parentMap The map of all parents (childId -> all parents).
 * @param skillMap The map of all skills (skillId -> skill).
 * @param resultSet Will be filled with all (indirect) parents of the given skill as a side effect.
 */
function findParentsOfSkills<S extends Skill>(
    skillId: string,
    cycledSkills: string[],
    parentMap: Map<string, string[]>,
    skillMap: Map<string, S>,
    resultSet: Set<S>,
    alreadyVisited: Set<string> = new Set()
) {
    const skill = skillMap.get(skillId);
    alreadyVisited.add(skillId);

    // Do not add the cycled skills to the result set
    if (!cycledSkills.includes(skillId)) {
        resultSet.add(skill!);
    }

    const parents = parentMap.get(skillId);
    if (parents) {
        for (const parentId of parents) {
            if (!alreadyVisited.has(parentId)) {
                findParentsOfSkills(
                    parentId,
                    cycledSkills,
                    parentMap,
                    skillMap,
                    resultSet,
                    alreadyVisited
                );
            }
        }
    }
}
