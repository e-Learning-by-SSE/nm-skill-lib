import { IdSet, duplicateRemover } from "./duplicate-remover";

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

describe("IdSet", () => {
    it("should add, check, and delete items correctly", () => {
        const idSet = new IdSet();

        const item1 = { id: "1" };
        const item2 = { id: "2" };

        // Test adding items
        expect(idSet.add(item1)).toBe(true);
        expect(idSet.add(item2)).toBe(true);

        // Test checking items
        expect(idSet.has(item1)).toBe(true);
        expect(idSet.has(item2)).toBe(true);

        // Test deleting items
        expect(idSet.delete(item1)).toBe(true);
        expect(idSet.delete(item2)).toBe(true);

        // Test checking items after deletion
        expect(idSet.has(item1)).toBe(false);
        expect(idSet.has(item2)).toBe(false);
    });

    it("Add elements twice -> Only first is added", () => {
        const idSet = new IdSet();

        const item1 = { id: "1", name: "item1" };
        const item2 = { id: "2", name: "item2" };
        // Same ID but different object (name property)
        const item3 = { id: "1", name: "item3" };

        // Test adding items
        expect(idSet.add(item1)).toBe(true);
        expect(idSet.size).toBe(1);
        expect(idSet.add(item2)).toBe(true);
        expect(idSet.size).toBe(2);

        // Item 3 must not be added
        expect(idSet.add(item3)).toBe(false);
        expect(idSet.size).toBe(2);
    });

    it("should iterate over every item with forEach", () => {
        const mockCallback = jest.fn();
        const items = [{ id: "1" }, { id: "2" }, { id: "3" }];

        const idSet = new IdSet(items);

        idSet.forEach(mockCallback);

        // Check that the mock function was called once for each item in the array
        expect(mockCallback.mock.calls.length).toBe(items.length);

        // Check that the mock function was called with the correct arguments each time
        items.forEach((item, index) => {
            expect(mockCallback.mock.calls[index][0]).toEqual(item);
            expect(mockCallback.mock.calls[index][1]).toBe(index);
        });
    });
});
