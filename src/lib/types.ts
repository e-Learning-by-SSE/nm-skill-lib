export type Graph = {
	nodes: Node[];
	edges: Edge[];
};

export type Skill = {
	id: string;
	repositoryId: string;
	nestedSkills: string[];
};

export type Edge = {
	from: string;
	to: string;
};

export type LearningUnit = {
	id: string;
	mediaTime?: number;
	words?: number;
	requiredSkills: Skill[];
	teachingGoals: Skill[];
	suggestedSkills: { weight: number; skill: Skill }[];
};

export type Node = {
	id: string;
	element: Skill | LearningUnit;
};

export class Path {
	cost: number = 0;
	path: LearningUnit[] = [];
}

/**
 * Part of the computeSuggestedSkills function, which will be used to apply the computed skills to the database.
 * @param learningUnit The learning unit for which the skills should be updated.
 * @param missingSkills The skills that are missing for the learning unit, may be 0 if no skills are missing (may be used to delete old constraints).
 *
 * @example
 * To update or delete suggested constraints of the SEARCH project:
 * ```
 *  computeSuggestedSkills(learningUnits, async (lu: LearningUnit, missingSkills: string[]) => {
 * 		if (missingSkills.length > 0) {
 * 			const updateQuery: Prisma.PreferredOrderingUncheckedUpdateWithoutLearningUnitInput &
 * 				Prisma.PreferredOrderingUncheckedCreateWithoutLearningUnitInput = {
 * 				orderId: preferredPathId,
 * 				suggestedSkills: {
 * 					connect: missingSkills.map((skillId) => ({ id: skillId })),
 * 				},
 * 			};
 *
 * 			// Update / Overwrite order-constraint for the given preferredPathId
 * 			await this.db.learningUnit.update({
 * 				where: {
 * 					id: lu.id,
 * 				},
 * 					data: {
 * 					orderings: {
 * 						upsert: {
 * 							where: {
 * 								learningUnitId_orderId: {
 * 									learningUnitId: lu.id,
 * 									orderId: preferredPathId,
 * 								},
 * 							},
 * 							create: updateQuery,
 * 							update: updateQuery,
 * 						},
 * 					},
 * 				},
 * 			});
 * 		} else {
 * 			// Delete old constraint if there was nothing specified
 * 			await this.db.learningUnit.update({
 * 				where: {
 * 					id: lu.id,
 * 				},
 * 					data: {
 * 					orderings: {
 * 						deleteMany: {
 * 							orderId: preferredPathId,
 * 						},
 * 					},
 * 				},
 * 			});
 * 		}
 * 	});
 * ```
 */
export type UpdateSoftConstraintFunction = (
	learningUnit: LearningUnit,
	missingSkills: string[]
) => Promise<void>;
