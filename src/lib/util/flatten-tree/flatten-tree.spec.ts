import { flattenTree } from "./flatte-tree";

describe("flattenTree", () => {
	it("should flatten a tree", () => {
		type Test = {
			id: string;
			children: Test[];
		};

		const treeNode: Test = {
			id: "1",
			children: [
				{
					id: "2",
					children: [
						{
							id: "3",
							children: []
						}
					]
				}
			]
		};

		const expected = [treeNode, treeNode.children[0], treeNode.children[0].children[0]];

		const result = flattenTree(treeNode);
		expect(result).toEqual(expected);
	});
});
