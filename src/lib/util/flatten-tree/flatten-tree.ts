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
