import { CompositeDefinition, LearningUnit, isCompositeUnit } from "../types";

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
	const { compositeUnits, learningUnits } = flatten(unit);

	const unifiedComposite = compositeUnits.reduce((acc, compUnit) => {
		return {
			...acc,
			requiredSkills: [
				...acc.requiredSkills,
				...compUnit.requiredSkills,
				...acc.requiredExposedSkills,
				...compUnit.requiredExposedSkills
			],
			teachingGoals: [...acc.teachingGoals, ...compUnit.teachingGoals],
			suggestedSkills: [
				...acc.suggestedSkills,
				...compUnit.suggestedSkills,
				...acc.suggestedExposedSkills,
				...compUnit.suggestedExposedSkills
			]
		};
	}, unit);

	const startValue = {
		requiredSkills: [],
		teachingGoals: [],
		suggestedSkills: [],
		mediaTime: 0,
		words: 0
	};
	const unifiedLearning = learningUnits.reduce((acc, learningUnit) => {
		return {
			requiredSkills: [...acc.requiredSkills, ...learningUnit.requiredSkills],
			teachingGoals: [...acc.teachingGoals, ...learningUnit.teachingGoals],
			suggestedSkills: [...acc.suggestedSkills, ...learningUnit.suggestedSkills],
			mediaTime: (acc.mediaTime || 0) + (learningUnit.mediaTime || 0),
			words: (acc.words || 0) + (learningUnit.words || 0)
		};
	}, startValue);

	// remove duplicates
	const requiredSkills = new Set([
		...unifiedComposite.requiredSkills,
		...unifiedLearning.requiredSkills
	]);
	const suggestedSkills = new Set([
		...unifiedComposite.suggestedSkills,
		...unifiedLearning.suggestedSkills
	]);
	const teachingGoals = new Set([
		...unifiedComposite.teachingGoals,
		...unifiedLearning.teachingGoals
	]);

	return {
		id: unit.id,
		words: unifiedLearning.words,
		mediaTime: unifiedLearning.mediaTime,
		requiredSkills: Array.from(requiredSkills),
		teachingGoals: Array.from(teachingGoals),
		suggestedSkills: Array.from(suggestedSkills)
	};
}

function flatten(unit: LearningUnit | CompositeDefinition) {
	const compositeUnits: CompositeDefinition[] = [];
	const learningUnits: LearningUnit[] = [];
	if (isCompositeUnit(unit)) {
		compositeUnits.push(unit);
		unit.children.forEach(child => {
			const { compositeUnits: c, learningUnits: l } = flatten(child);
			compositeUnits.push(...c);
			learningUnits.push(...l);
		});
	} else {
		learningUnits.push(unit);
	}
	return { compositeUnits, learningUnits };
}
