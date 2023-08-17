import { Graph as GraphLib, alg } from '@dagrejs/graphlib';
import { SkillHandler, Node, LuHandler, Skill, Edge, Graph } from '..';

export class GraphAlgorithm {
  /**
   * The internally used library, should not be exported (principle of information hiding)
   */
  private graph = new GraphLib({ directed: true, multigraph: true });
  private skillIds = new Set<string>();

  constructor(
    private skillHandler: SkillHandler,
    private luHandler: LuHandler
  ) {}

  public async computeGraphForSkill(
    initialSkill: Skill,
    includeLearningUnits: boolean,
    emptySkill?: Skill
  ) {
    this.skillIds.add(initialSkill.id);
    const allSkills = await this.skillHandler.loadSkillsOfSameMap(initialSkill);
    // Optionally add an empty skill to the graph, which may be used as starting
    // point to compute a path without any background knowledge
    if (emptySkill) {
      this.graph.setNode('sk' + emptySkill.id, emptySkill);
    }

    allSkills.forEach((skill) => {
      this.skillIds.add(skill.id);
      this.graph.setNode('sk' + skill.id, skill);

      skill.nestedSkills.forEach((child) => {
        this.skillIds.add(child);
        this.graph.setEdge('sk' + skill.id, 'sk' + child);
      });
    });

    if (includeLearningUnits) {
      const lus = await this.luHandler.loadProvidingLearningUnits(
        Array.from(this.skillIds)
      );

      // TODO SE: @Carsten: Was ist der Zweck von diesem Code?

      // for (let i = 0; i < lus.learningUnits.length; i++) {
      //   const unit = lus.learningUnits[i];
      //   if (
      //     (isSelfLearnLearningUnitDto(unit) && Number(unit.selfLearnId) > 20) ||
      //     (isSearchLearningUnitDto(unit) && Number(unit.searchId) > 20)
      //   ) {
      //     lus.learningUnits.splice(i--, 1);
      //   }
      // }
      // for (let i = 0; i < lus.length; i++) {
      //   const unit = lus[i];
      //   if (Number(unit.id) > 20) {
      //     lus.splice(i--, 1);
      //   }
      // }

      lus.forEach((lu) => {
        this.graph.setNode('lu' + lu.id, lu);
        lu.requiredSkills.forEach((req) => {
          this.graph.setEdge('sk' + req, 'lu' + lu.id);
        });
        // Optionally define empty skill as prerequisite for all LearningUnits without any any required skills
        if (lu.requiredSkills.length === 0 && emptySkill) {
          this.graph.setEdge('sk' + emptySkill.id, 'lu' + lu.id);
        }
        lu.teachingGoals.forEach((goal) => {
          this.graph.setEdge('lu' + lu.id, 'sk' + goal);
        });
      });
    }
  }

  private buildReturnGraph() {
    const nodeList: Node[] = [];
    const edgeList: Edge[] = [];

    this.graph.nodes().forEach((nodeId) => {
      const label = this.graph.node(nodeId);
      const node = new Node(nodeId.slice(2), label);
      nodeList.push(node);
    });
    this.graph.edges().forEach((element) => {
      const edge = new Edge(element.v.slice(2), element.w.slice(2));
      edgeList.push(edge);
    });

    const gr = new Graph(nodeList, edgeList);
    return gr;
  }

  public async getConnectedGraphForSkill(
    skill: Skill,
    includeLearningUnits: boolean
  ) {
    await this.computeGraphForSkill(skill, includeLearningUnits);
    return this.buildReturnGraph();
  }

  public isAcyclic() {
    return alg.isAcyclic(this.graph);
  }

  public async pathForSkill(skill: Skill) {
    // Ensure that this ID is not used by any other item
    const emptySkill: Skill = {
      id: ':::empty::node::representing::no::knowledge / required skill:::',
      nestedSkills: [],
      repositoryId: '',
    };
    await this.computeGraphForSkill(skill, true, emptySkill);

    const nodeIdList = alg.preorder(this.graph, ['sk' + emptySkill.id]);

    const lus: string[] = [];
    nodeIdList.forEach((nodeId) => {
      if (nodeId.startsWith('lu')) {
        // remove 'lu' prefix to get the id of the learning unit
        lus.push(nodeId.slice(2));
      }
    });

    return lus;
  }
}
