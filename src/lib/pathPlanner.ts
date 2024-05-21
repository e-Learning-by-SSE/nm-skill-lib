import { Graph as GraphLib, alg } from "@dagrejs/graphlib";
import {
	Edge,
	Graph,
	Skill,
	Node,
	LearningUnit,
	Path,
	UpdateSoftConstraintFunction,
	CycledSkills,
	SkillAnalyzedPath
} from "./types";
import { findLearningPath } from "./fastDownward/fdFrontend";
import { CostFunction, HeuristicFunction } from "./fastDownward/fdTypes";
import { DistanceMap } from "./fastDownward/distanceMap";
import { GlobalKnowledge } from "./fastDownward/global-knowledge";
import { skillAnalysis } from "./fastDownward/missingSkillDetection";

/**
 * Returns a connected graph for the given set of skills.
 * @param skills The set of skills to include in the graph.
 * @returns A Promise that resolves to the connected graph.
 */
export function getConnectedGraphForSkill(skills: ReadonlyArray<Skill>): Graph {
	const graph = populateGraph({ skills, parentChild: true, childParent: false });
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
	const graph = populateGraph({ skills, learningUnits });
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
	const graph = populateGraph({ skills, learningUnits });
	return alg.isAcyclic(graph);
}

/**
 * Returns the path from the root node to the given skill in the graph.
 * @param skills The set of skills to include in the graph.
 * @param goal The goal definition to use for finding the path (the skills to be learned via the path).
 * @param learningUnits All learning units of the system to learn new skills.
 * @param knowledge The knowledge of the user (skills already learned).
 * @param optimalSolution Whether to enforce an optimal solution (true) or to use a greedy approach which may produce a suboptimal solution (false).
 * @param fnCost The cost function to use for computing the cost of a path, e.g. the duration of a learning unit o user specific customization requests like preferred language, density, gravity, etc.
 * @param contextSwitchPenalty The penalty for switching among topics which are not build on each other (default: 1.2).
 * @returns An optimal path of LearningUnits that leads to the specified skills (goal) or null if no path was found.
 */
