import { LearningUnit, Skill } from "../types";
import { SearchNode } from "./searchNode";
import { State } from "./state";
import { HeuristicFunction, CostFunction, LUProvider } from "./fdTypes";

/**
 * Compute which LearningUnits are reachable based on the given state.
 */
async function availableActions<LU extends LearningUnit>(
	currentState: State,
	luProvider: LUProvider<LU>
) {
	// Avoid operators that are already in the current state
	// Ideally we would check that the LearningUnits are not learned twice
	// However, we can also check that we always learn at least one new skill
	const usefulLus = (await luProvider.loadLearnableCandidates(currentState.learnedSkills)).filter(
		lu =>
			lu.teachingGoals.some(
				skill => !currentState.learnedSkills.some(learnedSkill => learnedSkill === skill)
			)
	);

	// Do not suggest learning units that do not teach any unknown skills
	return usefulLus.filter(lu =>
		lu.teachingGoals.some(skill => !currentState.learnedSkills.includes(skill))
	);
}

/**
 * Implemented state-space search algorithm based on FAST-DOWNWARD algorithm.
 * @see https://roboticseabass.com/2022/07/19/task-planning-in-robotics/
 * @param initialState The initial state of the search (should contain all skills that are already known).
 * @param goal The skills that should be learned (should not contain skills that are already known).
 * @param skills The set of all skills (independent of what was already learned and what should be learned).
 * @param luProvider Provider to load all LearningUnits dynamically that are reachable from the current state.
 * @param fnCost Function to calculate the costs of reaching a new state based on learning a LearningUnit on its predecessor.
 * @param fnHeuristic Heuristic function to estimate the cost of reaching the goal from a given state, must not overestimate the cost.
 *        Returns Infinity if the goal cannot be reached from the given state.
 */
export async function search<LU extends LearningUnit>(
	initialState: State,
	goal: Skill[],
	skills: ReadonlyArray<Skill>,
	luProvider: LUProvider<LU>,
	fnCost: CostFunction<LU>,
	fnHeuristic: HeuristicFunction<LU>
): Promise<LU[] | null> {
	const openList: SearchNode<LU>[] = [
		new SearchNode<LU>(initialState, null, null, 0, 0) //fnHeuristic(initialState, goal)
	];
	const closedSet: State[] = [];

	while (openList.length > 0) {
		openList.sort((a, b) => a.heuristic - b.heuristic);
		const currentNode = openList.shift()!;

		/* Check if currentNode.state is the goal state */
		if (currentNode.state.goalFulfilled(goal)) {
			// Build and return the path
			const path: LU[] = [];
			let node = currentNode;
			while (node.parent !== null) {
				const lu = node.action;
				if (lu) {
					path.unshift(lu);
				}
				node = node.parent;
			}
			return path;
		}

		closedSet.push(currentNode.state);

		// Generate successors and add them to openList
		for (const lu of await availableActions(currentNode.state, luProvider)) {
			const cost = currentNode.cost + fnCost(lu);
			const openGoals =
				goal.length > 1
					? goal.filter(skill => !currentNode.state.learnedSkills.includes(skill.id))
					: goal;
			const heuristic = fnHeuristic(openGoals, lu);

			// Skip states that cannot reach the goal
			if (cost === Infinity || heuristic === Infinity) {
				continue;
			}

			const newState = currentNode.state.deriveState(lu, skills);
			const newNode = new SearchNode<LU>(newState, lu, currentNode, cost, cost + heuristic);

			// Skip states that are already analyzed
			if (closedSet.some(state => state.equal(newState))) {
				continue;
			}

			/* Check if node with same state is in openList */
			const existingNode = openList.find(node => node.state.equal(newState));
			if (existingNode) {
				if (newNode.cost < existingNode.cost) {
					existingNode.cost = newNode.cost;
					existingNode.heuristic = newNode.heuristic;
					existingNode.parent = newNode.parent;
				}
			} else {
				openList.push(newNode);
			}
		}
	}

	return null;
}
