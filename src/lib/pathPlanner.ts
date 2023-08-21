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
 * @param pathTarget The skill to find the path for.
 * @returns A Promise that resolves to an array of node IDs representing the path.
 */
export async function pathForSkill(
	skills: ReadonlyArray<Skill>,
	pathTarget: Skill // TODO what to do here?
): Promise<ReadonlyArray<string>> {
	const emptySkill: Skill = {
		id: ":::empty::node::representing::no::knowledge / required skill:::",
		nestedSkills: [],
		repositoryId: ""
	};

	const graph = await populateGraphWithSkills([...skills, emptySkill]);
	return alg
		.preorder(graph, ["sk" + emptySkill.id])
		.filter(nodeId => nodeId.startsWith("lu"))
		.map(nodeId => nodeId.slice(2));
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
