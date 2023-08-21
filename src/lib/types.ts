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
	requiredSkills: string[];
	teachingGoals: string[];
};

export type Node = {
	id: string;
	element: Skill | LearningUnit;
};
