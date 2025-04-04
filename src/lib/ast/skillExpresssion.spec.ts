import { Skill } from "../types";
import { Or } from "./or";
import { And } from "./and";
import { N_of } from "./n_of";
import { SkillExpression } from "./skillExpression";
import { parseJsonExpression } from "./jsonHandler";
import { Variable } from "./variable";
import { Empty } from "./empty";
import { GlobalKnowledge } from "../fastDownward/global-knowledge";

describe("precondition formula", () => {
    const skill1 = { id: "skill:1", children: [] };
    const skill2 = { id: "skill:2", children: [] };
    const skill3 = { id: "skill:3", children: [] };
    const skill4 = { id: "skill:4", children: [] };
    const skill5 = { id: "skill:5", children: [] };
    const skill6 = { id: "skill:6", children: [] };
    const skill7 = { id: "skill:7", children: [] };
    const skill8 = { id: "skill:8", children: [] };
    const skill9 = { id: "skill:9", children: ["skill:7", "skill:8"] };
    const skill10 = {
        id: "skill:10",
        children: ["skill:1", "skill:2", "skill:3", "skill:4", "skill:5", "skill:6"]
    };
    const skill11 = {
        id: "skill:11",
        children: ["skill:9"]
    };
    const skill12 = {
        id: "skill:12",
        children: ["skill:4", "skill:5"]
    };
    const skill13 = {
        id: "skill:13",
        children: ["skill:11", "skill:12"]
    };

    const skills: Skill[] = [
        skill1,
        skill2,
        skill3,
        skill4,
        skill5,
        skill6,
        skill7,
        skill8,
        skill9,
        skill10,
        skill11,
        skill12,
        skill13
    ];

    const globalKnowledge = new GlobalKnowledge(skills);

    describe("skills relations", () => {
        it("find all parents in skills", () => {
            expect(globalKnowledge.getAllParentSkills().length).toBe(5);
        });

        it("find children skills for a parent", () => {
            expect(globalKnowledge.getChildrenSkills(skill13).length).toBe(4);
        });
    });

    describe("Empty", () => {
        it("'empty' skillExpression type", () => {
            const emptySkills = new Empty();

            expect(emptySkills.getExpressionType()).toBe("Empty");
        });

        it("'empty' expression, no required skill for the expression", () => {
            const emptySkills = new Empty();

            expect(emptySkills.evaluate([], globalKnowledge)).toBeTruthy();
            expect(emptySkills.extractSkills().length).toBe(0);
            expect(emptySkills.toJson()).toBe("");
            expect(emptySkills.filterSkillsByWithout(globalKnowledge).length).toBe(0);
        });
    });

    describe("Variable", () => {
        it("'variable' skillExpression type", () => {
            const variable = new Variable(skill2);

            expect(variable.getExpressionType()).toBe("Variable");
        });

        it("'variable' expression evaluate", () => {
            const variable = new Variable(skill2);

            expect(variable.evaluate(["skill:2"], globalKnowledge)).toBeTruthy();
        });

        it("'variable' extraction", () => {
            const variable = new Variable(skill2);

            expect(variable.extractSkills().length).toBe(1);
        });

        it("'variable' translation to json", () => {
            const variable = new Variable(skill2);

            expect(variable.toJson()).toBe("skill:2");
        });
    });

    describe("AND", () => {
        it("'and' skillExpression type", () => {
            const andSkills = new And([new Variable(skill2)]);

            expect(andSkills.getExpressionType()).toBe("And");
        });

        it("'and' skills in precondition formula", () => {
            const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

            expect(andSkills.evaluate(["skill:1"], globalKnowledge)).toBeFalsy();
            expect(andSkills.evaluate(["skill:3", "skill:4"], globalKnowledge)).toBeTruthy();
        });

        it("'and' nested skill expression in precondition formula", () => {
            const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
            const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

            const andSkillExpression = new And([orSkills, andSkills]);

            expect(andSkillExpression.evaluate(["skill:1"], globalKnowledge)).toBeFalsy();
            expect(
                andSkillExpression.evaluate(["skill:1", "skill:3", "skill:4"], globalKnowledge)
            ).toBeTruthy();
        });

        it("'and' complex skills expression with nested skills expressions precondition formula", () => {
            const andSkills = new And([new Variable(skill1), new Variable(skill2)]);
            const orSkills = new Or([new Variable(skill3), new Variable(skill4)]);

            const andSkillExpression = new And([
                new Or([new Variable(skill5), new Variable(skill6)]),
                new And([andSkills, orSkills])
            ]);

            expect(
                andSkillExpression.evaluate(["skill:5", "skill:6"], globalKnowledge)
            ).toBeFalsy();
            expect(
                andSkillExpression.evaluate(
                    ["skill:1", "skill:2", "skill:3", "skill:5"],
                    globalKnowledge
                )
            ).toBeTruthy();
        });
    });

    describe("OR", () => {
        it("'or' skillExpression type", () => {
            const orSkills = new Or([new Variable(skill2)]);

            expect(orSkills.getExpressionType()).toBe("Or");
        });

        it("'or' skills in precondition formula", () => {
            const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);

            expect(orSkills.evaluate(["skill:1"], globalKnowledge)).toBeTruthy();
        });

        it("'or' nested skill expression in precondition formula", () => {
            const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
            const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

            const orSkillExpression = new Or([orSkills, andSkills]);

            expect(orSkillExpression.evaluate(["skill:1"], globalKnowledge)).toBeTruthy();
        });

        it("'or' complex skills expression with nested skills expressions precondition formula", () => {
            const andSkills = new And([new Variable(skill1), new Variable(skill2)]);
            const orSkills = new Or([new Variable(skill3), new Variable(skill4)]);

            const orSkillExpression = new Or([
                new Or([new Variable(skill5), new Variable(skill6)]),
                new And([andSkills, orSkills])
            ]);

            expect(
                orSkillExpression.evaluate(["skill:5", "skill:6"], globalKnowledge)
            ).toBeTruthy();
            expect(
                orSkillExpression.evaluate(["skill:1", "skill:2", "skill:3"], globalKnowledge)
            ).toBeTruthy();
        });
    });

    describe("N_of", () => {
        it("'n_of' skillExpression type", () => {
            const n_ofSkills = new N_of([new Variable(skill2)], 1);

            expect(n_ofSkills.getExpressionType()).toBe("n_of");
        });

        it("'n_of' skills in precondition formula", () => {
            const n_ofSkills = new N_of(
                [new Variable(skill1), new Variable(skill2), new Variable(skill3)],
                2
            );

            expect(n_ofSkills.evaluate(["skill:1"], globalKnowledge)).toBeFalsy();
            expect(n_ofSkills.evaluate(["skill:2"], globalKnowledge)).toBeFalsy();
            expect(n_ofSkills.evaluate(["skill:3"], globalKnowledge)).toBeFalsy();
            expect(n_ofSkills.evaluate(["skill:1", "skill:2"], globalKnowledge)).toBeTruthy();
            expect(n_ofSkills.evaluate(["skill:2", "skill:3"], globalKnowledge)).toBeTruthy();
        });

        it("'n_of' nested skill expression in precondition formula", () => {
            const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
            const secondOrSkills = new Or([new Variable(skill3), new Variable(skill4)]);
            const andSkills = new And([new Variable(skill5), new Variable(skill6)]);

            const n_ofSkillExpression = new N_of([orSkills, secondOrSkills, andSkills], 2);

            expect(n_ofSkillExpression.evaluate(["skill:1"], globalKnowledge)).toBeFalsy();
            expect(
                n_ofSkillExpression.evaluate(["skill:1", "skill:4"], globalKnowledge)
            ).toBeTruthy();
            expect(
                n_ofSkillExpression.evaluate(["skill:1", "skill:5"], globalKnowledge)
            ).toBeFalsy();
            expect(
                n_ofSkillExpression.evaluate(["skill:1", "skill:5", "skill:6"], globalKnowledge)
            ).toBeTruthy();
        });

        it("'n_of' complex skills expression with nested skills expressions precondition formula", () => {
            const andSkills = new And([new Variable(skill1), new Variable(skill2)]);
            const secondAndSkills = new And([new Variable(skill3), new Variable(skill4)]);
            const orSkills = new Or([new Variable(skill5), new Variable(skill6)]);

            const n_ofSkillExpression = new N_of(
                [
                    new N_of([new Variable(skill7), new Variable(skill8)], 1),
                    new And([andSkills, orSkills]),
                    secondAndSkills
                ],
                2
            );

            expect(
                n_ofSkillExpression.evaluate(
                    ["skill:1", "skill:2", "skill:5", "skill:7"],
                    globalKnowledge
                )
            ).toBeTruthy();
            expect(
                n_ofSkillExpression.evaluate(["skill:3", "skill:4", "skill:8"], globalKnowledge)
            ).toBeTruthy();
        });
    });

    describe("Extract skills", () => {
        it("extract all skills from skill expression", () => {
            const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
            const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

            const orSkillExpression = new Or([orSkills, andSkills]);
            const andSkillExpression = new And([orSkills, andSkills]);

            expect(orSkillExpression.extractSkills()).toEqual([skill1, skill2, skill3, skill4]);
            expect(andSkillExpression.extractSkills()).toEqual([skill1, skill2, skill3, skill4]);
        });

        it("extract all skills without duplication from skill expression", () => {
            const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
            const andSkills = new And([new Variable(skill2), new Variable(skill3)]);

            const orSkillExpression = new Or([orSkills, andSkills]);
            const andSkillExpression = new And([orSkills, andSkills]);

            expect(orSkillExpression.extractSkills()).toEqual([skill1, skill2, skill3]);
            expect(andSkillExpression.extractSkills()).toEqual([skill1, skill2, skill3]);
        });

        it("cache the extracted skills from skill expression", () => {
            const variables: Variable[] = [];
            for (let index = 1; index < 101; index++) {
                variables.push(new Variable({ id: "skill:" + index, children: [] }));
            }

            const andSkills = new And(variables);
            expect(andSkills.extractSkills().length).toBe(100);
            expect(andSkills.extractSkills().length).toBe(100);
        });
    });

    describe("Json translation", () => {
        it("convert skill expression to Json format string", () => {
            const variable = new Variable(skill1);
            const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
            const andSkills = new And([new Variable(skill3), new Variable(skill4)]);
            const n_ofSkills = new N_of([new Variable(skill5), new Variable(skill6)], 1);

            const variableJson = variable.toJson();
            const orSkillsJson = orSkills.toJson();
            const andSkillsJson = andSkills.toJson();
            const n_ofSkillsJson = n_ofSkills.toJson();

            expect(variableJson).toBe("skill:1");
            expect(orSkillsJson).toBe('{"operator":"Or","skills":["skill:1","skill:2"]}');
            expect(andSkillsJson).toBe('{"operator":"And","skills":["skill:3","skill:4"]}');
            expect(n_ofSkillsJson).toBe(
                '{"operator":"N_of","skills":["skill:5","skill:6"],"min":1}'
            );
        });

        it("convert 'variable' format string to skill expression 'variable'", () => {
            const jsonSkillExpression = "skill:1";

            const skillExpression = parseJsonExpression(jsonSkillExpression, globalKnowledge);

            expect(skillExpression.extractSkills().length).toBe(1);
            expect(skillExpression.evaluate(["skill:2"], globalKnowledge)).toBeFalsy();
            expect(skillExpression.evaluate(["skill:1"], globalKnowledge)).toBeTruthy();
        });

        it("convert 'and Json' format string to skill expression", () => {
            const jsonSkillExpression = '{"operator":"And","skills":["skill:3","skill:4"]}';

            const skillExpression = parseJsonExpression(jsonSkillExpression, globalKnowledge);

            expect(skillExpression.extractSkills().length).toBe(2);
            expect(skillExpression.evaluate(["skill:3"], globalKnowledge)).toBeFalsy();
            expect(skillExpression.evaluate(["skill:3", "skill:4"], globalKnowledge)).toBeTruthy();
        });

        it("convert 'or Json' format string to skill expression", () => {
            const jsonSkillExpression = '{"operator":"Or","skills":["skill:1"]}';

            const skillExpression = parseJsonExpression(jsonSkillExpression, globalKnowledge);

            expect(skillExpression.extractSkills().length).toBe(1);
            expect(skillExpression.evaluate(["skill:1"], globalKnowledge)).toBeTruthy();
        });

        it("convert 'n_of Json' format string to skill expression", () => {
            const jsonSkillExpression =
                '{"operator":"N_of","skills":["skill:5","skill:6"],"min":1}';

            const skillExpression = parseJsonExpression(jsonSkillExpression, globalKnowledge);

            expect(skillExpression.extractSkills().length).toBe(2);
            expect(skillExpression.evaluate(["skill:5"], globalKnowledge)).toBeTruthy();
        });

        it("convert nested skill expression to Json format string", () => {
            const orSkills = new Or([new Variable(skill1), new Variable(skill2)]);
            const andSkills = new And([new Variable(skill3), new Variable(skill4)]);

            const orSkillExpression = new Or([orSkills, andSkills]);

            const orSkillExpressionJson = orSkillExpression.toJson();

            expect(orSkillExpressionJson).toBe(
                '{"operator":"Or","skills":["{\\"operator\\":\\"Or\\",\\"skills\\":[\\"skill:1\\",\\"skill:2\\"]}","{\\"operator\\":\\"And\\",\\"skills\\":[\\"skill:3\\",\\"skill:4\\"]}"]}'
            );
        });

        it("convert nested Json format string to skill expression", () => {
            const jsonSkillExpression =
                '{"operator":"Or","skills":["{\\"operator\\":\\"Or\\",\\"skills\\":[\\"skill:1\\",\\"skill:2\\"]}","{\\"operator\\":\\"And\\",\\"skills\\":[\\"skill:3\\",\\"skill:4\\"]}"]}';

            const skillExpression = parseJsonExpression(jsonSkillExpression, globalKnowledge);

            expect(skillExpression.extractSkills().length).toBe(4);
            expect(skillExpression.evaluate(["skill:3"], globalKnowledge)).toBeFalsy();
            expect(skillExpression.evaluate(["skill:1"], globalKnowledge)).toBeTruthy();
        });
    });

    describe("skill expressions 'Without'", () => {
        it("'and' skills checking without", () => {
            const without = [new Variable(skill1)];
            const andSkillsWithSkill = new And([
                new Variable(skill1),
                new Variable(skill2),
                new Variable(skill3)
            ]);
            const andSkillsWithoutSkill = new And([new Variable(skill2), new Variable(skill3)]);

            expect(
                andSkillsWithSkill.evaluate(
                    ["skill:1", "skill:2", "skill:3"],
                    globalKnowledge,
                    without
                )
            ).toBeTruthy();
            expect(
                andSkillsWithoutSkill.evaluate(["skill:2", "skill:3"], globalKnowledge, without)
            ).toBeTruthy();
        });

        it("'or' skills checking without", () => {
            const without = [new Variable(skill1)];
            const orSkillsWithSkill = new Or([
                new Variable(skill1),
                new Variable(skill2),
                new Variable(skill3)
            ]);
            const orSkillsWithoutSkill = new Or([new Variable(skill2), new Variable(skill3)]);

            expect(orSkillsWithSkill.evaluate(["skill:3"], globalKnowledge, without)).toBeTruthy();
            expect(
                orSkillsWithoutSkill.evaluate(["skill:3"], globalKnowledge, without)
            ).toBeTruthy();
        });

        it("'n_of' skills checking without", () => {
            const without = [new Variable(skill1)];
            const n_ofSkillsWithSkill = new N_of(
                [new Variable(skill1), new Variable(skill2), new Variable(skill3)],
                1
            );
            const n_ofSkillsWithoutSkill = new N_of(
                [new Variable(skill2), new Variable(skill3)],
                1
            );

            expect(
                n_ofSkillsWithSkill.evaluate(["skill:3"], globalKnowledge, without)
            ).toBeTruthy();
            expect(
                n_ofSkillsWithoutSkill.evaluate(["skill:3"], globalKnowledge, without)
            ).toBeTruthy();
        });

        it("'and' recursive call checking without", () => {
            const firstAndSkills = new And([
                new Variable(skill1),
                new Variable(skill2),
                new Variable(skill3)
            ]);
            const SecondAndSkills = new And([
                new Variable(skill4),
                new Variable(skill5),
                new Variable(skill6)
            ]);

            const without = [new Variable(skill1), new Variable(skill5)];

            const skillExpression = new And([firstAndSkills, SecondAndSkills]);

            expect(
                skillExpression.evaluate(
                    ["skill:1", "skill:2", "skill:3", "skill:4", "skill:5", "skill:6"],
                    globalKnowledge,
                    without
                )
            ).toBeTruthy();
        });

        it("'or' recursive call checking without", () => {
            const firstAndSkills = new And([
                new Variable(skill1),
                new Variable(skill2),
                new Variable(skill3)
            ]);
            const SecondAndSkills = new And([
                new Variable(skill4),
                new Variable(skill5),
                new Variable(skill6)
            ]);

            const without = [new Variable(skill1), new Variable(skill5)];

            const skillExpression = new Or([firstAndSkills, SecondAndSkills]);

            expect(
                skillExpression.evaluate(
                    ["skill:1", "skill:2", "skill:3"],
                    globalKnowledge,
                    without
                )
            ).toBeTruthy();
        });

        it("'n_of' recursive call checking without", () => {
            const firstAndSkills = new And([
                new Variable(skill1),
                new Variable(skill2),
                new Variable(skill3)
            ]);
            const SecondAndSkills = new And([
                new Variable(skill4),
                new Variable(skill5),
                new Variable(skill6)
            ]);

            const without = [new Variable(skill1), new Variable(skill5)];

            const skillExpression = new N_of([firstAndSkills, SecondAndSkills], 1);

            expect(
                skillExpression.evaluate(
                    ["skill:1", "skill:2", "skill:3"],
                    globalKnowledge,
                    without
                )
            ).toBeTruthy();
        });

        it("recursive call with parent checking without", () => {
            const firstVariableSkill = new Variable(skill9);
            const SecondVariableSkill = new Variable(skill10);

            const without = [new Variable(skill7), new Variable(skill3)];

            const skillExpression = new Or([firstVariableSkill, SecondVariableSkill]);

            expect(skillExpression.evaluate(["skill:8"], globalKnowledge, without)).toBeTruthy();
        });

        it("parent skills checking without", () => {
            const without = [new Variable(skill1), new Variable(skill2), new Variable(skill3)];
            const variableSkills = new Variable(skill10);
            const andSkills = new And([new Variable(skill10), new Variable(skill1)]);

            expect(
                variableSkills.evaluate(["skill:4", "skill:5", "skill:6"], globalKnowledge, without)
            ).toBeTruthy();
            expect(andSkills.evaluate(["skill:4"], globalKnowledge, without)).toBeFalsy();
            expect(
                andSkills.evaluate(["skill:4", "skill:5", "skill:6"], globalKnowledge, without)
            ).toBeFalsy();
            expect(
                andSkills.evaluate(
                    ["skill:1", "skill:4", "skill:5", "skill:6"],
                    globalKnowledge,
                    without
                )
            ).toBeTruthy();
        });

        it("parent skill checking without parent skill", () => {
            const without = [new Variable(skill10)];
            const variableSkills = new Variable(skill10);

            expect(variableSkills.evaluate(["skill:4"], globalKnowledge, without)).toBeFalsy();
            expect(
                variableSkills.evaluate(["skill:4", "skill:5", "skill:6"], globalKnowledge, without)
            ).toBeFalsy();
            expect(
                variableSkills.evaluate(
                    ["skill:1", "skill:2", "skill:3", "skill:4", "skill:5", "skill:6"],
                    globalKnowledge,
                    without
                )
            ).toBeTruthy();
        });
    });

    describe("learning units filtration", () => {
        it("learning units filtering based on precondition formula", () => {
            const skillExpression1 = new And([
                new Variable(skill1),
                new Variable(skill2),
                new Variable(skill3)
            ]);
            const skillExpression2 = new Or([new Variable(skill4), new Variable(skill5)]);
            const skillExpression3 = new Or([
                new Variable(skill5),
                new Variable(skill6),
                new And([new Variable(skill7), new Variable(skill8)])
            ]);

            const unit1 = newLearningUnit(globalKnowledge, "unit1", skillExpression1, [], []);

            const unit2 = newLearningUnit(globalKnowledge, "unit2", skillExpression2, [], []);

            const unit3 = newLearningUnit(globalKnowledge, "unit3", skillExpression3, [], []);

            const learningUnits = [unit1, unit2, unit3];

            const evaluateString1 = [skill1.id, skill2.id, skill3.id];
            const evaluateString2 = [skill4.id];
            const evaluateString3 = [skill5.id];
            const evaluateString4 = [skill7.id, skill8.id];

            const firstCheck = learningUnits.filter(unit =>
                unit.requires.evaluate(evaluateString1, globalKnowledge)
            );
            const secondCheck = learningUnits.filter(unit =>
                unit.requires.evaluate(evaluateString2, globalKnowledge)
            );
            const thirdCheck = learningUnits.filter(unit =>
                unit.requires.evaluate(evaluateString3, globalKnowledge)
            );
            const fourCheck = learningUnits.filter(unit =>
                unit.requires.evaluate(evaluateString4, globalKnowledge)
            );

            expect(firstCheck.length).toBe(1);
            expect(firstCheck.at(0)?.id).toBe(unit1.id);

            expect(secondCheck.length).toBe(1);
            expect(secondCheck.at(0)?.id).toBe(unit2.id);

            expect(thirdCheck.length).toBe(2);
            expect(thirdCheck.at(0)?.id).toBe(unit2.id);
            expect(thirdCheck.at(1)?.id).toBe(unit3.id);

            expect(fourCheck.length).toBe(1);
            expect(fourCheck.at(0)?.id).toBe(unit3.id);
        });
    });
});

function newLearningUnit(
    globalKnowledge: GlobalKnowledge,
    id: string,
    requires: SkillExpression,
    provides: string[],
    suggestedSkills: { weight: number; skill: string }[] = []
): preCondLearningUnit {
    const suggestions: { weight: number; skill: Skill }[] = [];
    if (suggestedSkills.length > 0) {
        for (const suggestion of suggestedSkills) {
            const skill = globalKnowledge.skills.find(skill => suggestion.skill.includes(skill.id));
            if (skill) {
                suggestions.push({ weight: suggestion.weight, skill: skill });
            }
        }
    }

    return {
        id: id,
        requires: requires,
        provides: globalKnowledge.skills.filter(skill => provides.includes(skill.id)),
        suggestedSkills: suggestions
    };
}

export type preCondLearningUnit = {
    id: string;
    mediaTime?: number;
    words?: number;
    requires: SkillExpression;
    provides: Skill[];
    suggestedSkills: { weight: number; skill: Skill }[];
};
