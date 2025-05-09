import { LearningUnit, PotentialNode, Skill, AnalyzedPath, Unit, isLearningUnit } from "../..";
import { GlobalKnowledge } from "../fastDownward/global-knowledge";
import { Graph as GraphLib } from "@dagrejs/graphlib";

/**
 * Analysis skills of a goal to find the missing skills.
 * Create a potential graph using createGoalsGraph function.
 * The algorithm traces back each path in the a potential graph from the goal backward, recursively.
 * Get all successors (children) of a node, then get all successors (children) of each them and so on, recursively.
 *
 * Skill is considered a missing skill if:
 *      A) A path ends with with this skill
 *      AND
 *      B) The parent of the skill does not have a learning unit as child,
 *         Meaning that the parent can not be learned through learning units (parent/child).
 *
 * Example:
 *                => Sk:02 => lu:02 => Sk:04 => lu:04
 *                |
 * Sk:01 => Lu:01 |
 *                |                 => Sk:05 => lu:05
 *                => Sk:03 => lu:03 |
 *                                  => Sk:06
 *
 * Path A) Sk:1 => Lu:01 => Sk:02 => lu:02 => Sk:04 => lu:04 (There are no Missing Skills)
 * Path B) Sk:1 => Lu:01 => Sk:03 => lu:03 => Sk:05 => lu:05 (There are no Missing Skills)
 * Path C) Sk:1 => Lu:01 => Sk:03 => lu:03 => Sk:06 ("Sk:06" is considered a Missing Skill)
 *
 * @param goals The skills that should be learned.
 * @param allUnits The set of all LearningUnits.
 * @param allSkills The set of all skills (independent of what was already learned and what should be learned).
 * @param knowledge The knowledge of the user (skills already learned).
 * @returns A list of PotentialNodes.
 */
export function skillAnalysis<LU extends LearningUnit>(
    goals: Skill[],
    allUnits: ReadonlyArray<Unit<LU>>,
    allSkills: ReadonlyArray<Skill>,
    knowledge: Skill[]
): AnalyzedPath<LU>[] {
    // Create a potential graph that holds the potential learning units and skills
    const graph = createGoalsGraph(goals, allSkills, allUnits, knowledge);

    // A potential paths list
    const paths: PotentialNode<LU>[] = [];

    // Start with nodes without parent (skills from goals)
    const goalNode = graph.sources();

    // For each node without parent trace back each path, recursively.
    goalNode.forEach(node => {
        tracePath(node, undefined);
    });

    // Trace back each path, recursively.
    function tracePath(node: string, parent: PotentialNode<LU> | undefined) {
        // Create a PotentialNode for the current node
        const path: PotentialNode<LU> = {
            id: node.substring(2),
            parent: parent,
            missingSkill: ""
        };

        // Get all the children of the current node (successors)
        const children = graph.successors(node)!;

        // Check if there is no children for the current node
        if (children.length == 0) {
            // Check if the current node is a skill
            // Check if the parent of the skill can not be learned through learning units
            if (node.startsWith("sk") && checkParent(node)) {
                path.missingSkill = node.substring(2);
            }
            // Since there are no more children, we add the path to the potential paths list
            paths.push(path);
        } else {
            // Trace back the path of each child, recursively.
            children.forEach(child => {
                tracePath(child, path);
            });
        }
    }

    // Check if the parent of the skill can not be learned through learning units
    function checkParent(node: string): boolean {
        // Get the parents of the current node (predecessors)
        const parent = graph.predecessors(node)!;

        // Filter only the skill parents of the current node (predecessors)
        const skillParent = parent.filter(parent => parent.startsWith("sk"));

        let luChildrenCount = 0;

        // Find the number of the learning units as children (successors) for all the parents.
        // Meaning that at least one skill parent can be learned through learning units.
        skillParent.forEach(parent => {
            luChildrenCount += graph
                .successors(parent)!
                .filter(child => child.startsWith("lu")).length;
        });

        // Return False if there are no learning units as children.
        // Return True if at least one learning units as children exist for any parent.
        return luChildrenCount == 0;
    }

    const analyzedPaths: AnalyzedPath<LU>[] = [];

    // Filter paths where the node in the end of the path have a Missing Skill
    const pathsMissingSkills = paths.filter(path => path.missingSkill);

    // Convert PotentialNode to analyzedPath where analyzedPath has a missing skill and learning unit path (LU[])
    pathsMissingSkills.forEach(potentialNode => {
        analyzedPaths.push({
            path: getAnalyzedPath(potentialNode, allUnits),
            missingSkill: potentialNode.missingSkill,
            fullPath: getFullAnalyzedPath(potentialNode)
        });
    });

    // Return only paths where the node in the end of the path have a Missing Skill
    return analyzedPaths;
}

