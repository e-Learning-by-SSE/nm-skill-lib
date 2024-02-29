import {
	CompositeDefinition,
	CompositeLearningUnit,
	LearningUnit,
	Skill,
	isCompositeUnit,
	isLearningUnit
} from "../types";
import { duplicateRemover, idChecker } from "../util/duplicate-remover/duplicate-remover";
import { GenericNode, flattenTree } from "../util/flatten-tree/flatte-tree";

export function computeHiddenSuggestionsSkills(unit: CompositeDefinition) {
	const addUniqueId = sug => ({ ...sug, id: `${sug.skill.id}-${sug.weight}` });
	const isNoExposedSuggestedSkill = (sug: { id: string }) =>
		!unit.suggestedExposedSkills.map(addUniqueId).some(idChecker(sug));

	const suggestions = unit.children
		.flatMap(child => child.suggestedSkills)
		.map(addUniqueId)
		.filter(duplicateRemover())
		.filter(isNoExposedSuggestedSkill)
		.map(({ id, ...rest }) => ({ ...rest }));
	return suggestions;
}

export function computeHiddenRequiredSkills(unit: CompositeDefinition) {
	const isNoExposedRequiredSkills = skill => !unit.requiredExposedSkills.some(idChecker(skill));

	return unit.children
		.flatMap(child => child.requiredSkills)
		.filter(duplicateRemover())
		.filter(isNoExposedRequiredSkills);
}

export function computeTaughtSkills(unit: CompositeDefinition) {
	const duplicateGoalFilter = duplicateRemover(unit.teachingGoals.map(skill => skill.id));
	return unit.children.flatMap(child => child.teachingGoals).filter(duplicateGoalFilter);
}