export function getPath<LU extends LearningUnit>({
	skills,
	goal,
	learningUnits,
	knowledge = [],
	optimalSolution = false,
	fnCost,
	contextSwitchPenalty = 1.2
}: {
	skills: ReadonlyArray<Skill>;
	learningUnits: ReadonlyArray<LU>;
	goal: Skill[];
	knowledge?: Skill[];
	optimalSolution?: boolean;
	fnCost?: CostFunction<LU>;
	contextSwitchPenalty?: number;
}): Path | null {
	const paths = getPaths({
		skills,
		goal,
		learningUnits,
		knowledge,
		optimalSolution,
		fnCost,
		contextSwitchPenalty,
		alternatives: 1,
		alternativesTimeout: null
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
 * @param optimalSolution Whether to enforce an optimal solution (true) or to use a greedy approach which may produce a suboptimal solution (false).
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
	optimalSolution = false,
	fnCost,
	contextSwitchPenalty = 1.2,
	alternatives = 5,
	alternativesTimeout = 5000
}: {
	skills: ReadonlyArray<Skill>;
	learningUnits: ReadonlyArray<LU>;
	goal: Skill[];
	knowledge?: Skill[];
	optimalSolution?: boolean;
	fnCost?: CostFunction<LU>;
	contextSwitchPenalty?: number;
	alternatives: number;
	alternativesTimeout: number | null;
}): Path[] | null {
	const startTime = new Date().getTime();

	const distances = new DistanceMap(skills, learningUnits, fnCost);
	const fnHeuristic: HeuristicFunction<LearningUnit> = (goal: Skill[], lu) => {
		const min = distances.getDistances(
			lu.id,
			goal.map(skill => skill.id)
		);
		return min;
	};

	// Filter LearningUnits which cannot reach the goal
	const goalIds = goal.map(skill => skill.id);
	const filteredLearningUnits = learningUnits.filter(
		lu => distances.getDistances(lu.id, goalIds) !== Infinity
	);

	// Ensure timeout if more than one path should be computed
	if (alternatives > 1 && alternativesTimeout === null) {
		alternativesTimeout = 5000;
	}

	const path = findLearningPath({
		knowledge: knowledge,
		goal: goal,
		skills: skills,
		learningUnits: filteredLearningUnits,
		optimalSolution: optimalSolution,
		fnCost: fnCost,
		fnHeuristic: fnHeuristic,
		contextSwitchPenalty: contextSwitchPenalty,
		alternatives,
		alternativesTimeout
	});

	const duration = new Date().getTime() - startTime;
	console.log(`Path planning took ${duration}ms`);

	return path;
}

/**
 * Builds a directed multi-graph from the given set of Skills and LearningUnits.
 * @param skills: The Skills to include in the graph.
 * @param learningUnits: Optionally, the LearningUnits to include in the graph.
 * @param parentChild: Whether to include parent-child relationships between Skills (Parent -> Child; default: true).
 * @param childParent: Whether to include child-parent relationships between Skills (Child -> Parent; default: false).
 * @param suggestions: Whether to include suggested relationships between Skills and LearningUnits, considered like requirements
 * (Suggested Skill -> LearningUnit; default: true).
 * @returns The graph which may be used for graph-based algorithms.
 */
function populateGraph({
	skills,
	learningUnits,
	parentChild = true,
	childParent = false,
	suggestions = true
}: {
	skills: ReadonlyArray<Skill>;
	learningUnits?: ReadonlyArray<LearningUnit>;
	parentChild?: boolean;
	childParent?: boolean;
	suggestions?: boolean;
}): GraphLib {
	const graph = new GraphLib({ directed: true, multigraph: true });

	// Add Skills
	skills.forEach(skill => {
		const nodeName = "sk" + skill.id;
		graph.setNode(nodeName, skill);
		if (parentChild || childParent) {
			skill.nestedSkills.forEach(child => {
				const childName = "sk" + child;
				if (parentChild) {
					// Parent -> Child
					graph.setEdge(nodeName, childName);
				}
				if (childParent) {
					// Child -> Parent
					graph.setEdge(childName, nodeName);
				}
			});
		}
	});

	// Add LearningUnits, if defined
	if (learningUnits) {
		learningUnits.forEach(lu => {
			const luName = "lu" + lu.id;
			graph.setNode("lu" + lu.id, lu);
			lu.requiredSkills.extractSkills().forEach(req => {
				graph.setEdge("sk" + req.id, luName);
			});

			lu.teachingGoals.forEach(goal => {
				graph.setEdge(luName, "sk" + goal.id);
			});

			if (suggestions) {
				lu.suggestedSkills.forEach(suggestion => {
					// Analogous to requirements: Skill -> LearningUnit
					graph.setEdge("sk" + suggestion.skill.id, luName);
				});
			}
		});
	}
	return graph;
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
			.filter(goalId => !currentUnit.requiredSkills.extractSkills().map(skill => skill.id).includes(goalId))
			// Do not copy currently taught skills to avoid cycles
			.filter(goalId => !currentUnit.teachingGoals.map(skill => skill.id).includes(goalId));

		await fnUpdate(currentUnit, missingSkills);
	}
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
	const graph = populateGraph({
		skills,
		learningUnits,
		parentChild: false,
		childParent: true,
		suggestions: true
	});

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
	const cycles = findCycles(skills);

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
	learningUnits
}: {
	skills: ReadonlyArray<Skill>;
	goal: Skill[];
	learningUnits: ReadonlyArray<LU>;
}): SkillAnalyzedPath[] | null {
	const globalKnowledge = new GlobalKnowledge(skills);

	const skillAnalyzedPath = skillAnalysis(globalKnowledge, learningUnits, goal);

	return skillAnalyzedPath;
}
