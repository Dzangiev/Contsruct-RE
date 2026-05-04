/**
 * A robust expression parser and evaluator for the game engine.
 * Supports operator precedence, parentheses, object properties, and functions.
 */

export type ASTNode = 
  | { type: 'Number', value: number }
  | { type: 'String', value: string }
  | { type: 'Identifier', name: string }
  | { type: 'MemberAccess', object: ASTNode, property: string }
  | { type: 'BinaryOp', operator: string, left: ASTNode, right: ASTNode }
  | { type: 'UnaryOp', operator: string, argument: ASTNode }
  | { type: 'Call', name: string, args: ASTNode[] };

export interface EvaluationContext {
  variables: Record<string, any>;
  objects: Record<string, any>; // name -> instance or properties
  system: Record<string, any>;
  locals?: Record<string, any>;
  functions?: Record<string, (...args: any[]) => any>;
}

export class ExpressionParser {
  private tokens: string[] = [];
  private current = 0;

  constructor(private input: string) {
    this.tokenize();
  }

  private tokenize() {
    // Basic tokenizer that handles numbers, strings, identifiers and operators
    const regex = /\s*([a-zA-Z_][a-zA-Z0-9_]*|(?:\d+\.?\d*)|"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\+|\-|\*|\/|\(|\)|,|\.|==|!=|<=|>=|<|>|&&|\|\||!)\s*/g;
    let match;
    this.tokens = [];
    while ((match = regex.exec(this.input)) !== null) {
      this.tokens.push(match[1]!);
    }
  }

  public parse(): ASTNode {
    this.current = 0;
    if (this.tokens.length === 0) return { type: 'Number', value: 0 };
    return this.parseExpression();
  }

  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ASTNode {
    let node = this.parseLogicalAnd();
    while (this.match('||')) {
      const right = this.parseLogicalAnd();
      node = { type: 'BinaryOp', operator: '||', left: node, right };
    }
    return node;
  }

  private parseLogicalAnd(): ASTNode {
    let node = this.parseEquality();
    while (this.match('&&')) {
      const right = this.parseEquality();
      node = { type: 'BinaryOp', operator: '&&', left: node, right };
    }
    return node;
  }

  private parseEquality(): ASTNode {
    let node = this.parseComparison();
    while (this.match('==', '!=')) {
      const operator = this.previous();
      const right = this.parseComparison();
      node = { type: 'BinaryOp', operator, left: node, right };
    }
    return node;
  }

  private parseComparison(): ASTNode {
    let node = this.parseTerm();
    while (this.match('<', '<=', '>', '>=')) {
      const operator = this.previous();
      const right = this.parseTerm();
      node = { type: 'BinaryOp', operator, left: node, right };
    }
    return node;
  }

  private parseTerm(): ASTNode {
    let node = this.parseFactor();
    while (this.match('+', '-')) {
      const operator = this.previous();
      const right = this.parseFactor();
      node = { type: 'BinaryOp', operator, left: node, right };
    }
    return node;
  }

  private parseFactor(): ASTNode {
    let node = this.parseUnary();
    while (this.match('*', '/')) {
      const operator = this.previous();
      const right = this.parseUnary();
      node = { type: 'BinaryOp', operator, left: node, right };
    }
    return node;
  }

  private parseUnary(): ASTNode {
    if (this.match('!', '-')) {
      const operator = this.previous();
      const argument = this.parseUnary();
      return { type: 'UnaryOp', operator, argument };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    if (this.match('(')) {
      const node = this.parseExpression();
      this.consume(')', "Expect ')' after expression.");
      return node;
    }

    const token = this.peek();

    if (token.startsWith('"') || token.startsWith("'")) {
      this.advance();
      return { type: 'String', value: token.slice(1, -1) };
    }

    if (!isNaN(Number(token))) {
      this.advance();
      return { type: 'Number', value: Number(token) };
    }

    if (this.isAlpha(token[0])) {
      this.advance();
      let node: ASTNode = { type: 'Identifier', name: token };

      // Handle function calls
      if (this.match('(')) {
        const args: ASTNode[] = [];
        if (!this.check(')')) {
          do {
            args.push(this.parseExpression());
          } while (this.match(','));
        }
        this.consume(')', "Expect ')' after function arguments.");
        node = { type: 'Call', name: token, args };
      }

      // Handle member access (Object.Property)
      while (this.match('.')) {
        const property = this.consumeIdentifier("Expect property name after '.'.");
        
        // Could be a function call on an object: Object.Func()
        if (this.match('(')) {
           const args: ASTNode[] = [];
           if (!this.check(')')) {
             do {
               args.push(this.parseExpression());
             } while (this.match(','));
           }
           this.consume(')', "Expect ')' after function arguments.");
           node = { type: 'Call', name: `${(node as any).name || (node as any).type}.${property}`, args };
        } else {
          node = { type: 'MemberAccess', object: node, property };
        }
      }

      return node;
    }

    throw new Error(`Unexpected token: ${token}`);
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek() === type;
  }

  private advance(): string {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private peek(): string {
    return this.tokens[this.current] || '';
  }

  private previous(): string {
    return this.tokens[this.current - 1] || '';
  }

  private consume(type: string, message: string): string {
    if (this.check(type)) return this.advance();
    throw new Error(message);
  }

  private consumeIdentifier(message: string): string {
    const token = this.peek();
    if (this.isAlpha(token[0])) return this.advance();
    throw new Error(message);
  }

  private isAlpha(char?: string): boolean {
    if (!char) return false;
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }
}

export function evaluateAST(node: ASTNode, context: EvaluationContext): any {
  switch (node.type) {
    case 'Number': return node.value;
    case 'String': return node.value;
    case 'Identifier': {
      if (context.locals && node.name in context.locals) return context.locals[node.name];
      if (node.name in context.variables) return context.variables[node.name];
      if (node.name.toLowerCase() in context.system) return context.system[node.name.toLowerCase()];
      if (context.objects[node.name]) return context.objects[node.name];
      return 0;
    }
    case 'MemberAccess': {
      const obj = evaluateAST(node.object, context);
      if (!obj) return 0;
      const prop = node.property.toLowerCase();
      
      // Standard properties
      if (prop === 'x') return obj.x ?? 0;
      if (prop === 'y') return obj.y ?? 0;
      if (prop === 'width') return obj.width ?? 0;
      if (prop === 'height') return obj.height ?? 0;
      if (prop === 'angle') return obj.angle ?? 0;
      if (prop === 'opacity') return obj.opacity ?? 0;
      
      // Instance variables
      if (obj.instanceVariables) {
        // Case-insensitive match for instance variables
        const match = Object.keys(obj.instanceVariables).find(k => k.toLowerCase() === prop);
        if (match) return obj.instanceVariables[match];
      }
      
      return 0;
    }
    case 'BinaryOp': {
      const left = evaluateAST(node.left, context);
      const right = evaluateAST(node.right, context);
      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return right !== 0 ? left / right : 0;
        case '==': return left === right;
        case '!=': return left !== right;
        case '<': return left < right;
        case '<=': return left <= right;
        case '>': return left > right;
        case '>=': return left >= right;
        case '&&': return left && right;
        case '||': return left || right;
        default: return 0;
      }
    }
    case 'UnaryOp': {
      const arg = evaluateAST(node.argument, context);
      switch (node.operator) {
        case '-': return -arg;
        case '!': return !arg;
        default: return arg;
      }
    }
    case 'Call': {
      // Special case for math functions
      const mathFuncs: Record<string, (n: number) => number> = {
        sin: (n) => Math.sin(n * Math.PI / 180),
        cos: (n) => Math.cos(n * Math.PI / 180),
        tan: (n) => Math.tan(n * Math.PI / 180),
        abs: Math.abs,
        floor: Math.floor,
        ceil: Math.ceil,
        round: Math.round,
        sqrt: Math.sqrt
      };

      if (node.name in mathFuncs) {
        const val = evaluateAST(node.args[0]!, context);
        return mathFuncs[node.name]!(Number(val));
      }

      if (node.name === 'random') {
        const min = evaluateAST(node.args[0]!, context);
        const max = node.args.length > 1 ? evaluateAST(node.args[1]!, context) : 0;
        if (node.args.length === 1) return Math.random() * Number(min);
        return Math.random() * (Number(max) - Number(min)) + Number(min);
      }

      if (node.name === 'clamp') {
        const val = evaluateAST(node.args[0]!, context);
        const min = evaluateAST(node.args[1]!, context);
        const max = evaluateAST(node.args[2]!, context);
        return Math.max(Number(min), Math.min(Number(max), Number(val)));
      }
      
      // Function.Param(n)
      if (node.name.toLowerCase() === 'function.param') {
        const index = evaluateAST(node.args[0]!, context);
        return context.system.functionParams?.[index] ?? 0;
      }

      // Custom functions
      if (context.functions && node.name in context.functions) {
        const args = node.args.map(a => evaluateAST(a, context));
        return context.functions[node.name]!(...args);
      }

      return 0;
    }
  }
}

export function inferType(node: ASTNode, context: EvaluationContext): 'number' | 'string' | 'boolean' | 'any' {
  switch (node.type) {
    case 'Number': return 'number';
    case 'String': return 'string';
    case 'Identifier': {
      // Logic for variables and system keywords
      if (context.locals && node.name in context.locals) {
        const v = context.locals[node.name];
        return typeof v === 'number' ? 'number' : typeof v === 'string' ? 'string' : 'any';
      }
      if (node.name in context.variables) {
        const v = context.variables[node.name];
        return typeof v === 'number' ? 'number' : typeof v === 'string' ? 'string' : 'any';
      }
      const sysName = node.name.toLowerCase();
      if (['dt', 'time', 'fps', 'pointerx', 'pointery'].includes(sysName)) return 'number';
      return 'any';
    }
    case 'MemberAccess': {
      const prop = node.property.toLowerCase();
      if (['x', 'y', 'width', 'height', 'angle', 'opacity'].includes(prop)) return 'number';
      // In a real system, we'd look up the instance variable definition here
      return 'any';
    }
    case 'BinaryOp': {
      if (['+', '-', '*', '/'].includes(node.operator)) return 'number';
      if (['==', '!=', '<', '<=', '>', '>=', '&&', '||'].includes(node.operator)) return 'boolean';
      return 'any';
    }
    case 'UnaryOp': {
      if (node.operator === '-') return 'number';
      if (node.operator === '!') return 'boolean';
      return 'any';
    }
    case 'Call': {
      const name = node.name.toLowerCase();
      if (['sin', 'cos', 'tan', 'abs', 'floor', 'ceil', 'round', 'sqrt', 'random', 'clamp', 'min', 'max'].includes(name)) return 'number';
      if (name === 'function.param') return 'any'; // Depends on what's passed
      if (name === 'layoutname') return 'string';
      return 'any';
    }
    default: return 'any';
  }
}

export function validateExpression(input: string, expectedType: string, context: EvaluationContext): { syntaxError?: string, typeWarnings: string[] } {
  if (!input.trim()) return { typeWarnings: [] };
  try {
    const parser = new ExpressionParser(input);
    const ast = parser.parse();
    const actualType = inferType(ast, context);
    const typeWarnings: string[] = [];

    const normExpected = expectedType.toLowerCase();
    if (normExpected !== 'any' && actualType !== 'any' && normExpected !== actualType) {
       // String params in Construct are very flexible, so maybe don't warn if expected is string
       if (normExpected !== 'string') {
         typeWarnings.push(`Type mismatch: expected ${normExpected}, got ${actualType}`);
       }
    }

    const checkRecursive = (node: ASTNode) => {
      if (node.type === 'BinaryOp') {
        const leftType = inferType(node.left, context);
        const rightType = inferType(node.right, context);
        if (['-', '*', '/'].includes(node.operator)) {
          if (leftType === 'string' || rightType === 'string') typeWarnings.push(`Arithmetic operation on string`);
          if (leftType === 'boolean' || rightType === 'boolean') typeWarnings.push(`Arithmetic operation on boolean`);
        }
        checkRecursive(node.left);
        checkRecursive(node.right);
      } else if (node.type === 'UnaryOp') {
        const argType = inferType(node.argument, context);
        if (node.operator === '-' && argType !== 'number' && argType !== 'any') typeWarnings.push(`Unary minus on ${argType}`);
        checkRecursive(node.argument);
      } else if (node.type === 'Call') {
        node.args.forEach(arg => checkRecursive(arg));
      }
    };
    checkRecursive(ast);

    return { typeWarnings };
  } catch (e: any) {
    return { syntaxError: e.message, typeWarnings: [] };
  }
}

export function parseAndEvaluate(input: string, context: EvaluationContext): any {
  try {
    const parser = new ExpressionParser(input);
    const ast = parser.parse();
    return evaluateAST(ast, context);
  } catch (e) {
    console.error('Expression evaluation error:', e);
    return 0;
  }
}
