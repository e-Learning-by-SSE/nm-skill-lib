import { Skill } from "../types";
import { And } from "./and";
import { SkillExpression, Variable } from "./formula";
import { Or } from "./or";

// An internal type used within this file to handle the parse Json to SkillExpression
type JsonExpression = {
	operator: string;
	skills: string[];
};

// Convert a SkillExpression to a Json format
export function createJson(operator: string, variable: SkillExpression[]): string {			
    let nestedVariable: string[] = [];
    if (variable) {
        variable.forEach(expression => {
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
export function parseJsonExpression(json: string, firstMap: Skill[]): SkillExpression {	

    const skill = firstMap.find(sk => json == sk.id);
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
        variables.push(parseJsonExpression(skill, firstMap));
    });

    if (jsonExpression.operator == And.name) {
        return new And(variables);
    } else if (jsonExpression.operator == Or.name) {
        return new Or(variables);
    }

}