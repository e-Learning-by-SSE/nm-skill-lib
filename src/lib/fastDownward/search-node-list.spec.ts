import { LearningUnit } from "../types";

import { GlobalKnowledge } from "./global-knowledge";
import { SearchNodeList } from "./search-node-list";
import { State } from "./state";

describe("search node list", () => {
    it("pop a node from empty search node list", async () => {
        // Create an empty global Knowledge
        const globalKnowledge = new GlobalKnowledge([]);

        // Create an empty initial state
        const initialState = new State([], globalKnowledge);

        // Create an openList with empty initial state
        const openList: SearchNodeList<LearningUnit> = new SearchNodeList<LearningUnit>(
            initialState
        );

        // Pop the only node in the list (default node with creation of the SearchNodeList)
        openList.pop();

        // Pop the empty SearchNodeList
        const node = openList.pop();

        // Node should be undefined
        expect(node).toBeUndefined();
    });
});
