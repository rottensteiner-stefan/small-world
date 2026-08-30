import { describe, it, expect } from "vitest";
import { UndoStack, UndoCommand } from "../../../src/tools/maker/UndoStack.js";

describe("UndoStack (ADR 0010 Maker Command History)", () => {
  it("should execute command immediately and push to undo history", () => {
    const stack = new UndoStack();
    let value = 0;

    const cmd: UndoCommand = {
      label: "Increment",
      redo: () => {
        value += 10;
      },
      undo: () => {
        value -= 10;
      },
    };

    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);

    stack.execute(cmd);

    expect(value).toBe(10);
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });

  it("should support sequential undo and redo operations", () => {
    const stack = new UndoStack();
    let state = "init";

    stack.execute({
      label: "Step 1",
      redo: () => {
        state = "state 1";
      },
      undo: () => {
        state = "init";
      },
    });

    stack.execute({
      label: "Step 2",
      redo: () => {
        state = "state 2";
      },
      undo: () => {
        state = "state 1";
      },
    });

    expect(state).toBe("state 2");

    stack.undo();
    expect(state).toBe("state 1");
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(true);

    stack.undo();
    expect(state).toBe("init");
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);

    // Redo step 1
    stack.redo();
    expect(state).toBe("state 1");

    // Redo step 2
    stack.redo();
    expect(state).toBe("state 2");
    expect(stack.canRedo).toBe(false);
  });

  it("should discard redo branch when executing new action after undo", () => {
    const stack = new UndoStack();
    let counter = 0;

    stack.execute({
      label: "+1",
      redo: () => {
        counter += 1;
      },
      undo: () => {
        counter -= 1;
      },
    });

    stack.execute({
      label: "+10",
      redo: () => {
        counter += 10;
      },
      undo: () => {
        counter -= 10;
      },
    });

    expect(counter).toBe(11);

    stack.undo(); // back to 1
    expect(counter).toBe(1);
    expect(stack.canRedo).toBe(true);

    // Execute branch action
    stack.execute({
      label: "+100",
      redo: () => {
        counter += 100;
      },
      undo: () => {
        counter -= 100;
      },
    });

    expect(counter).toBe(101);
    expect(stack.canRedo).toBe(false); // old "+10" redo is cleared!
  });

  it("should clear all history without triggering undo/redo", () => {
    const stack = new UndoStack();
    let sideEffect = 0;

    stack.execute({
      label: "Action",
      redo: () => {
        sideEffect++;
      },
      undo: () => {
        sideEffect--;
      },
    });

    expect(sideEffect).toBe(1);
    expect(stack.canUndo).toBe(true);

    stack.clear();

    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(sideEffect).toBe(1); // state untouched
  });
});
