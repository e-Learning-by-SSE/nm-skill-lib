import { LearningUnit } from './learningUnit';
import { Skill } from './skill';

export class Node {
  id: string;
  element: Skill | LearningUnit;

  constructor(id: string, element: Skill | LearningUnit) {
    this.id = id;
    this.element = element;
  }
}
