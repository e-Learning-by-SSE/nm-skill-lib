import { LearningUnit, Skill } from "../types";
import { State } from "./state";

export class Operator {
	constructor(public learningUnit: LearningUnit) {}
}

export class Node {
	state: State;
	action: Operator;
	parent: Node | null;
	cost: number; // Cost from the start node
	heuristic: number; // Heuristic value

	constructor(
		state: State,
		action: Operator | null,
		parent: Node | null,
		cost: number,
		heuristic: number
	) {
		this.state = state;
		this.action = action;
		this.parent = parent;
		this.cost = cost; // Cost from the start node
		this.heuristic = heuristic; // Heuristic value
	}
}

/**
 * Function to calculate the costs of reaching a Node based on an operation performed on its predecessor.
 */
export type CostFunction = (previous: Node, operation: Operator) => number;

/**
 * Heuristic function to estimate the cost of reaching the goal from a given state.
 * Must not overestimate the cost, but can underestimate it.
 */
export type HeuristicFunction = (state: State, goal: Skill[]) => number;
