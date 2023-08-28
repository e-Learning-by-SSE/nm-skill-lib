import { LearningUnit, Skill } from "../types";
import { State } from "./state";
import { Operator, Node, HeuristicFunction, CostFunction } from "./types";

/**
 * Compute which LearningUnits are reachable based on the given state.
 */
function availableOperators(currentState: State, lus: LearningUnit[]) {
	const reachableLus = lus.filter(lu =>
		lu.requiredSkills.every(skill =>
			currentState.learnedSkills.some(learnedSkill => learnedSkill === skill)
		)
	);

	// Avoid operators that are already in the current state
	// Ideally we would check that the LEarningUnits are not learned twice
	// However, we can also check that we always learn at leas one new skill
	const usefulLus = reachableLus.filter(lu =>
		lu.teachingGoals.some(
			skill => !currentState.learnedSkills.some(learnedSkill => learnedSkill === skill)
		)
	);

	return usefulLus.map(lu => new Operator(lu));
}

// Implemented state-space search algorithm based on FAST-DOWNWARD algorithm.
// See: https://roboticseabass.com/2022/07/19/task-planning-in-robotics/
function search(
	initialState: State,
	goal: Skill[],
	skills: ReadonlyArray<Skill>,
	lus: LearningUnit[],
	fnCost: CostFunction,
	fnHeuristic: HeuristicFunction
): Operator[] | null {
	const openList: Node[] = [
		new Node(initialState, null, null, 0, fnHeuristic(initialState, goal))
	];
	const closedSet: State[] = [];

	while (openList.length > 0) {
		openList.sort((a, b) => a.cost + a.heuristic - (b.cost + b.heuristic));
		const currentNode = openList.shift()!;

		/* Check if currentNode.state is the goal state */
		if (currentNode.state.goalFulfilled(goal)) {
			// Build and return the path
			const path: Operator[] = [];
			let node = currentNode;
			while (node.parent !== null) {
				path.unshift(node.action);
				node = node.parent;
			}
			return path;
		}

		closedSet.push(currentNode.state);

		// Generate successors and add them to openList
		for (const operator of availableOperators(currentNode.state, lus)) {
			const newState = currentNode.state.deriveState(operator, skills);
			const newNode = new Node(
				newState,
				operator,
				currentNode,
				fnCost(currentNode, operator),
				fnHeuristic(newState, goal)
			);

			// Skip states that are already analyzed
			if (closedSet.some(state => state.equal(newState))) {
				continue;
			}

			/* Check if node with same state is in openList */
			const existingNode = openList.find(node => node.state.equal(newState));
			if (existingNode) {
				if (newNode.cost < existingNode.cost) {
					existingNode.cost = newNode.cost;
					existingNode.parent = newNode.parent;
				}
			} else {
				openList.push(newNode);
			}
		}
	}

	return null; // No solution found
}

export function findOptimalLearningPath(
	knowledge: Skill[],
	goal: Skill[],
	skills: ReadonlyArray<Skill>,
	lus: LearningUnit[]
) {
	// Initial state: All skills of "knowledge" are known, no LearningUnits are learned
	const initialState = new State(
		knowledge.map(skill => skill.id),
		skills
	);

	// Default cost function: Increase the cost of the path by 1 for each learned LearningUnit
	// Maybe replaced by a more sophisticated cost function
	const fnConst: CostFunction = (prev, op) => prev.cost + 1;

	// Default heuristic function: Always return 0
	// Maybe replaced by a more sophisticated heuristic function
	const fnHeuristic: HeuristicFunction = state => 0;

	return search(initialState, goal, skills, lus, fnConst, fnHeuristic)?.map(
		step => step.learningUnit
	);
}
