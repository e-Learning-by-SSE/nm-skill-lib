import { filterForUnitsAndSkills } from "../backward-search/backward-search";
import { isCompositeGuard, LearningUnit, PartialPath, Selector, Skill, Unit } from "../types";
import { DistanceMap } from "./distanceMap";
import {
    CostFunction,
    HeuristicFunction,
    PenaltyOptions as CostOptions,
    DefaultCostParameter
} from "./fdTypes";
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
    selectors
}: {
    goal: Skill[];
    allUnits: ReadonlyArray<Unit<LU>>;
    allSkills: ReadonlyArray<Skill>;
    knowledge: Skill[];
    isComposite: isCompositeGuard<LU>;
    fnCost: CostFunction<LU>;
    costOptions: CostOptions;
    selectors?: Selector<LU>[];
}) {
    // Non recursive part of the search
    const globalKnowledge = new GlobalKnowledge(allSkills);

    return recursiveSearch(goal, knowledge, selectors);

    function recursiveSearch(goal: Skill[], knowledge: Skill[], selectors?: Selector<LU>[]) {
        // 1. Filter for scoped LearningUnits
        const scopedUnits = selectors
            ? allUnits.filter(unit => selectors.every(selector => selector(unit)))
            : allUnits;

        const [inScopeLearningUnits, inScopeSkills] = filterForUnitsAndSkills(
            goal,
            scopedUnits,
            allSkills,
            knowledge
        );

        // 2. Initialize recursion-dependent variables (state, heuristic, etc.)
        const initialState = new State(
            knowledge.map(skill => skill.id),
            globalKnowledge
        );

        const fnHeuristic = generateHeuristic(inScopeSkills, inScopeLearningUnits, fnCost);

        // 3. Actual search
        return fastDownwardSearch(goal, inScopeLearningUnits, initialState, fnHeuristic);
    }

    function fastDownwardSearch(
        goal: Skill[],
        scopedUnits: ReadonlyArray<Unit<LU>>,
        initialState: State,
        fnHeuristic: HeuristicFunction<LU>
    ) {
        // Sorted list of states to be analyzed
        const openList: SearchNodeList<LU> = new SearchNodeList<LU>(initialState);
        const closedSet = new Set<string>();

        while (!openList.isEmpty()) {
            const currentNode = openList.pop()!;

            // Check if goal is fulfilled -> Result found
            if (currentNode.state.goalFulfilled(goal)) {
                return generateResult(currentNode);
            }

            // Next iteration step
            const openGoals =
                goal.length > 1
                    ? goal.filter(skill => !currentNode.state.learnedSkills.includes(skill.id))
                    : goal;
            for (const unit of eligibleUnits(currentNode.state, scopedUnits)) {
                // Fictive cost of learning this unit via the used path
                let cost: number;
                if (isComposite(unit)) {
                    // Resolve composite
                    const subPath = recursiveSearch(
                        unit.teachingGoals,
                        currentNode.state.learnedSkills.map(
                            id => allSkills.find(skill => skill.id === id)!
                        ), // TODO SE: Either change type to string[] or use a map
                        unit.selectors
                    );

                    if (subPath) {
                        // Bonus: Composites should be preferred over single units
                        cost = costOptions.compositeReimbursement * subPath.cost;
                    } else {
                        // Composite couldn't be resolved -> Skip
                        continue;
                    }
                } else {
                    cost = computeCost(unit, currentNode, fnCost, costOptions);
                }

                const heuristic = fnHeuristic(openGoals, unit);

                // Skip states that cannot reach the goal
                if (cost === Infinity || heuristic === Infinity) {
                    continue;
                }

                const newState = currentNode.state.deriveState(unit, globalKnowledge);
                const newNode = new SearchNode<LU>(
                    newState,
                    unit, // TODO SE: Change this to subpath
                    currentNode,
                    cost,
                    cost + heuristic
                );

                // Skip states that are already analyzed
                if (closedSet.has(newState.getHashCode())) {
                    continue;
                }

                openList.add(newNode);
            }
        }

        // No path found
        return null;
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

function insertSorted<LU extends LearningUnit>(
    openList: SearchNode<Unit<LU>>[],
    newNode: SearchNode<LU>
) {
    if (openList.length == 0) {
        openList.push(newNode);
    } else if (openList[openList.length - 1].heuristic <= newNode.heuristic) {
        openList.push(newNode);
    } else if (openList[0].heuristic >= newNode.heuristic) {
        openList.unshift(newNode);
    } else {
        // Using bisection procedure to insert newNode to openList in sorted manner
        let low = 0;
        let high = openList.length - 1;
        let mid = 0;

        while (low <= high) {
            mid = Math.floor((low + high) / 2);
            if (openList[mid].heuristic > newNode.heuristic && mid - low > 1) {
                high = mid;
            } else if (openList[mid].heuristic < newNode.heuristic && high - mid > 1) {
                low = mid;
            } else {
                if (openList[mid].heuristic < newNode.heuristic) {
                    mid++;
                }
                openList.splice(mid, 0, newNode);
                mid = -1;
                break;
            }
        }

        if (mid !== -1) {
            openList.splice(mid, 0, newNode);
        }
    }
}

function generateResult<LU extends LearningUnit>(node: SearchNode<Unit<LU>>) {
    const result = new PartialPath<LU>();
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
    availableUnits: ReadonlyArray<Unit<LU>>
) {
    // Filter for LearningUnits that are reachable and useful:
    // - All required skills are learned
    // - At least one new teaching goal
    const usefulLus = availableUnits
        .filter(unit =>
            unit.requiredSkills.every(skill => currentState.learnedSkills.includes(skill.id))
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
    const prevLu = currentNode.action;
    if (
        penaltyOptions.contextSwitchPenalty !== 1 &&
        prevLu &&
        none(lu.requiredSkills, skill => prevLu.teachingGoals.includes(skill))
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
