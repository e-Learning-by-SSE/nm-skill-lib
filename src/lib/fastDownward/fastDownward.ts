import { Variable } from "../ast/variable";
import { filterForUnitsAndSkills } from "../backward-search/backward-search";
import { isCompositeGuard, LearningUnit, Path, Selector, Skill, Unit } from "../types";
import { DistanceMap } from "./distanceMap";
import { CostFunction, HeuristicFunction, CostOptions, DefaultCostParameter } from "./fdTypes";
import { GlobalKnowledge } from "./global-knowledge";
import { SearchNodeList } from "./search-node-list";
import { SearchNode } from "./searchNode";
import { State } from "./state";

export function search<LU extends LearningUnit>({
    goal,
    allUnits,
    allSkills,
    knowledge,
    isComposite,
    fnCost,
    costOptions = DefaultCostParameter,
    selectors,
    alternatives = 1, // alternatives method
    withoutSkills
}: {
    goal: Skill[];
    allUnits: ReadonlyArray<Unit<LU>>;
    allSkills: ReadonlyArray<Skill>;
    knowledge: Skill[];
    isComposite: isCompositeGuard<LU>;
    fnCost: CostFunction<LU>;
    costOptions: CostOptions;
    selectors?: Selector<LU>[];
    alternatives?: number; // alternatives method
    withoutSkills?: Variable[];
}) {
    // Non recursive part of the search
    const globalKnowledge = new GlobalKnowledge(allSkills);

    // Invariants of recursion: allUnits, allSkills, isComposite, fnCost, costOptions, globalKnowledge

    return recursiveSearch(goal, knowledge, alternatives, selectors, undefined, withoutSkills);

    function recursiveSearch(
        goal: Skill[],
        knowledge: Skill[],
        alternatives: number, // alternatives method
        selectors?: Selector<LU>[],
        parentUnits?: ReadonlyArray<Unit<LU>>,
        withoutSkills?: Variable[]
    ) {
        // 1. Avoid returning the composite unit or the parent units as a result
        if (parentUnits) {
            const avoidCompositeSelector = (u: Unit<LU>) => !parentUnits?.includes(u);
            selectors = [avoidCompositeSelector].concat(selectors || []);
        }

        // 2. Filter for scoped LearningUnits
        const scopedUnits = selectors
            ? allUnits.filter(unit => selectors?.every(selector => selector(unit)))
            : allUnits;

        const [inScopeLearningUnits, inScopeSkills] = filterForUnitsAndSkills(
            goal,
            scopedUnits,
            allSkills,
            knowledge
        );

        // 3. Initialize recursion-dependent variables (state, heuristic, etc.)
        const initialState = new State(
            knowledge.map(skill => skill.id),
            globalKnowledge
        );

        const fnHeuristic = generateHeuristic(inScopeSkills, inScopeLearningUnits, fnCost);

        // 4. Actual search
        return fastDownwardSearch(
            goal,
            inScopeLearningUnits,
            initialState,
            fnHeuristic,
            alternatives, // alternatives method
            parentUnits,
            withoutSkills
        );
    }

    function fastDownwardSearch(
        goal: Skill[],
        scopedUnits: ReadonlyArray<Unit<LU>>,
        initialState: State,
        fnHeuristic: HeuristicFunction<LU>,
        alternatives: number, // alternatives method
        parentUnits?: ReadonlyArray<Unit<LU>>,
        withoutSkills?: Variable[]
    ) {
        // Sorted list of states to be analyzed
        const openList: SearchNodeList<LU> = new SearchNodeList<LU>(initialState);
        const Paths: Path<LU>[] = [];

        while (!openList.isEmpty()) {
            const currentNode = openList.pop()!;

            // Check if goal is fulfilled -> Result found
            if (currentNode.state.goalFulfilled(goal)) {
                // alternatives method
                Paths.unshift(generateResult(currentNode));
                if (alternatives == Paths.length) {
                    return Paths;
                }
            }

            // Next iteration step
            const openGoals =
                goal.length > 1
                    ? goal.filter(skill => !currentNode.state.learnedSkills.includes(skill.id))
                    : goal;
            for (const unit of eligibleUnits(
                currentNode.state,
                scopedUnits,
                globalKnowledge,
                withoutSkills
            )) {
                // Fictive cost of learning this unit via the used path
                let cost: number;
                let subPath: Path<LU> = new Path<LU>();
                if (isComposite(unit)) {
                    // Resolve composite
                    subPath = recursiveSearch(
                        unit.teachingGoals,
                        currentNode.state.learnedSkills.map(
                            id => allSkills.find(skill => skill.id === id)!
                        ), // TODO SE: Either change type to string[] or use a map
                        1, // One alternative path for the subPath
                        unit.selectors,
                        [unit].concat(parentUnits!)
                    )?.pop()!;

                    if (subPath) {
                        // Bonus: Composites should be preferred over single units
                        cost = currentNode.cost + costOptions.compositeReimbursement * subPath.cost;
                    } else {
                        // Composite couldn't be resolved -> Skip
                        continue;
                    }
                } else {
                    cost = computeCost(unit, currentNode, fnCost, costOptions);
                }

                // Record the origin unit for the partial path and the it's cost
                subPath.origin = unit;
                subPath.cost = cost;

                const heuristic = fnHeuristic(openGoals, unit);

                // Skip states that cannot reach the goal
                if (cost === Infinity || heuristic === Infinity) {
                    continue;
                }

                const newState = currentNode.state.deriveState(unit, globalKnowledge);
                const newNode = new SearchNode<LU>(
                    newState,
                    subPath, // TODO SE: Change this to subpath
                    currentNode,
                    cost,
                    cost + heuristic
                );

                openList.add(newNode);
            }

            // alternatives method
            // Add the duplicated SearchNodes states to be analyzed for alternatives
            if (alternatives > Paths.length && openList.isEmpty()) {
                openList.addExtraNodes();
            }
        }

        // return Paths list, empty means no path found
        return Paths;
    }
}

