import { LearningUnit, Skill } from "../types";
import { State } from "./state";

/**
 * One node in the search tree.
 */
export class Node<LU extends LearningUnit> {
	state: State;
	action: LU; // The operator: Learn a LearningUnit
	parent: Node<LU> | null;
	cost: number; // Cost from the start node
	heuristic: number; // Heuristic value

	constructor(
		state: State,
		action: LU | null,
		parent: Node<LU> | null,
		cost: number,
		heuristic: number
	) {
		this.state = state;
		this.action = action; // The initial Node may have no operator, all others do!
		this.parent = parent;
		this.cost = cost; // Cost from the start node
		this.heuristic = heuristic; // Heuristic value
	}
}

/**
 * Function to calculate the costs of reaching a Node based on an operation performed on its predecessor.
 */
export type CostFunction<LU extends LearningUnit> = (previous: Node<LU>, operation: LU) => number;

/**
 * Heuristic function to estimate the cost of reaching the goal from a given state.
 * Must not overestimate the cost, but can underestimate it.
 */
export type HeuristicFunction = (state: State, goal: Skill[]) => number;
