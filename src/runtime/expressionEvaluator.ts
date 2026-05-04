/**
 * A robust expression evaluator for the game engine.
 * Wraps the model's ExpressionParser to provide a consistent evaluation context.
 */

import { parseAndEvaluate, EvaluationContext as ParserContext } from '../model/expressionParser';

export interface EvaluationContext {
  variables: Record<string, any>;
  objects: Record<string, any>; // objectName -> instance data
  system: {
    dt: number;
    time: number;
    pointerX: number;
    pointerY: number;
  };
  functionParams?: any[];
  returnValue?: any;
  localVariables?: Record<string, any>;
}

export function evaluateExpression(expr: any, context: EvaluationContext): any {
  if (typeof expr !== 'string') return expr;
  
  const trimmed = expr.trim();
  if (!trimmed) return 0;

  // Convert EvaluationContext to the format expected by the parser
  const parserContext: ParserContext = {
    variables: context.variables,
    objects: context.objects,
    system: {
      dt: context.system.dt,
      time: context.system.time,
      pointerx: context.system.pointerX,
      pointery: context.system.pointerY,
      functionparams: context.functionParams,
      returnvalue: context.returnValue
    },
    locals: context.localVariables,
    // Add math functions or others if needed (though they are built-in to the evaluator)
  };

  return parseAndEvaluate(trimmed, parserContext);
}
