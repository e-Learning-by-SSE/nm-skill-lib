import { LearningUnit, Skill } from "../types";
import { Graph as GraphLib, alg, Edge as GraphEdge } from "@dagrejs/graphlib";
import { CostFunction } from "./fdTypes";

export class DistanceMap<LU extends LearningUnit> {
	private distances: Map<string, Map<string, number>>;

	constructor(
		skills: ReadonlyArray<Skill>,
		learningUnits: ReadonlyArray<LU>,
		fnCost?: CostFunction<LU>
	) {
		this.computeMap(skills, learningUnits, fnCost);
	}

	private computeMap(
		skills: ReadonlyArray<Skill>,
		learningUnits: ReadonlyArray<LU>,
		fnCost?: CostFunction<LU>
	) {
		const graph = new GraphLib({ directed: true, multigraph: true });

		skills.forEach(skill => {
			graph.setNode("sk" + skill.id, skill);
			skill.nestedSkills.forEach(child => {
				const childName = "sk" + child;
				graph.setEdge("sk" + skill.id, childName);
				graph.setEdge(childName, "sk" + skill.id);
			});
		});
		learningUnits.forEach(lu => {
			graph.setNode("lu" + lu.id, lu);
			lu.requiredSkills.forEach(req => {
				graph.setEdge("sk" + req.id, "lu" + lu.id);
			});

			lu.teachingGoals.forEach(goal => {
				graph.setEdge("lu" + lu.id, "sk" + goal.id);
			});
		});

		function dijkstraWeightFn(edge: GraphEdge) {
			// Weight only edges starting at a learning unit
			if (edge.v.startsWith("lu")) {
				// Use cost function if provided to rate cost of learning unit otherwise +1 for extending the path by one more unit
				if (fnCost) {
					// O(graph.node) = |V| => call this function only if a cost function is provided
					return fnCost(graph.node(edge.v));
				}
				return 1;
			}
			return 0;
		}
		const paths = alg.dijkstraAll(graph, dijkstraWeightFn);

		this.distances = new Map();
		for (const [key, value] of Object.entries(paths)) {
			if (key.startsWith("lu") && value) {
				const startName = key.slice(2);
				const goalNodes: Map<string, number> = new Map();
				for (const [goalNode, node] of Object.entries(value)) {
					const name = goalNode.slice(2);
					if (goalNode.startsWith("sk")) {
						goalNodes.set(name, node.distance);
					}
				}

				this.distances.set(startName, goalNodes);
			}
		}
	}

	getDistance(unit: string, goal: string): number {
		return this.distances.get(unit)?.get(goal) ?? 1;
	}

	getDistances(unit: string, goal: string[]): number {
		const distances = goal.map(g => this.getDistance(unit, g));
		return Math.min(...distances);
	}

	/**
	 * Returns a string representation of the distance map for debugging purposes.
	 * @returns The heuristic values from all learning units to all skills.
	 */
	toString(): string {
		let str = "";
		for (const [unit, distanceInfo] of this.distances.entries()) {
			str += `${unit}:\n`;
			const entries = [...distanceInfo.entries()].sort((a, b) => (a[0] > b[0] ? 1 : -1));
			for (const [goal, distance] of entries) {
				if (distance < Infinity) {
					// || goal.startsWith("2504")
					str += `  ${goal}: ${distance}\n`;
				}
			}
		}
		return str;
	}
}
