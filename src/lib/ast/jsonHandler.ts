import { And } from "./and";
import { SkillExpression } from "./skillExpression";
import { Or } from "./or";
import { Variable } from "./variable";
import { SkillsRelations } from "./skillsRelation";
import { Empty } from "./empty";
import { N_of } from "./n_of";

// An internal type used within this file to handle the parse Json to SkillExpression
type JsonExpression = {
    operator: string;
    skills: string[];
    min?: number;
};

// Convert a SkillExpression to a Json format
export function createJson(operator: string, terms: SkillExpression[], min?: number): string {
    let translatedTerms: string[] = [];
    if (terms) {
        terms.forEach(expression => {
            translatedTerms.push(expression.toJson());
        });
    }

    if (min) {
        return JSON.stringify({
            operator: operator,
            skills: translatedTerms,
            min: min
        });
    } else {
        return JSON.stringify({
            operator: operator,
            skills: translatedTerms
        });
    }
}

// Parse a Json format to a SkillExpression
export function parseJsonExpression(
    json: string,
    skillsRelations: SkillsRelations
): SkillExpression {
    if (!json.includes("operator")) {
        const skill = skillsRelations.skills.find(sk => json == sk.id);
        if (skill) {
            return new Variable(skill);
        }
    }

    const parsedSkillExpression = JSON.parse(json);

    const jsonExpression: JsonExpression = {
        operator: parsedSkillExpression.operator,
        skills: parsedSkillExpression.skills,
        min: parsedSkillExpression.min
    };

    const expressions: SkillExpression[] = [];
    jsonExpression.skills.forEach(skill => {
        expressions.push(parseJsonExpression(skill, skillsRelations));
    });

    let expression: SkillExpression = new Empty(expressions);
    if (jsonExpression.operator == And.name) {
        expression = new And(expressions);
    } else if (jsonExpression.operator == Or.name) {
        expression = new Or(expressions);
    } else if (jsonExpression.operator == N_of.name) {
        expression = new N_of(expressions, jsonExpression.min!);
    }
    return expression;
}