/**
 * Filter the learning units and skills to reduce the size of the potential candidate for the algorithm.
 * Create a Potential graph using createGoalsGraph function.
 * Extract the potential learning units and skills the potential graph.
 *
 * @param goals The skills that should be learned.
 * @param allUnits The set of all LearningUnits.
 * @param allSkills The set of all skills (independent of what was already learned and what should be learned).
 * @param knowledge The knowledge of the user (skills already learned).
 * @returns A tuple in form of filtered (learningUnits, skills) that are useful to find a path.
 */
export function filterForUnitsAndSkills<LU extends LearningUnit>(
    goals: Skill[],
    allUnits: ReadonlyArray<Unit<LU>>,
    allSkills: ReadonlyArray<Skill>,
    knowledge: Skill[]
): [LU[], Skill[]] {
    // Create a potential graph that holds the potential learning units and skills
    const graph = createGoalsGraph(goals, allSkills, allUnits, knowledge);

    // Extract the potential learning unit nodes from the potential graph
    const lus = graph
        .nodes()
        .filter(node => node.startsWith("lu"))
        .map(lu => lu.substring(2));

    // Extract the potential skill nodes from the potential graph
    const skills = graph
        .nodes()
        .filter(node => node.startsWith("sk"))
        .map(lu => lu.substring(2));

    // Filter the learning units to find the potential learning unit
    const inScopeLearningUnits = allUnits.filter(lu => lus.includes(lu.id));

    // Filter the skills to find the potential skills
    const inScopeSkills = allSkills.filter(skill => skills.includes(skill.id));

    // Return the potential learning units and skills as a tuple
    return [inScopeLearningUnits, inScopeSkills];
}

/**
 * Create a potential graph for potential learning units and skills starting with the skills from the goals.
 * Tracing backward the potential learning units from the goal using required skills.
 * Taking in consideration the parent/children relation.
 *
 * Example of a potential graph:
 *                => Sk:02 => lu:02 => Sk:04 => lu:04
 *                |
 * Sk:01 => Lu:01 |
 *                |                 => Sk:05 => lu:05
 *                => Sk:03 => lu:03 |
 *                                  => Sk:06 => lu:06
 *
 * @param goals The skills that should be learned.
 * @param allUnits The set of all LearningUnits.
 * @param allSkills The set of all skills (independent of what was already learned and what should be learned).
 * @param knowledge The knowledge of the user (skills already learned).
 * @param suggestions Add the suggested skill as requirement for the learning units default value is [suggestions=true]
 * @returns A graph for the potential learning units and skills are useful to find a path.
 */
