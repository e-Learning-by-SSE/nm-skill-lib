export interface GenericNode<T> {
	children?: GenericNode<T>[];
}

export function flattenTree<T extends GenericNode<T>>(node: T): T[] {
	const result: T[] = [node];
	node.children?.forEach(child => {
		result.push(...flattenTree(child as T));
	});
	return result;
}

// export interface GenericNode {
// 	children?: GenericNode[];
// }

// export function flattenTree(node: GenericNode) {
// 	const result: GenericNode[] = [node];
// 	node.children?.forEach(child => {
// 		result.push(...flattenTree(child));
// 	});
// 	return result;
// }

// export function deepReduceRecursive<T extends GenericNode<T>>(acc: number, child, propToCheck: string) {
//     }

// export function nestingNumberReducer(
// 	acc: number,
// 	child: LearningUnit | CompositeDefinition,
// 	propToCheck: string
// ): number | null {
// 	if (propToCheck in child && typeof child[propToCheck] === "number") {
// 		return (acc + child[propToCheck]) as unknown as number;
// 	} else if (isCompositeUnit(child)) {
// 		const { children } = child;
// 		return children.reduce((a, b) => nestingNumberReducer(a, b, propToCheck), acc);
// 	} else {
// 		return null;
// 	}
// }
