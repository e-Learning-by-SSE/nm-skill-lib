import { Graph as GraphLib, alg } from "@dagrejs/graphlib";
import {
    Edge,
    Graph,
    Skill,
    Node,
    LearningUnit,
    UpdateSoftConstraintFunction,
    Selector,
    isCompositeGuard,
    Path,
    AnalyzedPath
} from "./types";
import { CostFunction, CostOptions, DefaultCostParameter } from "./fastDownward/fdTypes";
import {
    createGoalsGraph,
    filterForUnitsAndSkills,
    skillAnalysis
} from "./backward-search/backward-search";
import { search } from "./fastDownward/fastDownward";
import { detectCycles } from "./analysis";

/**
 * Returns a connected graph for the given set of skills.
 * @param skills The set of skills to include in the graph.
 * @returns A Promise that resolves to the connected graph.
 */
export function getConnectedGraphForSkill(skills: ReadonlyArray<Skill>): Graph {
    // Goals is equal to skills to get full graph
    const graph = createGoalsGraph(skills.slice(), skills.slice());
    return buildReturnGraph(graph);
}

/**
 * Returns a connected graph for the given set of skills and learning unit provider.
 * @param luProvider The learning unit provider to use for populating the graph.
 * @param skills The set of skills to include in the graph.
 * @returns A Promise that resolves to the connected graph.
 */
export function getConnectedGraphForLearningUnit(
    learningUnits: ReadonlyArray<LearningUnit>,
    skills: ReadonlyArray<Skill>
): Graph {
    // Goals is equal to skills to get full graph
    const graph = createGoalsGraph(skills.slice(), skills.slice(), learningUnits);
    return buildReturnGraph(graph);
}

/**
 * Returns whether the given set of skills forms an acyclic graph.
 * @param skills The set of skills to check.
 * @returns A Promise that resolves to a boolean indicating whether the graph is acyclic.
 */
export function isAcyclic(
    skills: ReadonlyArray<Skill>,
    learningUnits: ReadonlyArray<LearningUnit>
): boolean {
    const graph = findCycles(skills, learningUnits);
    return graph.length > 0;
}

/**
 * Detects cycles in the given set of Skills and LearningUnits.
 * However, there exist corner cases that are not covered by this function.
 * @param skills The Skills to check. Will also check for cycles in the nestedSkills.
 * @param learningUnits The LearningUnits to check. Will check for cycles among the requiredSkills/suggestions and teachingGoals.
 * @returns An empty array if no cycles were detected or an array of detected cycles.
 */
export function findCycles<S extends Skill, LU extends LearningUnit>(
    skills: ReadonlyArray<S>,
    learningUnits?: ReadonlyArray<LU>
) {
    return detectCycles(skills, learningUnits!);
}

/**
 * Returns the path from the root node to the given skill in the graph.
 * @param skills The set of skills to include in the graph.
 * @param goal The goal definition to use for finding the path (the skills to be learned via the path).
 * @param learningUnits All learning units of the system to learn new skills.
 * @param knowledge The knowledge of the user (skills already learned).
 * @param fnCost The cost function to use for computing the cost of a path, e.g. the duration of a learning unit o user specific customization requests like preferred language, density, gravity, etc.
 * @param contextSwitchPenalty The penalty for switching among topics which are not build on each other (default: 1.2).
 * @returns An optimal path of LearningUnits that leads to the specified skills (goal) or null if no path was found.
 */
export function getPath<LU extends LearningUnit>({
    skills,
    goal,
    learningUnits,
    knowledge = [],
    fnCost,
    isComposite,
    costOptions = DefaultCostParameter,
    selectors
}: {
    skills: ReadonlyArray<Skill>;
    learningUnits: ReadonlyArray<LU>;
    goal: Skill[];
    knowledge?: Skill[];
    fnCost?: CostFunction<LU>;
    isComposite: isCompositeGuard<LU>;
    costOptions: CostOptions;
    selectors?: Selector<LU>[];
}): Path<LU> | null {
    const paths = getPaths({
        skills,
        goal,
        learningUnits,
        knowledge,
        fnCost,
        isComposite,
        costOptions,
        selectors,
        alternatives: 1
    });

    if (paths && paths.length > 0) {
        return paths[0];
    } else {
        return null;
    }
}

/**
 * Returns multiple paths from the root node to the given skill in the graph.
 * @param skills The set of skills to include in the graph.
 * @param goal The goal definition to use for finding the path (the skills to be learned via the path).
 * @param learningUnits All learning units of the system to learn new skills.
 * @param knowledge The knowledge of the user (skills already learned).
 * @param fnCost The cost function to use for computing the cost of a path, e.g. the duration of a learning unit o user specific customization requests like preferred language, density, gravity, etc.
 * @param contextSwitchPenalty The penalty for switching among topics which are not build on each other (default: 1.2).
 * @param alternatives The number of alternative paths to compute.
 * @param alternativesTimeout The timeout in milliseconds for computing the alternatives.
 * If only one path shall be computed, this value may be set to null to ignore the timeout.
 * Otherwise, a null value will be replaced by a default timeout of 5000ms.
 * @returns Optimal paths of LearningUnits that leads to the specified skills (goal) or null if no path was found.
 */
