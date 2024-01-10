import { LearningUnit, Skill } from "./types";

export function getTeachingGoals(): Skill[] {
	const LU: LearningUnit = this;
	let skills: Skill[] = LU.teachingGoals.map(skill => skill);
	let skillsString: string[] = LU.teachingGoals.map(skill => skill.id);
	if (LU.children != undefined) {
		LU.children!.forEach(child => {
			if (child.getTeachingGoals != undefined) {
				child.getTeachingGoals()!.forEach(nestedLu => {
					if (!skillsString.includes(nestedLu.id)) {
						skills.push(nestedLu);
						skillsString.push(nestedLu.id);
					}
				});
			}
		});
	}

	return skills;
}

export function getRequiredSkills(): Skill[] {
	const LU: LearningUnit = this;
	let skills: Skill[] = LU.requiredSkills.map(skill => skill);
	let skillsString: string[] = LU.requiredSkills.map(skill => skill.id);
	if (LU.children != undefined) {
		LU.children.forEach(child => {
			if (child.getRequiredSkills != undefined) {
				child.getRequiredSkills().forEach(nestedLu => {
					if (!skillsString.includes(nestedLu.id)) {
						skills.push(nestedLu);
						skillsString.push(nestedLu.id);
					}
				});
			}

		});
	}
	
	return skills;
}
	
export function getSuggestedSkills(): { weight: number; skill: Skill }[] {
	const LU: LearningUnit = this;
	let skills: { weight: number; skill: Skill }[] = LU.suggestedSkills.map(suggest => suggest);
	if (LU.children != undefined) {
		LU.children!.forEach(child => {
			skills = skills.concat(child.getSuggestedSkills!());
		});
	}
	
	return skills;
}