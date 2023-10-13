import { LearningUnit, Path, Skill } from "../types";
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
				skill => !currentState.learnedSkills.some(learnedSkill => learnedSkill === skill.id)
			)
	);

	// Do not suggest learning units that do not teach any unknown skills
	return usefulLus.filter(lu =>
		lu.teachingGoals.some(skill => !currentState.learnedSkills.includes(skill.id))
	);
}

function computeCost<LU extends LearningUnit>(
	contextSwitchPenalty: number,
	lu: LU,
	currentNode: SearchNode<LU>,
	suggestionViolationPenalty = true,
	fnCost: CostFunction<LU>
) {
	const sameContext =
		contextSwitchPenalty !== 1
			? // Check if the current LU requires any skills that are provided by the LU of the currentNode, only if a penalty is defined
			  lu.teachingGoals.some(
					skill => currentNode.action?.requiredSkills.includes(skill) ?? true
			  )
			: true;

	const suggestionPenalty = suggestionViolationPenalty
		? // Identify all missing suggested skills in the current state
		  1 +
		  lu.suggestedSkills
				.filter(
					suggestion => !currentNode.state.learnedSkills.includes(suggestion.skill.id)
				)
				.map(suggestion => suggestion.weight)
				.reduce((a, b) => a + b, 0)
		: // No penalty for not following suggestions
		  1;

	const cost = sameContext
		? // Same context or no penalty defined
		  currentNode.cost + suggestionPenalty * fnCost(lu)
		: // Context switch -> apply penalty
		  currentNode.cost + contextSwitchPenalty * suggestionPenalty * fnCost(lu);
	return cost;
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
 * @param [contextSwitchPenalty=1.2] Penalty for switching the context, i.e., if a learning unit requires other skills than the last ones taught
 * 		  Must be equal to or greater than 1.
 *        If the penalty is 1, the context switch is free.
 * @param suggestionViolationPenalty If true, the cost of a learning unit is increased by the sum of the weights of all suggestions that are not fulfilled.
 */
export async function search<LU extends LearningUnit>(
	initialState: State,
	goal: Skill[],
	skills: ReadonlyArray<Skill>,
	luProvider: LUProvider<LU>,
	fnCost: CostFunction<LU>,
	fnHeuristic: HeuristicFunction<LU>,
	contextSwitchPenalty = 1.2,
	suggestionViolationPenalty = true
): Promise<Path | null> {
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
			const path = new Path();
			// Round at most 2 digits, based on: https://stackoverflow.com/a/11832950
			path.cost = Math.round((currentNode.cost + Number.EPSILON) * 100) / 100;
			let node = currentNode;
			while (node.parent !== null) {
				const lu = node.action;
				if (lu) {
					path.path.unshift(lu);
				}
				node = node.parent;
			}
			return path;
		}

		closedSet.push(currentNode.state);

		// Generate successors and add them to openList
		for (const lu of await availableActions(currentNode.state, luProvider)) {
			// Check if the LU of the currentNode provides any skills that are used by the current LU
			const cost = computeCost<LU>(
				contextSwitchPenalty,
				lu,
				currentNode,
				suggestionViolationPenalty,
				fnCost
			);

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
