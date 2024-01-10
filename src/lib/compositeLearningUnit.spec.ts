import { LearningUnit, Skill } from "./types";
import { getTeachingGoals, getRequiredSkills, getSuggestedSkills} from "./compositeLearningUnit"

describe("Composite Unit", () => {
	// Re-usable test data (must be passed to dataHandler.init() before each test)

	describe("testing composite unit", () => {

		it("check composite unit", () => {

			const thirdNestedMap: Skill[] = [
				{ id: "sk:1", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:2", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:3", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:4", repositoryId: "3", nestedSkills: [] },
				{ id: "sk:5", repositoryId: "3", nestedSkills: [] }
			].sort((a, b) => a.id.localeCompare(b.id));

			const multipleRequirementsOfLuNested: LearningUnit[] = [
				newLearningUnit(thirdNestedMap, "lu:10", [], ["sk:1"]),
				newLearningUnit(thirdNestedMap, "lu:11", [], ["sk:2"]),
				newLearningUnit(thirdNestedMap, "lu:12", ["sk:1", "sk:2"], ["sk:3"]),
				newLearningUnit(thirdNestedMap, "lu:13", [], ["sk:4"],
				[{ weight: 0.2, skill: "sk:4" }]),
				newLearningUnit(thirdNestedMap, "lu:14", [], ["sk:5"]),
			];

			multipleRequirementsOfLuNested.find(lu => lu.id == "lu:10").children!.push(
				multipleRequirementsOfLuNested.find(lu => lu.id == "lu:11")!,
				multipleRequirementsOfLuNested.find(lu => lu.id == "lu:12")!
			)

			multipleRequirementsOfLuNested.find(lu => lu.id == "lu:12")!.children!.push(
				multipleRequirementsOfLuNested.find(lu => lu.id == "lu:13")!
			)

			const lu10 = multipleRequirementsOfLuNested.find(lu => lu.id == "lu:10")!;

			const teachingGoals = lu10.getTeachingGoals();
			const requiredSkills = lu10.getRequiredSkills();
			const suggestedSkills = lu10.getSuggestedSkills();

			expect(teachingGoals!.length).toBe(4);
			expect(teachingGoals[0]!.id).toBe('sk:1');
			expect(teachingGoals[1]!.id).toBe('sk:2');
			expect(teachingGoals[2]!.id).toBe('sk:3');
			expect(teachingGoals[3]!.id).toBe('sk:4');
			expect(requiredSkills!.length).toBe(2);
			expect(requiredSkills[0]!.id).toBe('sk:1');
			expect(requiredSkills[1]!.id).toBe('sk:2');
			expect(suggestedSkills!.length).toBe(1);
			expect(suggestedSkills[0]!.skill.id).toBe('sk:4');
		});
	});
});

function newLearningUnit(
	map: Skill[],
	id: string,
	requiredSkills: string[],
	teachingGoals: string[],
	suggestedSkills: { weight: number; skill: string }[] = []
): LearningUnit {
	const suggestions: { weight: number; skill: Skill }[] = [];
	if (suggestedSkills.length > 0) {
		for (const suggestion of suggestedSkills) {
			const skill = map.find(skill => suggestion.skill.includes(skill.id));
			if (skill) {
				suggestions.push({ weight: suggestion.weight, skill: skill });
			}
		}
	}

	return {
		id: id,
		children: [],
		requiredSkills: map.filter(skill => requiredSkills.includes(skill.id)),
		teachingGoals: map.filter(skill => teachingGoals.includes(skill.id)),
		suggestedSkills: suggestions,
		getTeachingGoals: getTeachingGoals,
		getRequiredSkills: getRequiredSkills,
		getSuggestedSkills: getSuggestedSkills,
	};
}
