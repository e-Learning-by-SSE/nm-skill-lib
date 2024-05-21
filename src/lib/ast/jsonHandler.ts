import { Skill } from "../types";
import { And } from "./and";
import { SkillExpression } from "./formula";
import { Or } from "./or";

// An internal type used within this file to handle the parse Json to SkillExpression
type JsonExpression = {
	operator: string;
	skills: Skill[];
	expression: string[];
};

// Convert a SkillExpression to a Json format
export function createJson(operator: string, skills: ReadonlyArray<Skill>, skillExpression: SkillExpression[]): string {			
    let nestedSkillExpression: string[] = [];
    if (skillExpression) {
        skillExpression.forEach(expression => {
            nestedSkillExpression.push(expression.toJson())
        });
    }
    
    const jsonExpression = JSON.stringify({
        operator: operator,
        skills: skills.map(skill => skill),
        expression: nestedSkillExpression
    });
    
    return jsonExpression;
}

// Parse a Json format to a SkillExpression
export function parseJsonExpression(json: string): SkillExpression {	
    const skillExpression = JSON.parse(json);

    const jsonExpression: JsonExpression = {
        operator: skillExpression.operator,
        skills: skillExpression.skills,
        expression: skillExpression.expression,
    }

    const nestedSkillExpression: SkillExpression[] = [];
    jsonExpression.expression.forEach(exp => {
        nestedSkillExpression.push(parseJsonExpression(exp))
    });

    if (jsonExpression.operator == And.name) {
        return new And(jsonExpression.skills, nestedSkillExpression);
    } else if (jsonExpression.operator == Or.name) {
        return new Or(jsonExpression.skills, nestedSkillExpression);
    }

}