import { CostFunction } from "./fastDownward/fdTypes";
import { LearningUnit } from "./types";

/**
 * ETC based on cost function developed by Michael Ganske:
 * ```
 * ETC = 2 * (mediaTime) + (words / 150) + t_i
 * ```
 * while `t_i` is currently not considered.
 *
 * If there is neither a mediaTime nor a word count specified, the ETC is 1.
 * @param unit The unit for which the ETC should be calculated.
 * @returns The estimated time to complete the unit or 1 if not data for its computation was provided
 */
export const estimatedCompletionTime: CostFunction<LearningUnit> = (unit: LearningUnit) => {
	let progressingTime = 1;
	if (unit.mediaTime || unit.words) {
		progressingTime = 0;

		if (unit.mediaTime) {
			progressingTime += 2 * unit.mediaTime;
		}
		if (unit.words) {
			progressingTime += unit.words / 150;
		}
	}

	// TODO SE: Check if we also want to include questionnaires (t_i / interaction duration)

	return progressingTime;
};
