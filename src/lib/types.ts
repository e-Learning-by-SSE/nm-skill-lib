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
};

export type Node = {
	id: string;
	element: Skill | LearningUnit;
};

export class Path {
	cost: number = 0;
	path: LearningUnit[] = [];
}

export interface LearningUnitProvider<LU extends LearningUnit> {
	/**
	 * Load all LearningUnits that provide at least one of the given skills (as teaching goal)
	 * @param skillIds The IDs of the skills that should be offered as teaching goals
	 */
	getLearningUnitsBySkillIds(skillIds: string[]): Promise<LU[]>;
}
