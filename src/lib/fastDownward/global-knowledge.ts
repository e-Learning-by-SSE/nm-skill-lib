import { Skill } from "../types";

/**
 * Stores all available Skills in a more structured way, to allow for faster access.
 */
export class GlobalKnowledge {
	private parentMap: Map<string, string[]> = new Map();
	private parents: ReadonlyArray<Skill>;

	constructor(public skills: ReadonlyArray<Skill>) {
		this.parents = skills.filter(skill => skill.nestedSkills.length > 0);
		this.parents.forEach(skill => {
			this.parentMap.set(skill.id, skill.nestedSkills);
		});
	}

	/**
	 * Returns all skillIds that are direct children of the given Skill.
	 * @param skillId The Skill for which all children should be discovered.
	 * @returns The IDs of all children of the given Skill or an empty array if the Skill has no children.
	 */
	getChildren(skillId: string): string[] {
		return this.parentMap.get(skillId) ?? [];
	}

	/**
	 * Returns all Skills that have at least one child.
	 * @returns All Skills that have at least one child or an empty array if no such Skill exists.
	 */
	getAllParents() {
		return this.parents;
	}
}
