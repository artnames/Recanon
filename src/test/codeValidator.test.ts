import { describe, it, expect } from "vitest";
import { stripComments, validateNoCreateCanvas } from "@/certified/codeValidator";

describe("stripComments", () => {
  it("removes single-line comments", () => {
    const code = `let x = 1; // createCanvas(123)
let y = 2;`;
    const result = stripComments(code);
    expect(result).not.toContain("createCanvas");
    expect(result).toContain("let x = 1;");
    expect(result).toContain("let y = 2;");
  });

  it("removes block comments", () => {
    const code = `let x = 1;
/* createCanvas(500, 500) */
let y = 2;`;
    const result = stripComments(code);
    expect(result).not.toContain("createCanvas");
  });

  it("removes multi-line block comments", () => {
    const code = `let x = 1;
/*
  createCanvas(500, 500);
  more stuff
*/
let y = 2;`;
    const result = stripComments(code);
    expect(result).not.toContain("createCanvas");
  });
});

describe("validateNoCreateCanvas", () => {
  it("passes when createCanvas is only in single-line comment", () => {
    const code = `function setup() {
  // createCanvas(500, 500); - not allowed
  background(255);
}`;
    const result = validateNoCreateCanvas(code);
    expect(result.valid).toBe(true);
  });

  it("passes when createCanvas is only in block comment", () => {
    const code = `function setup() {
  /* createCanvas(500, 500); */
  background(255);
}`;
    const result = validateNoCreateCanvas(code);
    expect(result.valid).toBe(true);
  });

  it("fails when createCanvas is real code", () => {
    const code = `function setup() {
  createCanvas(500, 500);
  background(255);
}`;
    const result = validateNoCreateCanvas(code);
    expect(result.valid).toBe(false);
    expect(result.lineNumber).toBe(2);
    expect(result.lineContent).toBe("createCanvas(500, 500);");
  });

  it("fails when createCanvas is real code even with comments nearby", () => {
    const code = `function setup() {
  // Some comment
  createCanvas(500, 500); // inline comment
  background(255);
}`;
    const result = validateNoCreateCanvas(code);
    expect(result.valid).toBe(false);
    expect(result.lineNumber).toBe(3);
  });

  it("passes for clean code with no createCanvas", () => {
    const code = `function setup() {
  background(255);
  noLoop();
}

function draw() {
  fill(0);
  rect(10, 10, width - 20, height - 20);
}`;
    const result = validateNoCreateCanvas(code);
    expect(result.valid).toBe(true);
  });
});
