import { Graph as GraphLib, alg } from "@dagrejs/graphlib";
import {
	Edge,
	Graph,
	Skill,
	Node,
	LearningUnit,
	Path,
	UpdateSoftConstraintFunction
} from "./types";
import { findLearningPath } from "./fastDownward/fdFrontend";
import { CostFunction, HeuristicFunction } from "./fastDownward/fdTypes";
import { DistanceMap } from "./fastDownward/distanceMap";

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
export async function getPath<LU extends LearningUnit>({
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
}): Promise<Path[] | null> {
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

	const path = await findLearningPath({
		knowledge: knowledge,
		goal: goal,
		skills: skills,
		learningUnits: filteredLearningUnits,
		optimalSolution: optimalSolution,
		fnCost: fnCost,
		fnHeuristic: fnHeuristic,
		contextSwitchPenalty: contextSwitchPenalty
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
			lu.requiredSkills.forEach(req => {
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
	// Iterate over all learningUnits starting at index 2 and set ordering condition to previous learningUnit
	for (let i = 1; i < learningUnits.length; i++) {
		const previousUnit = learningUnits[i - 1];
		const currentUnit = learningUnits[i];
		const missingSkills = previousUnit.teachingGoals
			.map(goal => goal.id)
			.filter(goalId => !currentUnit.requiredSkills.map(skill => skill.id).includes(goalId));

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