export function getPaths<LU extends LearningUnit>({
    skills,
    goal,
    learningUnits,
    knowledge = [],
    fnCost,
    isComposite,
    costOptions = DefaultCostParameter,
    selectors,
    alternatives = 5
}: {
    skills: ReadonlyArray<Skill>;
    learningUnits: ReadonlyArray<LU>;
    goal: Skill[];
    knowledge?: Skill[];
    fnCost?: CostFunction<LU>;
    isComposite: isCompositeGuard<LU>;
    costOptions: CostOptions;
    selectors?: Selector<LU>[];
    alternatives: number;
}): Path<LU>[] | null {
    // const startTime = new Date().getTime();

    const [inScopeLearningUnits, inScopeSkills] = filterForUnitsAndSkills(
        goal,
        learningUnits,
        skills,
        knowledge
    );

    // Default cost function: Increase the cost of the path by 1 for each learned LearningUnit
    // Maybe replaced by a more sophisticated cost function
    if (!fnCost) {
        fnCost = op => 1;
    }

    const paths = search({
        allSkills: inScopeSkills,
        allUnits: inScopeLearningUnits,
        goal,
        knowledge,
        fnCost,
        isComposite,
        costOptions,
        selectors,
        alternatives
    });

    if (paths) {
        for (const path of paths) {
            path.cost = Math.round((path.cost + Number.EPSILON) * 100) / 100;
        }
    }

    // const duration = new Date().getTime() - startTime;
    // console.log(`Path planning took ${duration}ms`);

    return paths;
}

function buildReturnGraph(graph: GraphLib): Graph {
    const nodeList: Node[] = graph.nodes().map(nodeId => {
        const label = graph.node(nodeId);
        return { id: nodeId.slice(2), element: label };
    });

    const edgeList: Edge[] = graph.edges().map(element => {
        return { from: element.v.slice(2), to: element.w.slice(2) };
    });
    return { nodes: nodeList, edges: edgeList };
}

/**
 * Computes and sets suggested constraints to enforce a preferred order based on the given learning units.
 * @param learningUnits The ordering of the learning units, for which soft constraints shall be computed to enforce the given order.
 * @param fnUpdate The CREATE/UPDATE/DELETE function to apply the computed constraints.
 */
export async function computeSuggestedSkills(
    learningUnits: LearningUnit[],
    fnUpdate: UpdateSoftConstraintFunction
) {
    // Do nothing and avoid any exception if an empty array was passed
    if (learningUnits.length === 0) {
        return;
    }

    // Delete constraints for the very first unit
    await fnUpdate(learningUnits[0], []);

    // Iterate over all learningUnits starting at index 2 and set ordering condition to previous learningUnit
    for (let i = 1; i < learningUnits.length; i++) {
        const previousUnit = learningUnits[i - 1];
        const currentUnit = learningUnits[i];
        const missingSkills = previousUnit.teachingGoals
            .map(goal => goal.id)
            // Do not copy hard constraints also to soft constraints
            .filter(goalId => !currentUnit.requiredSkills.map(skill => skill.id).includes(goalId))
            // Do not copy currently taught skills to avoid cycles
            .filter(goalId => !currentUnit.teachingGoals.map(skill => skill.id).includes(goalId));

        await fnUpdate(currentUnit, missingSkills);
    }
}

/**
 * Finding the missing skills in a learning path By analyze the skills of a goal.
 * Tracing backward the skill requirements and group skills (parent/child) for the skills.
 *
 * Analyzing skill requirements by using recursive tracing for each required skill to try to find the missing skills.
 * Analyzing the group skills (parent/child) by checking skill groups hierarchy.
 *
 * @param goal The skills that should be learned.
 * @param skills The set of all skills (independent of what was already learned and what should be learned).
 * @param learningUnits The set of all LearningUnits.
 * @returns A list of the missing skills with the sub paths for them.
 */
export function getSkillAnalysis<LU extends LearningUnit>({
    skills,
    goal,
    learningUnits,
    knowledge
}: {
    skills: ReadonlyArray<Skill>;
    goal: Skill[];
    learningUnits: ReadonlyArray<LU>;
    knowledge: Skill[];
}): AnalyzedPath<LU>[] | null {
    const skillAnalyzedPath = skillAnalysis(goal, learningUnits, skills, knowledge);

    return skillAnalyzedPath;
}
