import { LearningUnit, Path, PathUnit, Skill, SkillAnalyzedPath } from "../types";
import { SearchNode } from "./searchNode";
import { State } from "./state";
import { GlobalKnowledge } from "./global-knowledge";

/**
 * Compute which LearningUnits are reversed reachable based on the given goals in state.
 * Using teachingGoals of the LearningUnits and the skill groups
 */
function availableActions<LU extends LearningUnit>(
    currentState: State,
    learningUnits: ReadonlyArray<LU>,
    globalKnowledge: GlobalKnowledge
) {
    // Find the LearningUnits for each goal in the state using teachingGoals.
    let usefulLus = learningUnits.filter(lu =>
        lu.teachingGoals.some(skill => currentState.learnedSkills.includes(skill.id))
    );

    // Find the LearningUnits for each goal in the state using globalKnowledge (Skill groups).
    globalKnowledge.getAllParents().forEach(parent => {
        if (currentState.getHashCode().includes(parent.id)) {
            const lu = learningUnits.filter(lu =>
                lu.teachingGoals.some(skill => parent.nestedSkills.includes(skill.id))
            );
            usefulLus = usefulLus.concat(lu);
        }
    });

    // Remove duplicate LearningUnits
    return [...new Set(usefulLus)];
}

/**
 * Analysis skills of a goal to find the missing skills.
 * The algorithm traces back the required skills from the goal backward.
 * Tracing the requirements for the required skills recursively to try to find the missing skills
 *
 * If a learning unit for the required skill is not found, then it is counted as a missing skill and recorded the sub-path.
 * If a skill depends on skill groups (parent/child) is not found, then the algorithm checks skill groups hierarchy to find missing skills.
 *
 * @param goal The skills that should be learned (should not contain skills that are already known).
 * @param globalKnowledge The set of all skills (independent of what was already learned and what should be learned).
 * @param learningUnits All learning units of the system to learn new skills.
 * @returns A list of the missing skills with the sub paths for them.
 */
