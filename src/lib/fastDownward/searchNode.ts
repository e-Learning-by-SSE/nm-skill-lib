import { LearningUnit, Path } from "../types";
import { State } from "./state";

/**
 * One node in the search tree.
 */
export class SearchNode<LU extends LearningUnit> {
    constructor(
        public state: State,
        // The applied LearningUnit to reach this node from its predecessor
        // The root node has no action, all others must have one
        public action: Path<LU> | null,
        public parent: SearchNode<LU> | null,
        public cost: number, // Cost from the start node
        public heuristic: number // Heuristic total cost (real cost to current state + estimated cost to goal)
    ) {}

    /**
     * Returns a string representation of the SearchNode for debugging purposes.
     * @returns The path (IDs of the LearningUnits) from the root node to this node and its cost.
     */
    public toString(): string {
        let str = "";
        let node: SearchNode<LU> | null = this;
        while (node !== null) {
            if (node.action !== null) {
                str = node.action.origin!.id + ", " + str;
            }
            node = node.parent;
        }

        // Remove last, dangling comma
        if (str.length > 2) {
            str = str.slice(0, -2);
        }

        str += " (" + this.cost + ")";

        return str;
    }
}
