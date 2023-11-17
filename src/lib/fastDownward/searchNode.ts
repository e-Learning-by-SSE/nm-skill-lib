import { LearningUnit } from "../types";
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

	// /**
	//  * Returns a string representation of the SearchNode for debugging purposes.
	//  * @returns The path (IDs of the LearningUnits) from the root node to this node and its cost.
	//  */
	// public toString(): string {
	// 	let str = this.action.id;
	// 	let node = this.parent;
	// 	while (node !== null) {
	// 		str = node.action.id + ", " + str;
	// 		node = node.parent;
	// 	}

	// 	str += " (" + this.cost + ")";

	// 	return str;
	// }
}
