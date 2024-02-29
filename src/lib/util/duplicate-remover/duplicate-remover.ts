type IdElement = { id: string };

export const duplicateRemover = (initialBuffer: string[] = []) => {
	const alreadyComputedSkillsBuffer = new Set<string>(initialBuffer);

	return ({ id }: IdElement) => {
		if (!alreadyComputedSkillsBuffer.has(id)) {
			alreadyComputedSkillsBuffer.add(id);
			return true;
		}
		return false;
	};
};

export const idChecker = (elementA: IdElement) => (elementB: IdElement) =>
	elementA.id === elementB.id;
