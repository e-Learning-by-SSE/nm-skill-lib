import { Graph as GraphLib, alg, Edge as GraphEdge } from "@dagrejs/graphlib";
import { Edge, Graph, Skill, Node, LearningUnit, LearningUnitProvider } from "./types";
import { findOptimalLearningPath } from "./fastDownward/fastDownward";
import { findOptimalLearningPathReverse } from "./fastDownwardReverse/fastDownwardReverse";
import { CostFunction, HeuristicFunction } from "./fastDownward/types";
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
	luProvider: LearningUnitProvider,
	skills: ReadonlyArray<Skill>
): Promise<Graph> {
	const learningUnits = await luProvider.getLearningUnitsBySkillIds(
		skills.map(skill => skill.id)
	);
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
 * @param luProvider The learning unit provider to use for populating the graph.
 * @param goalDef The goal definition to use for finding the path.
 * @returns A Promise that resolves to an array of node IDs representing the path.
 */
export async function getPath({
	skills,
	luProvider,
	desiredSkills,
	ownedSkill = []
}: {
	skills: ReadonlyArray<Skill>;
	luProvider: LearningUnitProvider;
	desiredSkills: Skill[];
	ownedSkill?: Skill[];
}): Promise<ReadonlyArray<string>> {
	const lus = await luProvider.getLearningUnitsBySkillIds(skills.map(skill => skill.id));

	const distances = new DistanceMap(skills, lus);
	// console.log(distances.toString());

	const fnHeuristic: HeuristicFunction<LearningUnit> = (state, goal: Skill[], lu) => {
		const min = distances.getDistances(
			lu.id,
			desiredSkills.map(skill => skill.id)
		);
		return min;
	};

	return (
		(
			await findOptimalLearningPath({
				knowledge: ownedSkill,
				goal: desiredSkills,
				skills: skills,
				lus: lus,
				fnHeuristic: fnHeuristic
			})
		)?.map(lu => lu.id) ?? []
	);

	// const path = findOptimalLearningPathReverse(ownedSkill, desiredSkills, skills, lus);
	// return path?.map(lu => lu.id) ?? [];
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
			graph.setEdge("sk" + req, "lu" + lu.id);
		});

		lu.teachingGoals.forEach(goal => {
			graph.setEdge("lu" + lu.id, "sk" + goal);
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
