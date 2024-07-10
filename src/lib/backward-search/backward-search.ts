import { LearningUnit, Skill } from "../..";

/**
 * Filter the learning units to reduce the size of the potential candidate for the algorithm.
 * Tracing backward the potential learning units from the goal using required skills.
 * Taking in consideration the parent/children relation.
 *
 * @param goal The skills that should be learned.
 * @param skills The set of all skills (independent of what was already learned and what should be learned).
 * @param learningUnits The set of all LearningUnits.
 * @param knowledge The knowledge of the user (skills already learned).
 * @returns A tuple in form of filtered (learningUnits, skills) that are useful to find a path.
 */
export function filterForUnitsAndSkills<LU extends LearningUnit>(
    goal: Skill[],
    learningUnits: ReadonlyArray<LU>,
    skills: ReadonlyArray<Skill>,
    knowledge: Skill[]
): [LU[], Skill[]] {
    // Extract the required skills from the goal into a required skills list
    const skillsToFilteredLu = goal.slice();
    const inScopeLearningUnitsSet = new Set<LU>();
    const processedSkills = new Set<string>();

    // Loop over the required skills
    while (skillsToFilteredLu.length > 0) {
        const skill = skillsToFilteredLu.pop();

        if (skill) {
            // Skip the current required skill if the skill exist in the learned skills (knowledge)
            if (
                knowledge.map(skill => skill.id).includes(skill.id) ||
                processedSkills.has(skill.id)
            ) {
                continue;
            }

            // Find learning units that teach the current required skill
            const lus = learningUnits.filter(learningUnit =>
                learningUnit.teachingGoals.some(sk => sk.id == skill.id)
            );

            // Add the learning units to the potential learning units list
            lus.forEach(unit => {
                inScopeLearningUnitsSet.add(unit);
            });

            // Add the required skills for the learning units to the required skills list
            lus.forEach(unit => {
                skillsToFilteredLu.push(...unit.requiredSkills);
            });

            // Find the nested skills for current required skill
            const nestedSkills = skills.filter(sk => skill.nestedSkills.includes(sk.id));
            // Add nested skills to the required skills list
            skillsToFilteredLu.push(...nestedSkills);
            processedSkills.add(skill.id);
        }
    }

    // Return the potential learning units list (without duplication)
    const inScopeLearningUnits = [...inScopeLearningUnitsSet];
    const inScopeSkills = filterOutOfScopeSkills(inScopeLearningUnits, skills, goal);
    return [inScopeLearningUnits, inScopeSkills];
}

/**
 * Filter the skills to reduce the size of the potential candidate for the algorithm.
 * Trace all the skills involved in the potential learning units.
 * (requiredSkills, teachingGoals, suggestedSkills).
 * Taking in consideration the parent/children relation.
 *
 * @param skills The set of all skills (independent of what was already learned and what should be learned).
 * @param inScopeLearningUnits The set of the potential learning units.
 * @returns A list of potential skills that could find a path.
 */
function filterOutOfScopeSkills<LU extends LearningUnit>(
    inScopeLearningUnits: ReadonlyArray<LU>,
    skills: ReadonlyArray<Skill>,
    goal: Skill[]
): Skill[] {
    const filteredSkills = new Set<Skill>();

    // Goal must be part of scoped Skills
    goal.forEach(skill => {
        filteredSkills.add(skill);
    });

    // Loop over the potential learning units
    inScopeLearningUnits.forEach(learningUnit => {
        // Add the required skills for the learning units to the potential skills list
        learningUnit.requiredSkills.forEach(skill => {
            filteredSkills.add(skill);
        });
        // Add the teaching goals skills for the learning units to the potential skills list
        learningUnit.teachingGoals.forEach(skill => {
            filteredSkills.add(skill);
        });
        // Add the suggested skills for the learning units to the potential skills list
        learningUnit.suggestedSkills.forEach(suggest => {
            filteredSkills.add(suggest.skill);
        });
    });

    // Identify recursively all parents
    const allParents = skills.filter(skill => skill.nestedSkills.length > 0);
    const childrenToConsider = new Set<String>();
    filteredSkills.forEach(skill => {
        childrenToConsider.add(skill.id);
    });
    while (childrenToConsider.size > 0) {
        const current = childrenToConsider.values().next().value;
        childrenToConsider.delete(current);
        const parent = allParents.find(skill => skill.nestedSkills.includes(current));
        if (parent && !filteredSkills.has(parent)) {
            filteredSkills.add(parent);
            childrenToConsider.add(parent.id);
        }
    }

    // Identify recursively all children
    const parentsToConsider = [...filteredSkills];
    // Array + for-loop as array will be altered during execution: https://stackoverflow.com/a/25243688
    for (let i = 0; i < parentsToConsider.length; i++) {
        const current = parentsToConsider[i];
        current.nestedSkills
            // Skill -> children
            .map(id => skills.find(skill => skill.id === id))
            .filter(isDefined)
            // Add + Recursion
            .forEach(child => {
                if (!filteredSkills.has(child)) {
                    filteredSkills.add(child);
                    parentsToConsider.push(child);
                }
            });
    }

    // Return the potential skills list (without duplication)
    return [...filteredSkills];
}

/**
 * Type guard to filter for defined values.
 * @see https://stackoverflow.com/a/62753258
 * @param val A potentially undefined value of a map function
 * @returns type-safe list of defined elements
 */
function isDefined<T>(val: T | undefined | null): val is T {
    return val !== undefined && val !== null;
}
