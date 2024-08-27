import { Skill, LearningUnit, Unit, Path } from "../types";
import { GlobalKnowledge } from "./global-knowledge";

/**
 * Represents the state of the search tree.
 * The state is defined by the set of skills that have been learned so far along an explored path.
 */
export class State {
    public learnedSkills: string[];

    // Used to compare two states for equality
    // Should save time by avoiding repeated string concatenations
    private asString: string;

    constructor(learnedSkills: string[], globalKnowledge: GlobalKnowledge) {
        this.learnedSkills = learnedSkills;

        this.checkGroupedSkills(globalKnowledge);
        // Sort for equality check and to speed up creation of derived states
        this.learnedSkills.sort();
        this.asString = this.learnedSkills.join(",");
    }

    private checkGroupedSkills(globalKnowledge: GlobalKnowledge) {
        let changed = false;
        do {
            changed = false;
            changed = changed || this.checkIfChildrenAreSubsumedByParents(globalKnowledge);
            changed = changed || this.checkIfParentsAreSubsumedByChildren(globalKnowledge);
        } while (changed);
    }

    private checkIfParentsAreSubsumedByChildren(globalKnowledge: GlobalKnowledge) {
        // Finds all skills that have children
        const allParents = globalKnowledge.getAllParents();
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

    private checkIfChildrenAreSubsumedByParents(globalKnowledge: GlobalKnowledge) {
        const allLearnedParents = globalKnowledge
            .getAllParents()
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

    deriveState(operator: Unit, subPath: Path | undefined, globalKnowledge: GlobalKnowledge) {
        //const mergedSkills = arrayUnique(
        //	this.learnedSkills.concat(operator.teachingGoals.map(goal => goal.id))
        //);

        let mergedSkills: string[] = [];
        this.learnedSkills.forEach(skill => {
            mergedSkills.push(skill);
        });

        mergedSkills = mergedSkills.concat(operator.teachingGoals.map(goal => goal.id));

        if ("selectors" in operator!) {
            if (subPath) {
                subPath?.path.forEach(lu => {
                    const subState = this.deriveState(lu.unit, subPath, globalKnowledge);
                    mergedSkills = mergedSkills.concat(subState.learnedSkills);
                });
            }
        }

        mergedSkills = [...new Set(mergedSkills)];

        return new State(mergedSkills, globalKnowledge);
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

    getHashCode() {
        return this.asString;
    }
}
