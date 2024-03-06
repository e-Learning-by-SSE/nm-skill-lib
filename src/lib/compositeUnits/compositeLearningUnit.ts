import { CompositeDefinition, LearningUnit, Skill, WeightedSkill, isCompositeUnit } from "../types";
import { IdSet } from "../util/duplicate-remover/duplicate-remover";
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
		words: 0,
		id: unit.id
	};
	const unifiedLearning: LearningUnit = learningUnits.reduce((acc, learningUnit) => {
		return {
			id: acc.id,
			requiredSkills: [...acc.requiredSkills, ...learningUnit.requiredSkills],
			teachingGoals: [...acc.teachingGoals, ...learningUnit.teachingGoals],
			suggestedSkills: [...acc.suggestedSkills, ...learningUnit.suggestedSkills],
			mediaTime: (acc.mediaTime || 0) + (learningUnit.mediaTime || 0),
			words: (acc.words || 0) + (learningUnit.words || 0)
		};
	}, startValue);

	// remove duplicates
	const requiredSkills = new IdSet([
		...unifiedComposite.requiredSkills,
		...unifiedLearning.requiredSkills
	]);
	const suggestedSkills = new IdSet([
		...unifiedComposite.suggestedSkills.map(addUniqueId),
		...unifiedLearning.suggestedSkills.map(addUniqueId)
	]);
	const teachingGoals = new IdSet([
		...unifiedComposite.teachingGoals,
		...unifiedLearning.teachingGoals
	]);

	return {
		id: unit.id,
		words: unifiedLearning.words,
		mediaTime: unifiedLearning.mediaTime,
		requiredSkills: Array.from(requiredSkills),
		teachingGoals: Array.from(teachingGoals),
		suggestedSkills: Array.from(suggestedSkills).map(({ id, ...rest }) => ({ ...rest }))
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

function addUniqueId(sug: WeightedSkill) {
	return { ...sug, id: `${sug.skill.id}-${sug.weight}` };
}