function generateHeuristic<LU extends LearningUnit>(
    inScopeSkills: Skill[],
    inScopeLearningUnits: LU[],
    fnCost: CostFunction<LU>
) {
    const distances = new DistanceMap(inScopeSkills, inScopeLearningUnits, fnCost);
    const fnHeuristic: HeuristicFunction<LU> = (goal: Skill[], lu) => {
        const min = distances.getDistances(
            lu.id,
            goal.map(skill => skill.id)
        );
        return min;
    };
    return fnHeuristic;
}

function generateResult<LU extends LearningUnit>(node: SearchNode<Unit<LU>>) {
    const result = new Path<LU>();
    result.cost = node.cost;
    while (node.parent !== null) {
        const lu = node.action;
        if (lu) {
            result.path.unshift(lu);
        }
        node = node.parent;
    }
    return result;
}

/**
 * Compute which Units (LearningUnit | Composite) are reachable based on the given state.
 */
function eligibleUnits<LU extends LearningUnit>(
    currentState: State,
    availableUnits: ReadonlyArray<Unit<LU>>,
    globalKnowledge: GlobalKnowledge,
    withoutSkills?: Variable[]
) {
    // Filter for LearningUnits that are reachable and useful:
    // - All required skills are learned
    // - At least one new teaching goal

    const usefulLus = availableUnits
        .filter(
            unit =>
                unit.requiredSkills.evaluate(
                    currentState.learnedSkills,
                    globalKnowledge,
                    withoutSkills
                )
            //.every(skill => currentState.learnedSkills.includes(skill.id))
        )
        .filter(unit =>
            // Do not suggest learning units that do not teach any new skills
            unit.teachingGoals.some(skill => !currentState.learnedSkills.includes(skill.id))
        );

    return usefulLus;
}

function none(arr: Skill[], callback: (skill: Skill) => boolean) {
    return arr.length > 0 && !arr.some(callback);
}

export function computeCost<LU extends LearningUnit>(
    lu: LU,
    currentNode: SearchNode<LU>,
    fnCost: CostFunction<LU>,
    penaltyOptions: CostOptions
) {
    // If penalty is defined: Add penalty if LU does not need any of previously learned skills
    let contextSwitchPenalty = 1;
    const prevLu = currentNode.action?.origin;
    if (
        penaltyOptions.contextSwitchPenalty !== 1 &&
        prevLu &&
        none(lu.requiredSkills.extractSkills(), skill => prevLu.teachingGoals.includes(skill))
    ) {
        contextSwitchPenalty = penaltyOptions.contextSwitchPenalty;
    }

    // If penalty is defined: Add penalty for each missed suggestion
    let suggestionPenalty = 1;
    if (penaltyOptions.suggestionViolationPenalty > 0) {
        const missedSuggestions = lu.suggestedSkills.filter(
            s => !currentNode.state.learnedSkills.includes(s.skill.id)
        );

        suggestionPenalty =
            1 +
            missedSuggestions.reduce((a, b) => a + penaltyOptions.suggestionViolationPenalty, 0);
    }
    return currentNode.cost + contextSwitchPenalty * suggestionPenalty * fnCost(lu);
}
