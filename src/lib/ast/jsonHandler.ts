import { Skill } from "../types";
import { And } from "./and";
import { SkillExpression } from "./skillExpression";
import { Or } from "./or";
import { Variable } from "./variable";
import { SkillsRelations } from "./skillsRelation";

// An internal type used within this file to handle the parse Json to SkillExpression
type JsonExpression = {
	operator: string;
	skills: string[];
};

// Convert a SkillExpression to a Json format
export function createJson(operator: string, terms: SkillExpression[]): string {			
    let nestedVariable: string[] = [];
    if (terms) {
        terms.forEach(expression => {
            nestedVariable.push(expression.toJson())
        });
    }
    
    const jsonExpression = JSON.stringify({
        operator: operator,
        skills: nestedVariable
    });
    
    return jsonExpression;
}

// Parse a Json format to a SkillExpression
export function parseJsonExpression(json: string, skillsRelations: SkillsRelations): SkillExpression {	

    const skill = skillsRelations.skills.find(sk => json == sk.id);
    if (skill) {
        return new Variable(skill);
    }

    const skillExpression = JSON.parse(json);

    const jsonExpression: JsonExpression = {
        operator: skillExpression.operator,
        skills: skillExpression.skills
    }

    const variables: SkillExpression[] = [];
    jsonExpression.skills.forEach(skill => {
        variables.push(parseJsonExpression(skill, skillsRelations));
    });

    if (jsonExpression.operator == And.name) {
        return new And(variables);
    } else if (jsonExpression.operator == Or.name) {
        return new Or(variables);
    }

}