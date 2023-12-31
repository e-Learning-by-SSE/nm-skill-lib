import { LearningUnit, Skill } from "../types";

// Public/External types of the Fast Downward library
// SearchNode and State do not need to be exported outside of the library as they are not used in the public interface

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
