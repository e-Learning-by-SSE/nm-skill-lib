import { LearningUnit, Skill } from "../types";
import { DistanceMap } from "./distanceMap";

describe("getDistance", () => {
	it("2 connected Units; No nesting", () => {
		const skills: Skill[] = [
			{ id: "skill:1", repositoryId: "Map 1", nestedSkills: [] },
			{ id: "skill:2", repositoryId: "Map 1", nestedSkills: [] },
			{ id: "skill:3", repositoryId: "Map 1", nestedSkills: [] }
		];
		const units: LearningUnit[] = [
			{ id: "unit:1", requiredSkills: ["skill:1"], teachingGoals: ["skill:2"] },
			{ id: "unit:2", requiredSkills: ["skill:2"], teachingGoals: ["skill:3"] }
		];

		const dMap = new DistanceMap(skills, units);

		expect(dMap.getDistance("unit:1", "skill:1")).toBe(Infinity);
		expect(dMap.getDistance("unit:1", "skill:2")).toBe(1);
		expect(dMap.getDistance("unit:1", "skill:3")).toBe(2);
		expect(dMap.getDistance("unit:2", "skill:1")).toBe(Infinity);
		expect(dMap.getDistance("unit:2", "skill:2")).toBe(Infinity);
		expect(dMap.getDistance("unit:2", "skill:3")).toBe(1);
	});

	it("2 connected Units; Nesting (Child used)", () => {
		const skills: Skill[] = [
			{ id: "skill:1", repositoryId: "Map 1", nestedSkills: [] },
			{ id: "skill:parent:2", repositoryId: "Map 1", nestedSkills: ["skill:child:2"] },
			{ id: "skill:child:2", repositoryId: "Map 1", nestedSkills: [] },
			{ id: "skill:3", repositoryId: "Map 1", nestedSkills: [] }
		];
		const units: LearningUnit[] = [
			{ id: "unit:1", requiredSkills: ["skill:1"], teachingGoals: ["skill:child:2"] },
			{ id: "unit:2", requiredSkills: ["skill:parent:2"], teachingGoals: ["skill:3"] }
		];

		const dMap = new DistanceMap(skills, units);

		expect(dMap.getDistance("unit:1", "skill:1")).toBe(Infinity);
		expect(dMap.getDistance("unit:1", "skill:child:2")).toBe(1);
		expect(dMap.getDistance("unit:1", "skill:parent:2")).toBe(1);
		expect(dMap.getDistance("unit:1", "skill:3")).toBe(2);
		expect(dMap.getDistance("unit:2", "skill:1")).toBe(Infinity);
		expect(dMap.getDistance("unit:2", "skill:child:2")).toBe(Infinity);
		expect(dMap.getDistance("unit:2", "skill:parent:2")).toBe(Infinity);
		expect(dMap.getDistance("unit:2", "skill:3")).toBe(1);
	});

	it("2 connected Units; Nesting (Parent used)", () => {
		const skills: Skill[] = [
			{ id: "skill:1", repositoryId: "Map 1", nestedSkills: [] },
			{ id: "skill:parent:2", repositoryId: "Map 1", nestedSkills: ["skill:child:2"] },
			{ id: "skill:child:2", repositoryId: "Map 1", nestedSkills: [] },
			{ id: "skill:3", repositoryId: "Map 1", nestedSkills: [] }
		];
		const units: LearningUnit[] = [
			{ id: "unit:1", requiredSkills: ["skill:1"], teachingGoals: ["skill:parent:2"] },
			{ id: "unit:2", requiredSkills: ["skill:child:2"], teachingGoals: ["skill:3"] }
		];

		const dMap = new DistanceMap(skills, units);

		expect(dMap.getDistance("unit:1", "skill:1")).toBe(Infinity);
		expect(dMap.getDistance("unit:1", "skill:child:2")).toBe(1);
		expect(dMap.getDistance("unit:1", "skill:parent:2")).toBe(1);
		expect(dMap.getDistance("unit:1", "skill:3")).toBe(2);
		expect(dMap.getDistance("unit:2", "skill:1")).toBe(Infinity);
		expect(dMap.getDistance("unit:2", "skill:child:2")).toBe(Infinity);
		expect(dMap.getDistance("unit:2", "skill:parent:2")).toBe(Infinity);
		expect(dMap.getDistance("unit:2", "skill:3")).toBe(1);
	});
});
