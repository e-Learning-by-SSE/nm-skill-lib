import { CompositeDefinition, LearningUnit } from "../types";
import { flattenTree } from "../util/flatten-tree/flatte-tree";
import {
	computeHiddenRequiredSkills,
	computeHiddenSuggestionsSkills,
	computeTaughtSkills
} from "./computation-helpers";

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
		teachingGoals: computeTaughtSkills(unit),
		suggestedSkills: unit.suggestedSkills.concat(unit.suggestedExposedSkills)
	};
}

export function analysisCompositeUnit({ unit }: { unit: CompositeDefinition }) {
	return {
		taughtSkills: computeTaughtSkills(unit),
		hiddenRequiredSkills: computeHiddenRequiredSkills(unit),
		hiddenSuggestedSkills: computeHiddenSuggestionsSkills(unit)
	};
}
