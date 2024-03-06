import { Skill } from "src/lib/types";

type IdElement = { id: string | number };

export function duplicateRemover(initialBuffer: (string | number)[] = []) {
	const alreadyComputedSkillsBuffer = new Set<string | number>(initialBuffer);

	return function ({ id }: IdElement) {
		if (!alreadyComputedSkillsBuffer.has(id)) {
			alreadyComputedSkillsBuffer.add(id);
			return true;
		}
		return false;
	};
}

export function idChecker(elementA: IdElement) {
	return function (elementB: IdElement) {
		return elementA.id === elementB.id;
	};
}

export function sortById(a: IdElement, b: IdElement) {
	if (typeof a.id === "number" && typeof b.id === "number") {
		return a.id - b.id;
	}
	return String(a.id).localeCompare(String(b.id));
}

export class IdSet<T extends IdElement> {
	private items: Record<string, T>;

	constructor(initialValues: T[] = []) {
		this.items = {};
		initialValues.forEach(item => this.add(item));
	}

	add(item: T): boolean {
		const key = item.id;
		if (!this.items[key]) {
			this.items[key] = item;
			return true;
		}
		return false;
	}

	has(item: T): boolean {
		return !!this.items[item.id.toString()];
	}

	delete(item: T): boolean {
		const key = item.id.toString();
		if (this.items[key]) {
			delete this.items[key];
			return true;
		}
		return false;
	}

	get size(): number {
		return Object.keys(this.items).length;
	}

	[Symbol.iterator](): Iterator<T> {
		const values = Object.values(this.items);
		let index = 0;
		return {
			next(): IteratorResult<T> {
				if (index < values.length) {
					return { value: values[index++], done: false };
				} else {
					return { value: null, done: true };
				}
			}
		};
	}

	forEach(callback: (item: T, index: number) => void): void {
		let index = 0;
		for (const item of this) {
			callback(item, index++);
		}
	}
}
