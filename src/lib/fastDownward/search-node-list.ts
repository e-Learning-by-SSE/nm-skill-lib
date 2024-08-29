import { LearningUnit, Unit } from "../types";
import { SearchNode } from "./searchNode";
import { State } from "./state";

// Bucket type to store the search nodes and facilitate their replacement
type ListItem<LU extends LearningUnit> = {
    node: SearchNode<LU>;
};

export class SearchNodeList<LU extends LearningUnit> {
    // Sorted list of states to be analyzed
    private openList: ListItem<LU>[] = [];
    // Open states identified by their hash code
    private openListMap = new Map<string, ListItem<LU>>();

    constructor(initialState: State) {
        const item: ListItem<LU> = {
            node: new SearchNode<Unit<LU>>(initialState, null, null, 0, 0)
        };
        this.openList = [item];
        this.openListMap.set(item.node.state.toString(), item);
    }

    isEmpty() {
        return this.openList.length === 0;
    }

    pop() {
        const item = this.openList.shift();
        if (item) {
            this.openListMap.delete(item.node.state.toString());
            return item.node;
        }
        return undefined;
    }

    add(newNode: SearchNode<LU>) {
        /* Check if node with same state is in openList */
        const existingNode = this.openListMap.get(newNode.state.getHashCode());

        if (existingNode) {
            if (newNode.cost < existingNode.node.cost) {
                existingNode.node = newNode;
            }
        } else {
            // Inserting newNode to openList in sorted manner
            this.insertSorted(newNode);
        }
    }

    private insertSorted(node: SearchNode<LU>) {
        const newItem: ListItem<LU> = {
            node
        };

        if (this.openList.length == 0) {
            this.openList.push(newItem);
        } else if (this.openList[this.openList.length - 1].node.heuristic <= node.heuristic) {
            this.openList.push(newItem);
        } else if (this.openList[0].node.heuristic >= node.heuristic) {
            this.openList.unshift(newItem);
        } else {
            // Using bisection procedure to insert newNode to openList in sorted manner
            let low = 0;
            let high = this.openList.length - 1;
            let mid = 0;

            while (low <= high) {
                mid = Math.floor((low + high) / 2);
                if (this.openList[mid].node.heuristic > node.heuristic && mid - low > 1) {
                    high = mid;
                } else if (this.openList[mid].node.heuristic < node.heuristic && high - mid > 1) {
                    low = mid;
                } else {
                    if (this.openList[mid].node.heuristic < node.heuristic) {
                        mid++;
                    }
                    this.openList.splice(mid, 0, newItem);
                    mid = -1;
                    break;
                }
            }

            if (mid !== -1) {
                this.openList.splice(mid, 0, newItem);
            }

            this.openListMap.set(node.state.getHashCode(), newItem);
        }
    }
}
