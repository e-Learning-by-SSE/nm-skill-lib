import { CompositeDefinition, LearningUnit } from "../types";
import { duplicateRemover, idChecker } from "../util/duplicate-remover/duplicate-remover";
import { flattenTree } from "../util/flatten-tree/flatten-tree";

/**
 *
 * @param param0 The Composite Unit to transform
 * @returns The transformed Composite Unit with the following properties:
 * - words: The sum of the words of all the children
 * - mediaTime: The sum of the mediaTime of all the children
 * - requiredSkills: The requiredSkills of the whole composite unit
 * - teachingGoals: The teachingGoals of the whole composite unit (and all children)
 * - suggestedSkill: The suggestedSkills of the whole composite unit
 */
export function toUnifiedLearningUnit({ unit }: { unit: CompositeDefinition }): LearningUnit {
	const children = unit.children.flatMap(flattenTree);

	return {
		id: unit.id,
		words: children.reduce((acc, child) => acc + (child.words || 0), 0),
		mediaTime: children.reduce((acc, child) => acc + (child.mediaTime || 0), 0),
		requiredSkills: unit.requiredExposedSkills.concat(unit.requiredSkills),
		teachingGoals: reduceTaughtSkills(unit),
		suggestedSkills: unit.suggestedSkills.concat(unit.suggestedExposedSkills)
	};
}

export function reduceTaughtSkills(unit: CompositeDefinition) {
	const duplicateGoalFilter = duplicateRemover(unit.teachingGoals.map(skill => skill.id));
	return unit.children.flatMap(child => child.teachingGoals).filter(duplicateGoalFilter);
}

export function analysisCompositeUnit({ unit }: { unit: CompositeDefinition }) {
	return {
		taughtSkills: reduceTaughtSkills(unit),
		hiddenRequiredSkills: computeHiddenRequiredSkills(unit),
		hiddenSuggestedSkills: computeHiddenSuggestionsSkills(unit)
	};
}

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
