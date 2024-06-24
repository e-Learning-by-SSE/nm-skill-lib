/**
 * Interface for classes that may contain children of the same type.
 * @author Marcel Spark
 */
export interface GenericNode<T> {
    children?: GenericNode<T>[];
}

/**
 * Flattens a tree that contains *children* properties into a flat array.
 * @param node A node that may contain *children* of the same type, e.g., *Skills*.
 * @returns A flatten array containing all children and their children.
 * @author Marcel Spark
 */
export function flattenTree<T extends GenericNode<T>>(node: T): T[] {
    const result: T[] = [node];
    node.children?.forEach(child => {
        result.push(...flattenTree(child as T));
    });
    return result;
}
