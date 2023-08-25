import { LearningUnit, Skill } from "./types";

/**
 * Removed duplicate elements from the given array.
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

class State {
	public learnedSkills: string[];

	constructor(learnedSkills: string[], skills: ReadonlyArray<Skill>) {
		this.learnedSkills = learnedSkills;
		this.checkGroupedSkills(skills);
		this.learnedSkills.sort();
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

	deriveState(operator: Operator, skills: ReadonlyArray<Skill>) {
		const mergedSkills = arrayUnique(
			this.learnedSkills.concat(operator.learningUnit.teachingGoals)
		);
		return new State(mergedSkills, skills);
	}

	/**
	 * Checks if two states contain the same skills.
	 * Based on: https://stackoverflow.com/a/6230314
	 * @param other The other state to compare to.
	 * @returns true if the states are equal, false otherwise.
	 */
	equal(other: State) {
		return this.learnedSkills.join(",") === other.learnedSkills.join(",");
	}
}

class Operator {
	constructor(public learningUnit: LearningUnit) {}
}

class Step {
	state: State;
	action: Operator;
	parent: Step | null;
	g: number; // Cost from the start node
	h: number; // Heuristic value

	constructor(state: State, action: Operator | null, parent: Step | null, g: number, h: number) {
		this.state = state;
		this.action = action;
		this.parent = parent;
		this.g = g; // Cost from the start node
		this.h = h; // Heuristic value
	}
}

// Define heuristic function
function heuristic(state: State): number {
	// Implement your heuristic calculation here
	return 0; // Default heuristic value
}

/**
 * Compute which LearningUnits are reachable based on the given state.
 */
function availableOperators(currentState: State, lus: LearningUnit[]) {
	const reachableLus = lus.filter(lu =>
		lu.requiredSkills.every(skill =>
			currentState.learnedSkills.some(learnedSkill => learnedSkill === skill)
		)
	);

	// Avoid operators that are already in the current state
	// Ideally we would check that the LEarningUnits are not learned twice
	// However, we can also check that we always learn at leas one new skill
	const usefulLus = reachableLus.filter(lu =>
		lu.teachingGoals.some(
			skill => !currentState.learnedSkills.some(learnedSkill => learnedSkill === skill)
		)
	);

	return usefulLus.map(lu => new Operator(lu));
}

// Implemented state-space search algorithm based on FAST-DOWNWARD algorithm.
// See: https://roboticseabass.com/2022/07/19/task-planning-in-robotics/
function search(
	initialState: State,
	goal: Skill[],
	skills: ReadonlyArray<Skill>,
	lus: LearningUnit[]
): Operator[] | null {
	const openList: Step[] = [new Step(initialState, null, null, 0, heuristic(initialState))];
	const closedSet: State[] = [];

	while (openList.length > 0) {
		openList.sort((a, b) => a.g + a.h - (b.g + b.h));
		const currentNode = openList.shift()!;

		/* Check if currentNode.state is the goal state */
		if (currentNode.state.goalFulfilled(goal)) {
			// Build and return the path
			const path: Operator[] = [];
			let node = currentNode;
			while (node.parent !== null) {
				path.unshift(node.action);
				node = node.parent;
			}
			return path;
		}

		closedSet.push(currentNode.state);

		// Generate successors and add them to openList
		for (const operator of availableOperators(currentNode.state, lus)) {
			const newState = currentNode.state.deriveState(operator, skills);
			const newNode = new Step(
				newState,
				operator,
				currentNode,
				currentNode.g + 1,
				heuristic(newState)
			);

			// Skip states that are already analyzed
			if (closedSet.some(state => state.equal(newState))) {
				continue;
			}

			/* Check if node with same state is in openList */
			const existingNode = openList.find(node => node.state.equal(newState));
			if (existingNode) {
				if (newNode.g < existingNode.g) {
					existingNode.g = newNode.g;
					existingNode.parent = newNode.parent;
				}
			} else {
				openList.push(newNode);
			}
		}
	}

	return null; // No solution found
}

export function findOptimalLearningPath(
	knowledge: Skill[],
	goal: Skill[],
	skills: ReadonlyArray<Skill>,
	lus: LearningUnit[]
) {
	const initialState = new State(
		knowledge.map(skill => skill.id),
		skills
	);
	return search(initialState, goal, skills, lus)?.map(step => step.learningUnit);
}