export function skillAnalysis<LU extends LearningUnit>(
    globalKnowledge: GlobalKnowledge,
    learningUnits: ReadonlyArray<LU>,
    goal: Skill[]
): SkillAnalyzedPath[] | null {
    const openListMap = new Map();
    let currentNode: SearchNode<LU>;

    // Create initial state with goals and globalKnowledge
    const initialState = new State(
        goal.map(skill => skill.id),
        globalKnowledge
    );

    // Remove duplicate LearningUnits
    initialState.learnedSkills = [...new Set(initialState.learnedSkills)];

    const openList: SearchNode<LU>[] = [new SearchNode<LU>(initialState, null, null, 0, 0)];

    // goalString is a string with all the skills for the request goal (or skill) to analyze.
    // Case 1: If a skill does not have requirements, then we can't find it through skill requirements tracing.
    // Case 2: If a skill depends on skill groups (parent/child), then we can't find it through skill requirements tracing.
    // We use goalString to find the missing skills that do not have requirements and the skill that uses skill groups.
    // Note: I used a string to avoid performance issues in finding and deleting (I will do more research to compare it with other alternatives)
    let goalString = `,`.concat(initialState.learnedSkills.join(",").concat(`,`));

    while (openList.length > 0) {
        currentNode = openList.shift()!;

        // Stop searching in a sub-path for a skill if we reached a skill without requirement.
        // Reaching a skill without requirement in a sub-path means that there is a path for learning this skill
        const unit = currentNode!.action!;
        if (unit && unit.requiredSkills.length == 0) {
            continue;
        }

        for (const lu of availableActions(currentNode.state, learningUnits, globalKnowledge)) {
            // Removing found (reachable) skills from the goalString
            lu.teachingGoals.forEach(skill => {
                goalString = goalString.replace(`,${skill.id},`, `,`);

                // Removing nested skills from the goalString if the parent skill is found (reachable)
                skill.nestedSkills.forEach(
                    nestedSkill => (goalString = goalString.replace(`,${nestedSkill},`, `,`))
                );

                // Removing parent skill from the goalString if the it has one child
                // And that child skill is found (reachable)
                const allParents = globalKnowledge.getAllParents();
                const parent = allParents.filter(parent =>
                    parent.nestedSkills.every(child => skill.id.includes(child))
                );
                parent.forEach(sk => (goalString = goalString.replace(`,${sk.id},`, `,`)));
            });

            // Find in reverse order LearningUnits for the required skills
            lu.requiredSkills.forEach(skill => {
                // Find LearningUnits for the required skills
                let requiredLus = learningUnits.filter(unit =>
                    unit.teachingGoals.map(sk => sk.id).includes(skill.id)
                );

                // Check the nested skills (Skill groups) in globalKnowledge for the required skill
                if (requiredLus.length == 0) {
                    if (
                        globalKnowledge
                            .getAllParents()
                            .map(sk => sk.id)
                            .includes(skill.id)
                    ) {
                        const newState = new State([skill.id], new GlobalKnowledge([]));
                        const newNode = new SearchNode<LU>(newState, null, currentNode, 0, 0);
                        openList.unshift(newNode)!;
                    } else {
                        // The skill is considered as missing skill
                        openListMap.set(skill.id, currentNode);
                    }
                }

                // If LearningUnits found for the required skill
                // Then it is added for further search
                requiredLus.forEach(requiredLu => {
                    const newState = new State([skill.id], globalKnowledge);
                    const newNode = new SearchNode<LU>(newState, requiredLu, currentNode, 0, 0);
                    openList.push(newNode);
                });
            });
        }
    }

    // If goalString still has some goals, then we check the skill groups in globalKnowledge
    // To remove parent skill if all his children is found (Reachable)
    // We do loop over the goal skills, to void the order of the skills until no more changes on the goalString
    if (goalString.length > 0) {
        while (true) {
            const goalSkills = goalString.split(",").filter(skill => skill.length > 0);
            let goalSkillsCount = goalSkills.length;
            goalSkills.forEach(sk => {
                const parentSkill = globalKnowledge
                    .getAllParents()
                    .find(parentSkill => parentSkill.id == sk);
                if (parentSkill) {
                    let parentSkillCount = parentSkill.nestedSkills.length;
                    parentSkill.nestedSkills.forEach(skill => {
                        if (goalString.includes(`,`.concat(skill).concat(`,`))) {
                            parentSkillCount--;
                        }
                    });
                    if (parentSkillCount == parentSkill.nestedSkills.length) {
                        goalString = goalString.replace(`,${sk},`, `,`);
                        goalSkillsCount--;
                    }
                } else {
                    // The skill is consider as missing skill
                    openListMap.set(sk, -1);
                }
            });
            if (goalSkillsCount == goalSkills.length) {
                break;
            }
        }
        goalString
            .split(",")
            .filter(skill => skill.length > 0)
            .forEach(sk => {
                if (!openListMap.has(sk)) {
                    openListMap.set(sk, -1);
                }
            });
    }

    // If openListMap is empty, then there are no missing skills in the goal skills
    if (openListMap.size == 0) {
        return null;
    }

    // Convert the missing skills into appropriate data format
    const skillAnalyzedPathList: SkillAnalyzedPath[] = [];
    openListMap.forEach(function (value, key) {
        if (value == -1) {
            const path = createPath(key, null);
            skillAnalyzedPathList.push(path);
        } else if (value.action == null) {
            const path = createPath(key, null);
            skillAnalyzedPathList.push(path);
        } else {
            const path = createPath(key, value);
            skillAnalyzedPathList.push(path);
        }
    });

    return skillAnalyzedPathList;
}

/**
 * Create a sub path for the missing skill.
 * @param skill The missing skill id.
 * @param learningUnitPath The learning Units for a sub path for the skill .
 * @returns The sub path for the missing skill.
 */
function createPath<LU extends LearningUnit>(
    skill: string,
    learningUnitPath: SearchNode<LU> | null
) {
    const analysisPath = new SkillAnalyzedPath();
    analysisPath.missingSkill = skill;
    analysisPath.subPath = new Path();
    if (learningUnitPath != null) {
        let node = learningUnitPath;
        while (node.parent !== null) {
            const lu = node.action;
            if (lu) {
                const pathUnit: PathUnit = {
                    unit: lu
                };
                analysisPath.subPath.path.unshift(pathUnit);
            }
            node = node.parent;
        }
    }

    return analysisPath;
}