export function createGoalsGraph<LU extends LearningUnit>(
    goals: Skill[],
    allSkills: ReadonlyArray<Skill>,
    allUnits?: ReadonlyArray<Unit<LU>>,
    knowledge?: Skill[],
    suggestions: boolean = true
): GraphLib {
    // Extract the parent/children relation from all the skills
    const globalKnowledge = new GlobalKnowledge(allSkills);

    // Create a directed multigraph to hold the potential learning units and skills with edges
    const graph = new GraphLib({ directed: true, multigraph: true });

    // Add the starting skills from the goals to nodes list for analyzing
    const nodes: (LU | Skill)[] = goals.slice();

    // List for the processed nodes (learning units and skills) to avoid reprocessing them again
    const processedNodes: string[] = [];

    while (nodes.length > 0) {
        const node = nodes.pop();

        // Skip processed nodes (learning units and skills) and skills in the knowledge of the user
        if (
            processedNodes.includes(node!.id) ||
            knowledge?.map(skill => skill.id).includes(node!.id)
        ) {
            continue;
        }

        // Check which type of backward tracing we should preform, learning units or skills
        if (isLearningUnit(node!)) {
            backSearchLu(node, suggestions);
        } else {
            backSearchSkill(node!);
        }

        // Add the node (learning units and skills) to the processed list
        processedNodes.push(node!.id);
    }

    // Backward tracing for a skill to find potential learning units and skills
    function backSearchSkill(skill: Skill) {
        // Create a node in the graph for the skill
        const skillName = "sk" + skill.id;
        graph.setNode(skillName, skill);

        // find potential learning units using the goals for the them
        if (allUnits) {
            const potentialGoalsUnits = allUnits.filter(lu =>
                lu.provides.some(sk => sk.id == skill.id)
            );

            // Create a node in the graph for each potential learning units
            // Create a edge from the skill (source) to each learning unit (sink)
            // Add the new nodes (potential learning units) to the nodes list for analyzing
            potentialGoalsUnits.forEach(lu => {
                const luName = "lu" + lu.id;
                graph.setNode(luName, lu);
                graph.setEdge(skillName, luName);
                nodes.unshift(lu);
            });
        }

        // Create a node in the graph for each nested skills
        // Create a edge from the skill (source) to each nested skills (sink)
        // Add the new nodes (nested skills) to the nodes list for analyzing
        skill.children.forEach(child => {
            const childSkill = allSkills.find(sk => sk.id == child);
            const childName = "sk" + child;
            if (childSkill) {
                graph.setNode(childName, childSkill);
                graph.setEdge(skillName, childName);
                nodes.unshift(childSkill);
            }
        });

        // Get the parents for the skill (skill with multiple parents in considered)
        const parentSkills = globalKnowledge
            .getAllParents()
            .filter(sk => sk.children.includes(skill.id));

        // Create a node in the graph for each parent skills
        // Create a edge from the parent skills (source) to the skill (sink)
        // Add the new nodes (parent skills) to the nodes list for analyzing
        parentSkills.forEach(parent => {
            const parentName = "sk" + parent.id;
            graph.setNode(parentName, parent);
            graph.setEdge(parentName, skillName);
            nodes.unshift(parent);
        });
    }

    // Backward tracing for a learning unit to find potential skills
    function backSearchLu(lu: LU, suggestions: boolean) {
        // Create a node in the graph for the learning unit
        const luName = "lu" + lu.id;
        graph.setNode(luName, lu);

        // Create a node in the graph for each required skills
        // Create a edge from the learning unit (source) to each required skills (sink)
        // Add the new nodes (required skills) to the nodes list for analyzing
        lu.requires.extractSkills().forEach(req => {
            const SkillName = "sk" + req.id;
            graph.setNode(SkillName, req);
            graph.setEdge(luName, SkillName);
            nodes.unshift(req);
        });

        if (suggestions) {
            lu.suggestedSkills.forEach(suggestion => {
                // Analogous to requirements: Skill -> LearningUnit
                const SkillName = "sk" + suggestion.skill.id;
                graph.setNode(SkillName, suggestion.skill);
                graph.setEdge(luName, SkillName);
                nodes.unshift(suggestion.skill);
            });
        }
    }

    // Return the potential graph for learning units and skills
    return graph;
}

/**
 * extract a list of learning unit from a PotentialNode path
 */
export function getAnalyzedPath<LU extends LearningUnit>(
    potentialNode: PotentialNode<LU> | undefined,
    allUnits: ReadonlyArray<Unit<LU>>
): LU[] {
    if (potentialNode) {
        const unit = allUnits.find(unit => unit.id == potentialNode.id);
        return unit
            ? [unit].concat(getAnalyzedPath(potentialNode.parent, allUnits))
            : getAnalyzedPath(potentialNode.parent, allUnits);
    }
    return [];
}

/**
 * extract a full list of the path including skills and learning unit from a PotentialNode path
 */
export function getFullAnalyzedPath<LU extends LearningUnit>(
    potentialNode: PotentialNode<LU> | undefined
): string[] {
    if (potentialNode) {
        return [potentialNode.id].concat(getFullAnalyzedPath(potentialNode.parent));
    }
    return [];
}
