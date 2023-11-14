import { LearningUnit, Path, Skill } from "../types";
import { search } from "./fastDownward";
import { State } from "./state";
import { CostFunction, HeuristicFunction } from "./fdTypes";
import { GlobalKnowledge } from "./global-knowledge";

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
function findOptimalLearningPath<LU extends LearningUnit>({
	knowledge,
	goal,
	skills,
	learningUnits,
	fnCost,
	fnHeuristic,
	contextSwitchPenalty = 1.2,
	alternatives,
	alternativesTimeout
}: {
	knowledge: Skill[];
	goal: Skill[];
	skills: ReadonlyArray<Skill>;
	learningUnits: ReadonlyArray<LU>;
	fnCost?: CostFunction<LU>;
	fnHeuristic?: HeuristicFunction<LU>;
	contextSwitchPenalty?: number;
	alternatives: number;
	alternativesTimeout: number | null;
}): Promise<Path[] | null> {
	// Initial state: All skills of "knowledge" are known, no LearningUnits are learned
	const globalKnowledge = new GlobalKnowledge(skills);
	const initialState = new State(
		knowledge.map(skill => skill.id),
		globalKnowledge
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

	return search(
		initialState,
		goal,
		globalKnowledge,
		learningUnits,
		fnCost,
		fnHeuristic,
		contextSwitchPenalty
	);
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
 * @param learningUnits The set of all LearningUnits.
 * @param fnCost Function to calculate the costs of reaching a Node based on an operation performed on its predecessor.
 * @param fnHeuristic Heuristic function to estimate the cost of reaching the goal from a given state.
 * @returns An array of LearningUnits that represent the optimal path to learn the desired skills, or null if there is no solution.
 */
async function findGreedyLearningPath<LU extends LearningUnit>({
	knowledge,
	goal,
	skills,
	learningUnits,
	fnCost,
	fnHeuristic,
	contextSwitchPenalty = 1.2,
	alternatives,
	alternativesTimeout
}: {
	knowledge: Skill[];
	goal: Skill[];
	skills: ReadonlyArray<Skill>;
	learningUnits: ReadonlyArray<LU>;
	fnCost?: CostFunction<LU>;
	fnHeuristic?: HeuristicFunction<LU>;
	contextSwitchPenalty?: number;
	alternatives: number;
	alternativesTimeout: number | null;
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

	const pathResult = new Path();
	for (const child of flattenGoal) {
		// Find local optimal path for the current partial goal
		const path = findOptimalLearningPath({
			knowledge,
			goal: [child],
			skills,
			learningUnits,
			fnCost,
			fnHeuristic,
			contextSwitchPenalty,
			alternatives,
			alternativesTimeout
		});

		const partialPath = await path;
		if (partialPath) {
			// Glue partial paths together and add learned skills to the knowledge to avoid learning them twice
			pathResult.path.push(...partialPath.values().next().value.path);
			pathResult.cost += partialPath.values().next().value.cost;
			const learnedSkills = partialPath
				.values()
				.next()
				.value.path.map((lu: { id: string }) => learningUnits.find(l => l.id === lu.id)!)
				.flatMap((lu: { teachingGoals: any }) => lu.teachingGoals);
			// .map(goal => skills.find(skill => skill === goal)!);
			knowledge = [...knowledge, ...learnedSkills];
		} else {
			// There exist no path for one of the children, so there is no path for the whole goal
			return null;
		}
	}

	const pathList: Path[] = [];
	pathList.push(pathResult);
	return pathList;
}

/**
 * Searches for an (optimal) path to learn the desired Skills (goal) based on the given knowledge.
 *
 * In case of selecting the greedy-strategy, it's not guaranteed that the returned path is optimal.
 * However, the algorithm will detect local optimums (for each partial goal / child of the goal) and will avoid to learn LearningUnits multiple times.
 * Thus, the result should be a valid path and still optimal in many cases.
 *
 * By extending LU (must also be considered at the cost function and the heuristic) the algorithm
 * can be adapted to work with different LearningUnit types.
 *
 * @param knowledge The skills that are already known by the learner.
 * @param goal The skills that should be learned.
 * @param skills The set of all skills (independent of what was already learned and what should be learned).
 * @param learningUnits The set of all LearningUnits.
 * @param optimalSolution If true, the algorithm will guarantee an optimal solution, but may take very long.
 * @param fnCost Function to calculate the costs of reaching a Node based on an operation performed on its predecessor.
 * @param fnHeuristic Heuristic function to estimate the cost of reaching the goal from a given state.
 * @returns An array of LearningUnits that represent the optimal path to learn the desired skills, or null if there is no solution.
 */
export async function findLearningPath<LU extends LearningUnit>({
	knowledge,
	goal,
	skills,
	learningUnits,
	optimalSolution = false,
	fnCost,
	fnHeuristic,
	contextSwitchPenalty = 1.2,
	alternatives,
	alternativesTimeout
}: {
	knowledge: Skill[];
	goal: Skill[];
	skills: ReadonlyArray<Skill>;
	learningUnits: ReadonlyArray<LU>;
	optimalSolution?: boolean;
	fnCost?: CostFunction<LU>;
	fnHeuristic?: HeuristicFunction<LU>;
	contextSwitchPenalty?: number;
	alternatives: number;
	alternativesTimeout: number | null;
}) {
	return optimalSolution
		? // Guarantees an optimal solution, but may take very long
		  findOptimalLearningPath({
				knowledge,
				goal,
				skills,
				learningUnits,
				fnCost,
				fnHeuristic,
				contextSwitchPenalty,
				alternatives,
				alternativesTimeout
		  })
		: // Splits goal into sub goals, finds optimal solutions for each sub goal and glues them together
		  // This is much faster, but won't guarantee a global optimum
		  findGreedyLearningPath({
				knowledge,
				goal,
				skills,
				learningUnits,
				fnCost,
				fnHeuristic,
				contextSwitchPenalty,
				alternatives,
				alternativesTimeout
		  });
}
