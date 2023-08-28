import { Skill, LearningUnit } from "../types";

/**
 * Removes duplicate elements from the given array.
 * Based on: https://stackoverflow.com/a/1584377
 */
function arrayUnique(array) {
	var a = array.concat();
	for (var i = 0; i < a.length; ++i) {
		for (var j = i + 1; j < a.length; ++j) {
			if (a[i] === a[j]) a.splice(j--, 1);
		}
	}

	return a;
}

/**
 * Represents the state of the search tree.
 * The state is defined by the set of skills that have been learned so far along an explored path.
 */
export class State {
	public learnedSkills: string[];
	// Used to compare two states for equality
	// Should save time by avoiding repeated string concatenations
	private asString: string;

	constructor(learnedSkills: string[], skills: ReadonlyArray<Skill>) {
		this.learnedSkills = learnedSkills;
		this.checkGroupedSkills(skills);
		// Sort for equality check and to speed up creation of derived states
		this.learnedSkills.sort();
		this.asString = this.learnedSkills.join(",");
	}

	private checkGroupedSkills(skills: ReadonlyArray<Skill>) {
		let changed = false;
		do {
			changed = false;
			changed = changed || this.checkIfChildrenAreSubsumedByParents(skills);
			changed = changed || this.checkIfParentsAreSubsumedByChildren(skills);
		} while (changed);
	}

	private checkIfParentsAreSubsumedByChildren(skills: ReadonlyArray<Skill>) {
		// Finds all skills that have children
		const allParents = skills.filter(skill => skill.nestedSkills.length > 0);
		// Filters for parents for which all children are known (this is not recursive)
		const relevantParents = allParents.filter(parent =>
			parent.nestedSkills.every(child => this.learnedSkills.includes(child))
		);
		// Filters for learned parents that are not stored in state
		const missedParents = relevantParents.filter(
			parent => !this.learnedSkills.includes(parent.id)
		);

		// Adds missing parents to state
		if (missedParents.length > 0) {
			this.learnedSkills = this.learnedSkills.concat(missedParents.map(parent => parent.id));
			return true;
		}
		return false;
	}

	private checkIfChildrenAreSubsumedByParents(skills: ReadonlyArray<Skill>) {
		const allLearnedParents = skills
			.filter(skill => skill.nestedSkills.length > 0)
			.filter(parent => this.learnedSkills.includes(parent.id));
		const allLearnedChildren = allLearnedParents.map(parent => parent.nestedSkills).flat();
		const missedChildren = allLearnedChildren.filter(
			child => !this.learnedSkills.includes(child)
		);

		if (missedChildren.length > 0) {
			this.learnedSkills = this.learnedSkills.concat(missedChildren);
			return true;
		}
		return false;
	}

	/**
	 * Checks if state contains all skills of the goal.
	 * Check is based on their IDs.
	 * @param goal true if the goal is fulfilled, false otherwise.
	 */
	goalFulfilled(goal: Skill[]) {
		return goal.every(goalSkill =>
			this.learnedSkills.some(learnedSkill => learnedSkill === goalSkill.id)
		);
	}

	deriveState(operator: LearningUnit, skills: ReadonlyArray<Skill>) {
		const mergedSkills = arrayUnique(this.learnedSkills.concat(operator.teachingGoals));
		return new State(mergedSkills, skills);
	}

	/**
	 * Checks if two states contain the same skills.
	 * Based on: https://stackoverflow.com/a/6230314
	 * @param other The other state to compare to.
	 * @returns true if the states are equal, false otherwise.
	 */
	equal(other: State) {
		return this.asString === other.asString;
	}
}
