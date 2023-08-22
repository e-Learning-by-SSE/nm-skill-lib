import { Graph as GraphLib, alg } from "@dagrejs/graphlib";
import { Edge, Graph, Skill, Node, LearningUnit, LearningUnitProvider } from "./types";

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
export async function isAcyclic(skills: ReadonlyArray<Skill>): Promise<boolean> {
	const graph = await populateGraphWithSkills(skills);
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
	desiredSkill,
	ownedSkill = []
}: {
	skills: ReadonlyArray<Skill>;
	luProvider: LearningUnitProvider;
	desiredSkill: Skill;
	ownedSkill?: Skill[];
}): Promise<ReadonlyArray<string>> {
	const dummyStartingSkill: Skill = {
		id: ":::empty::node::representing::no::knowledge / required skill:::",
		nestedSkills: [],
		repositoryId: ""
	};
	const learningUnits = await luProvider.getLearningUnitsBySkillIds(
		skills.map(skill => skill.id)
	);
	const graph = await populateGraphWithLearningUnits(
		[dummyStartingSkill, ...skills],
		learningUnits
	);
	graph.setEdge("sk" + dummyStartingSkill.id, "lu" + learningUnits[0].id);
	ownedSkill.forEach(skill => {
		graph.setEdge("sk" + dummyStartingSkill.id, "sk" + skill.id);
	});
	const paths = alg.dijkstra(graph, "sk" + dummyStartingSkill.id, null, null);
	const nodeIDs: string[] = [];
	let currentNode = "sk" + desiredSkill.id;
	do {
		nodeIDs.push(currentNode);
		const path = paths[currentNode];
		currentNode = path.predecessor;
	} while (currentNode !== "sk" + dummyStartingSkill.id);

	return nodeIDs
		.filter(nodeId => nodeId.startsWith("lu"))
		.map(nodeId => nodeId.slice(2))
		.reverse();
	// Return only IDs of LearningUnits
	// Consider reverse order (dijkstra returns a path starting from the goal)
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

async function populateGraphWithLearningUnits(
	skills: ReadonlyArray<Skill>,
	learningUnits: ReadonlyArray<LearningUnit>
): Promise<GraphLib> {
	const graph = await populateGraphWithSkills(skills);
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
