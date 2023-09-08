import { LearningUnit, Skill } from "../types";
import { State } from "./state";

/**
 * One node in the search tree.
 */
export class SearchNode<LU extends LearningUnit> {
	constructor(
		public state: State,
		// The applied LearningUnit to reach this node from its predecessor
		// The root node has no action, all others must have one
		public action: LU | null,
		public parent: SearchNode<LU> | null,
		public cost: number, // Cost from the start node
		public heuristic: number // Heuristic total cost (real cost to current state + estimated cost to goal)
	) {}
}

/**
 * Function to calculate the costs of reaching a Node based on an operation performed on its predecessor.
 */
export type CostFunction<LU extends LearningUnit> = (operation: LU) => number;

/**
 * Heuristic function to estimate the cost of reaching the goal from a given state.
 * Must not overestimate the cost, but can underestimate it.
 * Infinity indicates that the goal cannot be reached at all and the step should be skipped.
 * @param goal The (open) goal to reach, i.e., the skills that should be learned and are not yet learned.
 * @param operation The LearningUnit that should be analyzed if it brings the user closer to the goal.
 * @returns The estimated cost of reaching the goal, between 0 and Infinity.
 */
export type HeuristicFunction<LU extends LearningUnit> = (goal: Skill[], operation: LU) => number;

/**
 * Provider that loads all LearningUnits that can be learned based on the given knowledge.
 */
export interface LUProvider<LU extends LearningUnit> {
	loadLearnableCandidates(learnedSkillIds: string[]): Promise<LU[]>;
}
