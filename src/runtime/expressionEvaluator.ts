/**
 * A robust expression evaluator for the game engine.
 * Supports basic math, object properties, global variables, and built-in functions.
 */

export interface EvaluationContext {
  variables: Record<string, any>;
  objects: Record<string, any & { instanceVariables: Record<string, any> }>; // objectName -> instance data
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

  // 1. Literal checks
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (!isNaN(Number(trimmed))) return Number(trimmed);
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);

  // 2. Simple Built-in functions (regex based for simplicity in this version)
  // random(min, max)
  const randomMatch = trimmed.match(/^random\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*\)$/);
  if (randomMatch) {
    const min = evaluateExpression(randomMatch[1], context);
    const max = evaluateExpression(randomMatch[2], context);
    return Math.random() * (Number(max) - Number(min)) + Number(min);
  }

  // sin(degrees), cos(degrees)
  const mathMatch = trimmed.match(/^(sin|cos|tan|abs|floor|ceil|round)\s*\(\s*(.+)\s*\)$/);
  if (mathMatch) {
    const func = mathMatch[1];
    const val = evaluateExpression(mathMatch[2], context);
    const n = Number(val);
    switch (func) {
      case 'sin': return Math.sin(n * (Math.PI / 180));
      case 'cos': return Math.cos(n * (Math.PI / 180));
      case 'tan': return Math.tan(n * (Math.PI / 180));
      case 'abs': return Math.abs(n);
      case 'floor': return Math.floor(n);
      case 'ceil': return Math.ceil(n);
      case 'round': return Math.round(n);
    }
  }

  // 3. Basic Binary Operations (Moved up to handle expressions like Object.Prop - 1)
  const opMatch = trimmed.match(/^(.+?)\s*([\+\-\*\/])\s*(.+)$/);
  if (opMatch) {
    const [_, left, op, right] = opMatch;
    const v1 = evaluateExpression(left, context);
    const v2 = evaluateExpression(right, context);
    const n1 = Number(v1);
    const n2 = Number(v2);
    
    if (!isNaN(n1) && !isNaN(n2)) {
      switch (op) {
        case '+': return n1 + n2;
        case '-': return n1 - n2;
        case '*': return n1 * n2;
        case '/': return n2 !== 0 ? n1 / n2 : 0;
      }
    }
  }

  // 4. Object properties (e.g., Sprite.X)
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    const objName = parts[0]!.trim();
    const prop = parts[1]!.trim().toLowerCase();
    
    if (context.objects[objName]) {
      const obj = context.objects[objName];
      switch (prop) {
        case 'x': return obj.x;
        case 'y': return obj.y;
        case 'width': return obj.width;
        case 'height': return obj.height;
        case 'angle': return obj.angle;
        case 'opacity': return obj.opacity;
        default: {
          const match = Object.keys(obj.instanceVariables || {}).find(k => k.toLowerCase() === prop);
          if (match) return obj.instanceVariables[match];
        }
      }
    }
  }

  // 5. Local Variables
  if (context.localVariables && trimmed in context.localVariables) {
    return context.localVariables[trimmed];
  }

  // 6. Global Variables
  if (trimmed in context.variables) {
    return context.variables[trimmed];
  }

  // 6. Function Parameters (e.g., Function.Param(0))
  const funcParamMatch = trimmed.match(/^Function\.Param\s*\(\s*(\d+)\s*\)$/i);
  if (funcParamMatch) {
    const index = parseInt(funcParamMatch[1]!);
    return context.functionParams ? context.functionParams[index] : 0;
  }

  if (trimmed.toLowerCase() === 'function.returnvalue') {
    return context.returnValue !== undefined ? context.returnValue : 0;
  }

  // 7. System keywords
  switch (trimmed.toLowerCase()) {
    case 'dt': return context.system.dt;
    case 'time': return context.system.time;
    case 'pointerx': return context.system.pointerX;
    case 'pointery': return context.system.pointerY;
  }

  return trimmed;
}
