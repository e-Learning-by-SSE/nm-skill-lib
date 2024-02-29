import { duplicateRemover } from "./duplicate-remover";

describe("duplicateRemover", () => {
	it("should return true for unique ids", () => {
		const removeDuplicate = duplicateRemover();
		const result1 = removeDuplicate({ id: "1" });
		const result2 = removeDuplicate({ id: "2" });

		expect(result1).toBe(true);
		expect(result2).toBe(true);
	});

	it("should return false for duplicate ids", () => {
		const removeDuplicate = duplicateRemover();
		const result1 = removeDuplicate({ id: "1" });
		const result2 = removeDuplicate({ id: "1" });

		expect(result1).toBe(true);
		expect(result2).toBe(false);
	});

	it("should handle initial buffer correctly", () => {
		const initialBuffer = ["1", "2"];
		const removeDuplicate = duplicateRemover(initialBuffer);
		const result1 = removeDuplicate({ id: "1" });
		const result2 = removeDuplicate({ id: "2" });
		const result3 = removeDuplicate({ id: "3" });

		expect(result1).toBe(false);
		expect(result2).toBe(false);
		expect(result3).toBe(true);
	});
});
