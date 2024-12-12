import { Skill } from "../types";

// An internal type used within this file to hold nested skill as Skills[] not string[]
type ParentSkills = {
    skill: Skill;
    children: Skill[];
};

/**
 * Stores all available Skills in a more structured way, to allow for faster access.
 *
 */
export class GlobalKnowledge {
    private parents: ReadonlyArray<Skill>;
    private parentMap: Map<string, string[]> = new Map();
    private parentSkills: ParentSkills[] = [];

    constructor(public skills: ReadonlyArray<Skill>) {
        this.parents = skills.filter(skill => skill.nestedSkills.length > 0);
        this.parents.forEach(skill => {
            this.parentMap.set(skill.id, skill.nestedSkills);
            this.parentSkills.push({
                skill: skill,
                children: this.skills.filter(sk => skill.nestedSkills.includes(sk.id))
            });
        });
    }

    /**
     * Returns all skillIds that are direct children of the given Skill (as array of string).
     * @param skillId The Skill for which all children should be discovered.
     * @returns The IDs of all children of the given Skill or an empty array if the Skill has no children.
     */
    getChildren(skillId: string): string[] {
        return this.parentMap.get(skillId) ?? [];
    }

    // Get the children skills for a given parent skill (as array of skills).
    getChildrenSkills(skill: Skill): Skill[] {
        const parentSkill = this.getParent(skill.id);
        if (parentSkill) {
            const Skills: Skill[] = [];
            parentSkill.children.forEach(child => {
                const children = this.getChildrenSkills(child);
                children.length == 0 ? children.push(child) : null;
                Skills.push(...children);
            });
            return Skills;
        } else {
            return [];
        }
    }

    /**
     * Returns all Skills that have at least one child (as array of Skill).
     * @returns All Skills that have at least one child or an empty array if no such Skill exists.
     */
    getAllParents() {
        return this.parents;
    }

    /**
     * Returns all Parent Skills (as array of ParentSkills).
     * @returns All Parent Skills or an empty array if no such Parent Skills exists.
     */
    getAllParentSkills() {
        return this.parentSkills;
    }

    // Get the parent as ParentSkills tape by the skill id, undefined if not exist
    getParent(id: string): ParentSkills | undefined {
        return this.parentSkills.find(parent => id == parent.skill.id);
    }
}
