import { LearningUnit, Unit } from "../types";
import { SearchNode } from "./searchNode-new";
import { State } from "./state";

// Bucket type to store the search nodes and facilitate their replacement
type ListItem<LU extends LearningUnit> = {
    node: SearchNode<LU>;
};

/**
 * Stores the SearchNodes and provides:
 * - Access to the cheapest SearchNode by means of the heuristic (public access)
 * - Access by equal states to facilitate replacement of SearchNodes (internal access)
 * @author Sascha El-Sharkawy
 */
export class SearchNodeList<LU extends LearningUnit> {
    // Sorted list of states to be analyzed
    private openList: ListItem<LU>[] = [];
    // Open states identified by their hash code
    private openListMap = new Map<string, ListItem<LU>>();
    // List of duplicated SearchNodes states to be analyzed for alternatives
    private openListExtra: ListItem<LU>[] = [];

    constructor(initialState: State) {
        const item: ListItem<LU> = {
            node: new SearchNode<Unit<LU>>(initialState, null, null, 0, 0)
        };
        this.openList = [item];
        this.openListMap.set(item.node.state.toString(), item);
    }

    /**
     * Checks if the list ist empty.
     * @returns `true` if the list is empty, `false` otherwise.
     */
    isEmpty() {
        return this.openList.length === 0;
    }

    /**
     * Returns the SearchNode with the minimal heuristic cost.
     * @returns The SearchNode with the minimal heuristic cost or `undefined` if the list is empty.
     */
    pop() {
        if (this.isEmpty()) {
            return undefined;
        }

        // Find the index of the node with the lowest heuristic value in O(n)
        let lowestIndex = 0;
        for (let i = 1; i < this.openList.length; i++) {
            if (this.openList[i].node.heuristic < this.openList[lowestIndex].node.heuristic) {
                lowestIndex = i;
            }
        }

        // Return and remove the identified search node
        const [lowestElement] = this.openList.splice(lowestIndex, 1);
        this.openListMap.delete(lowestElement.node.state.getHashCode());
        return lowestElement.node;
    }

    /**
     * Adds a SearchNode to the list and avoids storing multiple SearchNodes for
     * obtaining the same state. In case the that such a SearchNode is already stored,
     * only the one with the minimal total cost is stored.
     * @param newNode The SearchNode to store.
     */
    add(newNode: SearchNode<LU>) {
        /* Check if node with same state is in openList */
        const existingNode = this.openListMap.get(newNode.state.getHashCode());

        if (existingNode) {
            this.openListExtra.push(existingNode);
            if (newNode.cost < existingNode.node.cost) {
                existingNode.node = newNode;
            }
        } else {
            const newItem: ListItem<LU> = {
                node: newNode
            };
            this.openList.push(newItem);
            this.openListMap.set(newNode.state.getHashCode(), newItem);
        }
    }

    /**
     * Adds a duplicated SearchNode to the openList from openListExtra.
     */
    addExtraNodes() {
        if (this.openListExtra.length > 0) {
            this.openList.push(this.openListExtra.pop()!);
        }
    }
}
