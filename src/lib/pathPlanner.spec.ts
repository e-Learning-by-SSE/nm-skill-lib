import { LearningUnitProvider, SkillProvider } from './dataProviders';
import { PathPlanner } from './pathPlanner';
import { LearningUnit, Skill } from './types';

describe('Path Planer', () => {
  let dataHandler;
  let planer: PathPlanner;

  // Re-usable test data (must be passed to dataHandler.init() before each test)
  // Skills sorted by IDs to simplify comparisons during tests
  // Flat map
  const firstMap: Skill[] = [
    { id: '1', repositoryId: '1', nestedSkills: [] },
    { id: '2', repositoryId: '1', nestedSkills: [] },
    { id: '3', repositoryId: '1', nestedSkills: [] },
  ].sort((a, b) => a.id.localeCompare(b.id));
  // Flat map
  const secondMap: Skill[] = [
    { id: '4', repositoryId: '2', nestedSkills: [] },
    { id: '5', repositoryId: '2', nestedSkills: [] },
    { id: '6', repositoryId: '2', nestedSkills: [] },
  ].sort((a, b) => a.id.localeCompare(b.id));
  const thirdMapHierarchy: Skill[] = [
    { id: '7', repositoryId: '3', nestedSkills: ['8'] },
    { id: '8', repositoryId: '3', nestedSkills: [] },
    { id: '9', repositoryId: '3', nestedSkills: ['10', '11'] },
    { id: '10', repositoryId: '3', nestedSkills: ['12'] },
    { id: '11', repositoryId: '3', nestedSkills: [] },
    { id: '12', repositoryId: '3', nestedSkills: [] },
  ].sort((a, b) => a.id.localeCompare(b.id));

  beforeEach(() => {
    dataHandler = new TestDataHandler();
    planer = new PathPlanner(dataHandler, dataHandler);
  });

  describe('getConnectedGraphForSkill - Skills Only', () => {
    it('Only skills available; no nested skills -> return all skills of the same map', async () => {
      // Test data preparation
      dataHandler.init([...firstMap, ...secondMap, ...thirdMapHierarchy], []);

      // Test: Compute graph
      const graph = await planer.getConnectedGraphForSkill(firstMap[0], false);

      // Assert: All skills of the first map are returned
      const nodeIDs = graph.nodes
        .map((node) => node.id)
        .sort((a, b) => a.localeCompare(b));
      const nodeElements = graph.nodes
        .map((node) => node.element)
        .sort((a, b) => a.id.localeCompare(b.id));
      // Compare IDs
      expect(nodeIDs).toEqual(firstMap.map((skill) => skill.id));
      // Compare elements
      expect(nodeElements).toEqual(firstMap);
    });

    it('Only skills available; nested skills -> return all skills of the same map', async () => {
      // Test data preparation
      dataHandler.init([...firstMap, ...secondMap, ...thirdMapHierarchy], []);

      // Test: Compute graph
      const graph = await planer.getConnectedGraphForSkill(
        thirdMapHierarchy[0],
        false
      );

      // Assert: All skills of the third map are returned
      const nodeIDs = graph.nodes
        .map((node) => node.id)
        .sort((a, b) => a.localeCompare(b));
      const nodeElements = graph.nodes
        .map((node) => node.element)
        .sort((a, b) => a.id.localeCompare(b.id));
      // Compare IDs
      expect(nodeIDs).toEqual(thirdMapHierarchy.map((skill) => skill.id));
      // Compare elements
      expect(nodeElements).toEqual(thirdMapHierarchy);
    });
  });
});

class TestDataHandler implements LearningUnitProvider, SkillProvider {
  private skillMaps: Map<string, Skill[]> = new Map<string, Skill[]>();
  private learningUnits: LearningUnit[] = [];

  init(skills: Skill[], learningUnits: LearningUnit[]) {
    // Create SkillMaps on the fly
    skills.forEach((skill) => {
      // Add skill to existing map
      if (this.skillMaps.has(skill.repositoryId)) {
        this.skillMaps.get(skill.repositoryId).push(skill);
      } else {
        // Create new map
        this.skillMaps.set(skill.repositoryId, [skill]);
      }
    });

    this.learningUnits = learningUnits;
  }

  getSkillsByRepository(repositoryId: string): Promise<Skill[]> {
    return Promise.resolve(this.skillMaps.get(repositoryId));
  }

  getLearningUnitsBySkills(skillIds: string[]): Promise<LearningUnit[]> {
    return Promise.resolve(
      this.learningUnits.filter((lu) => {
        lu.teachingGoals.some((goal) => skillIds.includes(goal));
      })
    );
  }
}
