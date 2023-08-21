import { Graph as GraphLib, alg } from '@dagrejs/graphlib';
import { LearningUnitProvider, SkillProvider } from './dataProviders';
import { Edge, Graph, Skill, Node } from './types';

/**
 * PathPlanner class for generating graphs of skills and learning units, and finding paths between them.
 */
export class PathPlanner {
  private graph: GraphLib;
  private skillIds: Set<string>;

  /**
   * Creates a new PathPlanner instance.
   * @param skillProvider The SkillHandler instance to use for loading skills.
   * @param luProvider The LuHandler instance to use for loading learning units.
   */
  constructor(
    private skillProvider: SkillProvider,
    private luProvider: LearningUnitProvider
  ) {
    this.graph = new GraphLib({ directed: true, multigraph: true });
    this.skillIds = new Set<string>();
  }

  /**
   * Generates a graph of skills and learning units connected to the given skill.
   * @param skill The initial skill to start the graph from.
   * @param includeLearningUnits Whether to include learning units in the graph.
   * @returns A Promise that resolves to the generated graph.
   */
  public async getConnectedGraphForSkill(skill: Skill, includeLearningUnits: boolean): Promise<Graph> {
    await this.populateGraphWithSkills(skill);
    if (includeLearningUnits) await this.populateGraphWithLearningUnits();
    return this.buildReturnGraph();
  }

  /**
   * Checks if the graph of skills and learning units connected to the given skill is acyclic.
   * @param initialSkill The initial skill to start the graph from.
   * @returns A Promise that resolves to a boolean indicating whether the graph is acyclic.
   */
  public async isAcyclic(initialSkill: Skill): Promise<boolean> {
    await this.populateGraphWithSkills(initialSkill);
    return alg.isAcyclic(this.graph);
  }

  /**
   * Finds the path of learning units required to reach the given skill.
   * @param skill The skill to find the path to.
   * @returns A Promise that resolves to an array of learning unit IDs representing the path.
   */
  public async pathForSkill(skill: Skill): Promise<string[]> {
    const emptySkill: Skill = {
      id: ':::empty::node::representing::no::knowledge / required skill:::',
      nestedSkills: [],
      repositoryId: '',
    };
    await this.populateGraphWithSkills(skill, emptySkill);
    
    return alg.preorder(this.graph, ['sk' + emptySkill.id]).filter(nodeId => nodeId.startsWith('lu')).map(nodeId => nodeId.slice(2));
  }

  private async populateGraphWithSkills(initialSkill: Skill, emptySkill?: Skill): Promise<void> {
    const allSkills = await this.skillProvider.getSkillsByRepository(initialSkill.repositoryId);
    
    // Optionally add an empty skill to the graph
    if (emptySkill) {
      this.graph.setNode('sk' + emptySkill.id, emptySkill);
    }

    allSkills.forEach(skill => {
      this.skillIds.add(skill.id);
      this.graph.setNode('sk' + skill.id, skill);
      skill.nestedSkills.forEach(child => {
        this.skillIds.add(child);
        this.graph.setEdge('sk' + skill.id, 'sk' + child);
      });
    });
  }

  private async populateGraphWithLearningUnits(): Promise<void> {
    const lus = await this.luProvider.getLearningUnitsBySkills(Array.from(this.skillIds));
    
    // TODO SE: Clarify the purpose of this commented code. If unnecessary, remove.

    lus.forEach(lu => {
      this.graph.setNode('lu' + lu.id, lu);
      lu.requiredSkills.forEach(req => {
        this.graph.setEdge('sk' + req, 'lu' + lu.id);
      });
      
      lu.teachingGoals.forEach(goal => {
        this.graph.setEdge('lu' + lu.id, 'sk' + goal);
      });
    });
  }

  private buildReturnGraph(): Graph {
    const nodeList: Node[] = this.graph.nodes().map(nodeId => {
      const label = this.graph.node(nodeId);
      return { id: nodeId.slice(2), element: label };
    });

    const edgeList: Edge[] = this.graph.edges().map(element => {
      return { from: element.v.slice(2), to: element.w.slice(2) };
    });
    return { nodes: nodeList, edges: edgeList };
  }
}
