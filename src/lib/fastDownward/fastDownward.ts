import { LearningUnit, Skill } from "../types";
import { State } from "./state";
import { SearchNode, HeuristicFunction, CostFunction, LUProvider } from "./types";

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

// Implemented state-space search algorithm based on FAST-DOWNWARD algorithm.
// See: https://roboticseabass.com/2022/07/19/task-planning-in-robotics/
async function search<LU extends LearningUnit>(
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
		openList.sort((a, b) => a.cost + a.heuristic - (b.cost + b.heuristic));
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
			const newState = currentNode.state.deriveState(lu, skills);
			const newNode = new SearchNode<LU>(
				newState,
				lu,
				currentNode,
				fnCost(currentNode, lu),
				fnHeuristic(newState, goal, lu)
			);

			// Skip states that cannot reach the goal
			if (newNode.cost === Infinity || newNode.heuristic === Infinity) {
				continue;
			}

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

	return null;
}

/**
 * Searches for an optimal path to learn the desired Skills (goal) based on the given knowledge.
 *
 * By extending LU (must also be considered at the cost function and the heuristic) the algorithm
 * can be adapted to work with different LearningUnit types.
 *
 * @param knowledge The skills that are already known by the learner.
 * @param goal The skills that should be learned.
 * @param skills The set of all skills (independent of what was already learned and what should be learned).
 * @param lus The set of all LearningUnits.
 * @param fnCost Function to calculate the costs of reaching a Node based on an operation performed on its predecessor.
 * @param fnHeuristic Heuristic function to estimate the cost of reaching the goal from a given state.
 * @returns An array of LearningUnits that represent the optimal path to learn the desired skills, or null if there is no solution.
 */
export function findOptimalLearningPath<LU extends LearningUnit>({
	knowledge,
	goal,
	skills,
	lus,
	luProvider,
	fnCost,
	fnHeuristic
}: {
	knowledge: Skill[];
	goal: Skill[];
	skills: ReadonlyArray<Skill>;
	lus?: LU[];
	luProvider?: LUProvider<LU>;
	fnCost?: CostFunction<LU>;
	fnHeuristic?: HeuristicFunction<LU>;
}) {
	// Initial state: All skills of "knowledge" are known, no LearningUnits are learned
	const initialState = new State(
		knowledge.map(skill => skill.id),
		skills
	);

	// Default cost function: Increase the cost of the path by 1 for each learned LearningUnit
	// Maybe replaced by a more sophisticated cost function
	if (!fnCost) {
		fnCost = (prev, op) => prev.cost + 1;
	}

	// Default heuristic function: Always return 0
	// Maybe replaced by a more sophisticated heuristic function
	if (!fnHeuristic) {
		fnHeuristic = state => 0;
	}

	// Convert array of provided learningUnits if no provider was specified
	if (!luProvider) {
		if (!lus || lus.length === 0) {
			throw new Error("Either a LUProvider or a set of LearningUnits must be provided.");
		}
		luProvider = {
			// Return all LearningUnit for which all requirements are fulfilled
			loadLearnableCandidates: async (learnedSkillIds: string[]) =>
				lus.filter(lu =>
					lu.requiredSkills.every(prerequisite => learnedSkillIds.includes(prerequisite))
				)
		};
	}

	return search(initialState, goal, skills, luProvider, fnCost, fnHeuristic);
}
