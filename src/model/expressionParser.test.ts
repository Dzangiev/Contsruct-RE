import { describe, test, expect } from 'vitest';
import { ExpressionParser, evaluateAST, EvaluationContext } from './expressionParser';

describe('ExpressionParser', () => {
  const context: EvaluationContext = {
    variables: { score: 100, name: "Player" },
    objects: {
      Sprite: { x: 50, y: 60, instanceVariables: { Health: 80 } }
    },
    system: { dt: 0.016, time: 10 }
  };

  test('should parse numbers', () => {
    const parser = new ExpressionParser("123.45");
    expect(evaluateAST(parser.parse(), context)).toBe(123.45);
  });

  test('should parse basic math with precedence', () => {
    const parser = new ExpressionParser("10 + 5 * 2");
    expect(evaluateAST(parser.parse(), context)).toBe(20);
  });

  test('should handle parentheses', () => {
    const parser = new ExpressionParser("(10 + 5) * 2");
    expect(evaluateAST(parser.parse(), context)).toBe(30);
  });

  test('should handle variables', () => {
    const parser = new ExpressionParser("score + 10");
    expect(evaluateAST(parser.parse(), context)).toBe(110);
  });

  test('should handle member access', () => {
    const parser = new ExpressionParser("Sprite.X + 10");
    expect(evaluateAST(parser.parse(), context)).toBe(60);
  });

  test('should handle case-insensitive instance variables', () => {
    const parser = new ExpressionParser("Sprite.health");
    expect(evaluateAST(parser.parse(), context)).toBe(80);
  });

  test('should handle functions', () => {
    const parser = new ExpressionParser("sin(90)");
    expect(evaluateAST(parser.parse(), context)).toBeCloseTo(1);
  });

  test('should handle nested functions', () => {
    const parser = new ExpressionParser("abs(-5) + floor(2.9)");
    expect(evaluateAST(parser.parse(), context)).toBe(7);
  });

  test('should handle logical operators', () => {
    const parser = new ExpressionParser("score > 50 && name == 'Player'");
    expect(evaluateAST(parser.parse(), context)).toBe(true);
  });

  test('should handle complex member access in parentheses', () => {
    const parser = new ExpressionParser("(Sprite.X + 20) * 10");
    expect(evaluateAST(parser.parse(), context)).toBe(700);
  });
});
