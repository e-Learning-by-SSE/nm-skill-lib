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
		fnCost = op => 1;
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

/**
 * Searches for an (optimal) path to learn the desired Skills (goal) based on the given knowledge, but uses an more greedy approach to discover child skills of the goal.
 *
 * As this approach uses a greedy-strategy, it's not guaranteed that the returned path is optimal.
 * However, the algorithm will detect local optimums (for each partial goal / child of the goal) and will avoid to learn LearningUnits multiple times.
 * Thus, the result should be a valid path and still optimal in many cases.
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
export async function findGreedyLearningPath<LU extends LearningUnit>({
	knowledge,
	goal,
	skills,
	lus,
	fnCost,
	fnHeuristic
}: {
	knowledge: Skill[];
	goal: Skill[];
	skills: ReadonlyArray<Skill>;
	lus: LU[];
	fnCost?: CostFunction<LU>;
	fnHeuristic?: HeuristicFunction<LU>;
}) {
	/**
	 * Iterate through the goal child by child.
	 * For each child, find the optimal path and add the learned skills to the knowledge before learning the next child.
	 * Compose the paths to a single path.
	 * It's not guaranteed that this path is optimal, but it's guaranteed that it's a valid path.
	 */
	// TODO: Only children of the first layer are discovered, we could split the goal further
	const flattenGoal: Skill[] = [];
	goal.forEach(skill => {
		if (skill.nestedSkills.length > 0) {
			flattenGoal.push(
				...skill.nestedSkills.map(childId => skills.find(skill => skill.id === childId)!)
			);
		} else {
			flattenGoal.push(skill);
		}
	});

	const pathResult: LU[] = [];
	for (const child of flattenGoal) {
		// Find local optimal path for the current partial goal
		const path = findOptimalLearningPath({
			knowledge,
			goal: [child],
			skills,
			lus,
			fnCost,
			fnHeuristic
		});

		const pathLuIds = await path;
		if (pathLuIds) {
			// Glue partial paths together and add learned skills to the knowledge to avoid learning them twice
			pathResult.push(...pathLuIds);
			const learnedSkills = pathLuIds
				.map(lu => lus.find(l => l.id === lu.id)!)
				.flatMap(lu => lu.teachingGoals)
				.map(skillId => skills.find(skill => skill.id === skillId)!);
			knowledge = [...knowledge, ...learnedSkills];
		} else {
			// There exist no path for one of the children, so there is no path for the whole goal
			return null;
		}
	}

	return pathResult;
}

export async function findLearningPath<LU extends LearningUnit>({
	knowledge,
	goal,
	skills,
	lus,
	optimalSolution = false,
	fnCost,
	fnHeuristic
}: {
	knowledge: Skill[];
	goal: Skill[];
	skills: ReadonlyArray<Skill>;
	lus: LU[];
	optimalSolution?: boolean;
	fnCost?: CostFunction<LU>;
	fnHeuristic?: HeuristicFunction<LU>;
}) {
	return optimalSolution
		? // Guarantees an optimal solution, but may take very long
		  findOptimalLearningPath({
				knowledge,
				goal,
				skills,
				lus,
				fnCost,
				fnHeuristic
		  })
		: // Splits goal into sub goals, finds optimal solutions for each sub goal and glues them together
		  // This is much faster, but won't guarantee a global optimum
		  findGreedyLearningPath({
				knowledge,
				goal,
				skills,
				lus,
				fnCost,
				fnHeuristic
		  });
}
