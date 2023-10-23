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
