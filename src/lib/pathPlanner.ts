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
export async function getConnectedGraphForSkill(skills: ReadonlyArray<Skill>): Promise<Graph> {
	const graph = await populateGraphWithSkills(skills);
	return buildReturnGraph(graph);
}

/**
 * Returns a connected graph for the given set of skills and learning unit provider.
 * @param luProvider The learning unit provider to use for populating the graph.
 * @param skills The set of skills to include in the graph.
 * @returns A Promise that resolves to the connected graph.
 */
export async function getConnectedGraphForLearningUnit(
	learningUnits: ReadonlyArray<LearningUnit>,
	skills: ReadonlyArray<Skill>
): Promise<Graph> {
	const graph = await populateGraphWithLearningUnits(skills, learningUnits);
	return buildReturnGraph(graph);
}

/**
 * Returns whether the given set of skills forms an acyclic graph.
 * @param skills The set of skills to check.
 * @returns A Promise that resolves to a boolean indicating whether the graph is acyclic.
 */
export async function isAcyclic(
	skills: ReadonlyArray<Skill>,
	learningUnits: ReadonlyArray<LearningUnit>
): Promise<boolean> {
	const graph = await populateGraphWithLearningUnits(skills, learningUnits);
	return alg.isAcyclic(graph);
}

/**
 * Returns the path from the root node to the given skill in the graph.
 * @param skills The set of skills to include in the graph.
 * @param learningUnits All learning units of the system to learn new skills.
 * @param goalDef The goal definition to use for finding the path.
 * @returns A Promise that resolves to an array of node IDs representing the path.
 */
export async function getPath<LU extends LearningUnit>({
	skills,
	desiredSkills,
	learningUnits,
	ownedSkill = [],
	optimalSolution = false,
	fnCost,
	contextSwitchPenalty = 1.2
}: {
	skills: ReadonlyArray<Skill>;
	learningUnits: ReadonlyArray<LU>;
	desiredSkills: Skill[];
	ownedSkill?: Skill[];
	optimalSolution?: boolean;
	fnCost?: CostFunction<LU>;
	contextSwitchPenalty?: number;
}): Promise<Path | null> {
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
	const goalIds = desiredSkills.map(skill => skill.id);
	const filteredLearningUnits = learningUnits.filter(
		lu => distances.getDistances(lu.id, goalIds) !== Infinity
	);

	const path = await findLearningPath({
		knowledge: ownedSkill,
		goal: desiredSkills,
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

async function populateGraphWithSkills(skills: ReadonlyArray<Skill>): Promise<GraphLib> {
	const graph = new GraphLib({ directed: true, multigraph: true });

	skills.forEach(skill => {
		graph.setNode("sk" + skill.id, skill);
		skill.nestedSkills.forEach(child => {
			graph.setEdge("sk" + skill.id, "sk" + child);
		});
	});
	return graph;
}

async function populateGraphWithSkillsAndReverse(skills: ReadonlyArray<Skill>): Promise<GraphLib> {
	const graph = new GraphLib({ directed: true, multigraph: true });

	skills.forEach(skill => {
		graph.setNode("sk" + skill.id, skill);
		skill.nestedSkills.forEach(child => {
			const childName = "sk" + child;
			graph.setEdge("sk" + skill.id, childName);
			graph.setEdge(childName, "sk" + skill.id);
		});
	});
	return graph;
}

async function populateGraphWithLearningUnits(
	skills: ReadonlyArray<Skill>,
	learningUnits: ReadonlyArray<LearningUnit>,
	reverse = false
): Promise<GraphLib> {
	const graph = reverse
		? await populateGraphWithSkills(skills)
		: await populateGraphWithSkillsAndReverse(skills);
	learningUnits.forEach(lu => {
		graph.setNode("lu" + lu.id, lu);
		lu.requiredSkills.forEach(req => {
			graph.setEdge("sk" + req.id, "lu" + lu.id);
		});

		lu.teachingGoals.forEach(goal => {
			graph.setEdge("lu" + lu.id, "sk" + goal.id);
		});
	});
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
