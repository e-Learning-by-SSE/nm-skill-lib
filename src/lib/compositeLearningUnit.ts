import { LearningUnit, Skill } from "./types";

export function computeSkills(
	LearningUnits: LearningUnit[]
) {
	LearningUnits.forEach(lu => {
		lu.externalRequiredSkills = lu.requiredSkills.map(skill => skill);
		computeUnusedRequiredSkills(lu);

		lu.externalRecommendedSkills = lu.suggestedSkills.map(skill => skill);
		computeUnusedRecommendedSkills(lu);

		computeTaughtSkills(lu);
	});
}

function computeTaughtSkills(
	LU: LearningUnit
) {
	let skills: Skill[] = LU.teachingGoals.map(skill => skill);
	let skillsString: string[] = LU.teachingGoals.map(skill => skill.id);
	
	if (LU.children != undefined) {
		LU.children.forEach(child => {
			const teachingGoalsSkills = child.teachingGoals.filter(skill => !skillsString.includes(skill.id));
			skills = skills.concat(teachingGoalsSkills);
			skillsString = skillsString.concat(teachingGoalsSkills.map(skill => skill.id));
		});
	}

	LU.taughtSkills = skills;
}

export function computeUnusedRecommendedSkills(
	LU: LearningUnit
) {

	let suggestions: { weight: number; skill: Skill }[] = [];
	if (LU.children != undefined) {
		LU.children.forEach(child => {
			child.suggestedSkills.forEach(sug => {
				const oneSuggestion = {weight: sug.weight, skill: sug.skill}
				const suggestionExist = suggestions.filter(skill => skill.skill == oneSuggestion.skill
																 && skill.weight == oneSuggestion.weight);
				if (suggestionExist.length == 0) {
					suggestions = suggestions.concat(oneSuggestion);
				}
			});
		});
	}

	suggestions = suggestions.filter(skill => !(LU.exportedRecommendedSkills!.map(sk => sk.skill.id).includes(skill.skill.id)
											 && LU.exportedRecommendedSkills!.map(sk => sk.weight).includes(skill.weight)));

	LU.unusedRecommendedSkills = suggestions;
}

function computeUnusedRequiredSkills(
	LU: LearningUnit
) {
	let skillsString: string[] = [];

	let skills: Skill[] = [];// = LU.requiredSkills.map(skill => skill);
	//let skillsString: string[] = LU.teachingGoals.map(skill => skill.id);

	if (LU.children != undefined) {
		LU.children.forEach(child => {
			const requiredSkills = child.requiredSkills.filter(skill => !skillsString.includes(skill.id));
			skills = skills.concat(requiredSkills);
			skillsString = skillsString.concat(requiredSkills.map(skill => skill.id));
		});
	}

	skills = skills.filter(skill => !LU.exportedRequiredSkills!.map(sk => sk.id).includes(skill.id));
	LU.unusedRequiredSkills = skills;
}

export function getTeachingGoals(): Skill[] {
	const LU: LearningUnit = this;
	let skills: Skill[] = [];
	if (LU.children.length > 0) {
		skills = LU.taughtSkills!;
	} else {
		skills = LU.teachingGoals;
	}
	
	return skills;
}

export function getRequiredSkills(): Skill[] {
	const LU: LearningUnit = this;
	let skills: Skill[] = [];
	if (LU.children.length > 0) {
		skills = LU.externalRequiredSkills!.concat(LU.exportedRequiredSkills!);
	} else {
		skills = LU.requiredSkills;
	}
	
	return skills;
}
	
export function getSuggestedSkills(): { weight: number; skill: Skill }[] {
	const LU: LearningUnit = this;
	let skills: { weight: number; skill: Skill }[] = [];

	if (LU.children.length > 0) {
		skills = LU.externalRecommendedSkills!.concat(LU.exportedRecommendedSkills!);
	} else {
		skills = LU.suggestedSkills;
	}
	
	return skills;
}