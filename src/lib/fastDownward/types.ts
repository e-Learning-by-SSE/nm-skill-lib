import { LearningUnit, Skill } from "../types";
import { State } from "./state";

/**
 * One node in the search tree.
 */
export class Node<LU extends LearningUnit> {
	constructor(
		public state: State,
		// The applied LearningUnit to reach this node from its predecessor
		// The root node has no action, all others must have one
		public action: LU | null,
		public parent: Node<LU> | null,
		public cost: number, // Cost from the start node
		public heuristic: number // Heuristic value
	) {}
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
