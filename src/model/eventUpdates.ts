import { Project, EventSheet, EventBlock, Condition, Action, GlobalVariable } from './project';
import { generateId } from '../utils/id';
import { sanitizeName, getUniqueName } from '../utils/naming';
import { getAllUsedNames } from './projectUpdates';

/**
 * Recursive helper to update a block within a list of blocks.
 */
function updateInTree(blocks: EventBlock[], id: string, updater: (block: EventBlock) => EventBlock): EventBlock[] {
  return blocks.map(block => {
    if (block.id === id) return updater(block);
    if (block.children.length > 0) {
      return { ...block, children: updateInTree(block.children, id, updater) };
    }
    return block;
  });
}

/**
 * Recursive helper to remove a block from the tree.
 */
function removeFromTree(blocks: EventBlock[], id: string): EventBlock[] {
  return blocks
    .filter(block => block.id !== id)
    .map(block => ({
      ...block,
      children: removeFromTree(block.children, id)
    }));
}

/**
 * Helper to get all variable names in the project.
 */
export function getAllVariableNames(project: Project): string[] {
  const names = project.globalVariables.map(v => v.name);
  project.eventSheets.forEach(es => {
    const find = (blocks: EventBlock[]) => {
      blocks.forEach(b => {
        if (b.type === 'variable' && b.variable) {
          // If it's already in names (because it's root-level), don't add again
          if (!names.includes(b.variable.name)) {
            names.push(b.variable.name);
          }
        }
        find(b.children);
      });
    };
    find(es.events);
  });
  return names;
}

/**
 * Helper to generate a unique variable name.
 */
export function getUniqueVariableName(project: Project, baseName: string): string {
  const allNames = getAllUsedNames(project);
  return getUniqueName(baseName, allNames);
}

/**
 * Adds a new event block to an event sheet.
 */
export function addEventBlock(
  project: Project,
  eventSheetId: string,
  parentBlockId: string | null,
  type: 'event' | 'group' | 'comment' | 'variable' | 'function' | 'include',
  id?: string
): Project {
  const blockId = id || generateId();
  const newBlock: EventBlock = {
    id: blockId,
    type,
    disabled: false,
    conditions: [],
    actions: [],
    children: [],
  };

  let updatedProject = project;

  if (type === 'variable') {
    const varId = generateId();
    newBlock.variable = {
      id: varId,
      name: getUniqueVariableName(project, 'Variable'),
      type: 'number',
      initialValue: 0,
      comment: ''
    };
    // Only add to globalVariables if it's a root-level block
    if (parentBlockId === null) {
      updatedProject = {
        ...project,
        globalVariables: [...project.globalVariables, newBlock.variable]
      };
    }
  } else if (type === 'function') {
    newBlock.functionName = 'Function' + (generateId().substring(0, 4));
    newBlock.functionDescription = '';
    newBlock.functionParams = [];
    newBlock.functionReturnType = 'none';
  } else if (type === 'include') {
    // Default to the first event sheet that isn't the current one
    const otherSheet = project.eventSheets.find(es => es.id !== eventSheetId);
    newBlock.includeSheetId = otherSheet?.id || '';
  }

  return {
    ...updatedProject,
    eventSheets: updatedProject.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      if (!parentBlockId) {
        return { ...es, events: [...es.events, newBlock] };
      }
      return {
        ...es,
        events: updateInTree(es.events, parentBlockId, p => {
          // If it's a variable, prepend it to children (like Construct 3)
          if (type === 'variable') {
            return { ...p, children: [newBlock, ...p.children] };
          }
          return { ...p, children: [...p.children, newBlock] };
        })
      };
    })
  };
}

/**
 * Updates an event block's properties.
 */
export function updateEventBlock(
  project: Project,
  eventSheetId: string,
  blockId: string,
  updates: Partial<Omit<EventBlock, 'id' | 'conditions' | 'actions' | 'children'>>
): Project {
  let updatedProject = project;

  // If we are updating a variable name, we might need to sync with globalVariables
  if (updates.variable && updates.variable.name) {
    const newName = updates.variable.name;
    const existing = getAllVariableNames(project);

    // Find the original block to get its variable ID
    const es = project.eventSheets.find(s => s.id === eventSheetId);
    const findB = (list: EventBlock[]): EventBlock | undefined => {
      for (const b of list) {
        if (b.id === blockId) return b;
        const f = findB(b.children);
        if (f) return f;
      }
    };
    const originalBlock = es ? findB(es.events) : undefined;

    if (originalBlock?.variable) {
      const varId = originalBlock.variable.id;
      const oldName = originalBlock.variable.name;

      // Enforce uniqueness if name changed
      if (newName !== oldName && existing.includes(newName)) {
        // Name already taken, revert to old name or modify to be unique
        updates.variable.name = getUniqueVariableName(project, newName);
      }

      // Sync with globalVariables if it's a root block
      updatedProject = {
        ...project,
        globalVariables: project.globalVariables.map(v => {
          // If this is the renamed variable itself, update its name/props
          if (v.id === varId) return { ...v, ...updates.variable };
          // If this is another variable, update its initialValue expression if it uses the renamed variable
          return {
            ...v,
            initialValue: replaceVariableNameInExpression(v.initialValue, oldName, newName)
          };
        })
      };

      // CRITICAL: Update all references to this variable in ALL sheets if the name changed
      if (newName !== oldName) {
        updatedProject.eventSheets = updatedProject.eventSheets.map(sheet => ({
          ...sheet,
          events: updateVariableReferencesInTree(sheet.events, oldName, newName)
        }));
      }
    }
  }

  return {
    ...updatedProject,
    eventSheets: updatedProject.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({ ...b, ...updates }))
      };
    })
  };
}

/**
 * Removes an event block from an event sheet.
 */
export function removeEventBlock(
  project: Project,
  eventSheetId: string,
  blockId: string
): Project {
  // Find the block to see if it has a variable
  const findBlock = (blocks: EventBlock[]): EventBlock | undefined => {
    for (const b of blocks) {
      if (b.id === blockId) return b;
      const found = findBlock(b.children);
      if (found) return found;
    }
    return undefined;
  };

  const eventSheet = project.eventSheets.find(es => es.id === eventSheetId);
  const blockToRemove = eventSheet ? findBlock(eventSheet.events) : undefined;

  let updatedProject = project;
  if (blockToRemove?.type === 'variable' && blockToRemove.variable) {
    // Only remove from globalVariables if it was actually there (root-level)
    updatedProject = {
      ...project,
      globalVariables: project.globalVariables.filter(v => v.id !== blockToRemove.variable?.id)
    };
  }

  return {
    ...updatedProject,
    eventSheets: updatedProject.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: removeFromTree(es.events, blockId)
      };
    })
  };
}

/**
 * Removes a global variable and syncs with all sheets.
 */
export function removeGlobalVariable(
  project: Project,
  variableId: string
): Project {
  // 1. Remove from globalVariables
  let nextProject: Project = {
    ...project,
    globalVariables: project.globalVariables.filter(v => v.id !== variableId)
  };

  // 2. Remove all blocks referencing this variable ID from ALL sheets
  nextProject.eventSheets = nextProject.eventSheets.map(es => ({
    ...es,
    events: removeVariableBlocksById(es.events, variableId)
  }));

  return nextProject;
}

function removeVariableBlocksById(blocks: EventBlock[], variableId: string): EventBlock[] {
  return blocks
    .filter(b => !(b.type === 'variable' && b.variable?.id === variableId))
    .map(b => ({
      ...b,
      children: removeVariableBlocksById(b.children, variableId)
    }));
}

/**
 * Adds a condition to an event block.
 */
export function addCondition(
  project: Project,
  eventSheetId: string,
  blockId: string,
  type: string,
  params: any[] = [],
  targetObjectTypeId?: string
): Project {
  const newCondition: Condition = {
    id: generateId(),
    type,
    params,
    inverted: false,
    targetObjectTypeId
  };

  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          conditions: [...b.conditions, newCondition]
        }))
      };
    })
  };
}

/**
 * Updates a condition within an event block.
 */
export function updateCondition(
  project: Project,
  eventSheetId: string,
  blockId: string,
  conditionId: string,
  updates: Partial<Omit<Condition, 'id'>>
): Project {
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          conditions: b.conditions.map(c => c.id === conditionId ? { ...c, ...updates } : c)
        }))
      };
    })
  };
}

/**
 * Removes a condition from an event block.
 */
export function removeCondition(
  project: Project,
  eventSheetId: string,
  blockId: string,
  conditionId: string
): Project {
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          conditions: b.conditions.filter(c => c.id !== conditionId)
        }))
      };
    })
  };
}

/**
 * Adds an action to an event block.
 */
export function addAction(
  project: Project,
  eventSheetId: string,
  blockId: string,
  type: string,
  params: any[] = [],
  targetObjectTypeId?: string
): Project {
  const newAction: Action = {
    id: generateId(),
    type,
    params,
    targetObjectTypeId
  };

  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          actions: [...b.actions, newAction]
        }))
      };
    })
  };
}

/**
 * Updates an action within an event block.
 */
export function updateAction(
  project: Project,
  eventSheetId: string,
  blockId: string,
  actionId: string,
  updates: Partial<Omit<Action, 'id'>>
): Project {
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          actions: b.actions.map(a => a.id === actionId ? { ...a, ...updates } : a)
        }))
      };
    })
  };
}

/**
 * Removes an action from an event block.
 */
export function removeAction(
  project: Project,
  eventSheetId: string,
  blockId: string,
  actionId: string
): Project {
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          actions: b.actions.filter(a => a.id !== actionId)
        }))
      };
    })
  };
}

/**
 * Adds a keyboard movement template (4 events) to an event sheet.
 */
export function addKeyboardMovementTemplate(
  project: Project,
  eventSheetId: string,
  objectTypeId: string,
  speed: number = 200
): Project {
  let nextProject = project;

  const directions = [
    { key: 'ArrowLeft', dx: `-(dt * ${speed})`, dy: 0 },
    { key: 'ArrowRight', dx: `dt * ${speed}`, dy: 0 },
    { key: 'ArrowUp', dx: 0, dy: `-(dt * ${speed})` },
    { key: 'ArrowDown', dx: 0, dy: `dt * ${speed}` }
  ];

  for (const dir of directions) {
    const blockId = generateId();
    const newBlock: EventBlock = {
      id: blockId,
      type: 'event',
      disabled: false,
      conditions: [{
        id: generateId(),
        type: 'keyDown',
        params: [dir.key],
        inverted: false
      }],
      actions: [{
        id: generateId(),
        type: 'moveBy',
        params: [dir.dx, dir.dy],
        targetObjectTypeId: objectTypeId
      }],
      children: []
    };

    nextProject = {
      ...nextProject,
      eventSheets: nextProject.eventSheets.map(es => {
        if (es.id !== eventSheetId) return es;
        return { ...es, events: [...es.events, newBlock] };
      })
    };
  }

  return nextProject;
}

/**
 * Recursive helper to find a block in the tree.
 */
function findInTree(blocks: EventBlock[], id: string): EventBlock | undefined {
  for (const block of blocks) {
    if (block.id === id) return block;
    const found = findInTree(block.children, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Moves an event block to a new position in the tree.
 */
export function moveEventBlock(
  project: Project,
  eventSheetId: string,
  blockId: string,
  targetParentId: string | null,
  targetIndex: number,
  afterBlockId?: string,
  beforeBlockId?: string
): Project {
  const eventSheet = project.eventSheets.find(es => es.id === eventSheetId);
  if (!eventSheet) return project;

  const blockToMove = findInTree(eventSheet.events, blockId);
  if (!blockToMove) return project;

  // 1. Remove from old position
  const sheetWithoutBlock = {
    ...eventSheet,
    events: removeFromTree(eventSheet.events, blockId)
  };

  // 2. Insert into new position
  const insert = (blocks: EventBlock[]): EventBlock[] => {
    let parentId = targetParentId;
    let index = targetIndex;

    // If afterBlockId or beforeBlockId is provided, find its parent and index
    if (afterBlockId || beforeBlockId) {
      const refId = afterBlockId || beforeBlockId;
      const findParentAndIndex = (list: EventBlock[], pId: string | null): { pId: string | null, idx: number } | null => {
        const foundIdx = list.findIndex(b => b.id === refId);
        if (foundIdx !== -1) return { pId, idx: afterBlockId ? foundIdx + 1 : foundIdx };
        for (const b of list) {
          const res = findParentAndIndex(b.children, b.id);
          if (res) return res;
        }
        return null;
      };
      const res = findParentAndIndex(sheetWithoutBlock.events, null);
      if (res) {
        parentId = res.pId;
        index = res.idx;
      }
    }

    if (parentId === null) {
      const next = [...blocks];
      const safeIndex = Math.min(index, next.length);
      next.splice(safeIndex, 0, blockToMove);
      return next;
    }

    return blocks.map(b => {
      if (b.id === parentId) {
        const nextChildren = [...b.children];
        const safeIndex = Math.min(index, nextChildren.length);
        nextChildren.splice(safeIndex, 0, blockToMove);
        return { ...b, children: nextChildren };
      }
      return { ...b, children: insert(b.children) };
    });
  };

  const updatedSheet = {
    ...sheetWithoutBlock,
    events: insert(sheetWithoutBlock.events)
  };

  // 3. Handle Variable scoping changes (Global <-> Local)
  let finalProject = {
    ...project,
    eventSheets: project.eventSheets.map(es => es.id === eventSheetId ? updatedSheet : es)
  };

  if (blockToMove.type === 'variable' && blockToMove.variable) {
    const wasRoot = eventSheet.events.some(b => b.id === blockId);
    const isRoot = targetParentId === null;

    if (wasRoot && !isRoot) {
      // Moved from Global to Local: remove from global pool
      finalProject.globalVariables = finalProject.globalVariables.filter(v => v.id !== blockToMove.variable?.id);
    } else if (!wasRoot && isRoot) {
      // Moved from Local to Global: add to global pool if not already there
      if (!finalProject.globalVariables.some(v => v.id === blockToMove.variable?.id)) {
        finalProject.globalVariables = [...finalProject.globalVariables, blockToMove.variable];
      }
    }
  }

  return finalProject;
}
/**
 * Clones an event block with new IDs recursively.
 */
export function cloneEventBlock(block: EventBlock): EventBlock {
  const newBlock: EventBlock = {
    ...block,
    id: generateId(),
    conditions: block.conditions.map(c => ({ ...c, id: generateId() })),
    actions: block.actions.map(a => ({ ...a, id: generateId() })),
    children: block.children.map(c => cloneEventBlock(c))
  };

  if (block.variable) {
    newBlock.variable = { ...block.variable, id: generateId() };
  }

  return newBlock;
}

/**
 * Pastes event blocks into a target sheet/parent.
 */
export function pasteEventBlocks(
  project: Project,
  eventSheetId: string,
  targetParentId: string | null,
  blocks: EventBlock[]
): Project {
  const cloned = blocks.map(b => cloneEventBlock(b));
  let updatedProject = project;

  // If any cloned blocks are at the root and have variables, add them to global variables
  if (targetParentId === null) {
    cloned.forEach(b => {
      if (b.type === 'variable' && b.variable) {
        updatedProject = {
          ...updatedProject,
          globalVariables: [...updatedProject.globalVariables, b.variable]
        };
      }
    });
  }

  return {
    ...updatedProject,
    eventSheets: updatedProject.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      if (!targetParentId) {
        return { ...es, events: [...es.events, ...cloned] };
      }
      return {
        ...es,
        events: updateInTree(es.events, targetParentId, p => ({
          ...p,
          children: [...p.children, ...cloned]
        }))
      };
    })
  };
}

/**
 * Moves a condition between event blocks or within a block.
 */
export function moveCondition(
  project: Project,
  eventSheetId: string,
  sourceBlockId: string,
  conditionId: string,
  targetBlockId: string,
  targetIndex: number
): Project {
  const eventSheet = project.eventSheets.find(es => es.id === eventSheetId);
  if (!eventSheet) return project;

  const sourceBlock = findInTree(eventSheet.events, sourceBlockId);
  const condition = sourceBlock?.conditions.find(c => c.id === conditionId);
  if (!condition) return project;

  // 1. Remove from source
  let nextProject = {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, sourceBlockId, b => ({
          ...b,
          conditions: b.conditions.filter(c => c.id !== conditionId)
        }))
      };
    })
  };

  // 2. Insert into target
  return {
    ...nextProject,
    eventSheets: nextProject.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, targetBlockId, b => {
          const next = [...b.conditions];
          const safeIndex = Math.min(targetIndex, next.length);
          next.splice(safeIndex, 0, condition);
          return { ...b, conditions: next };
        })
      };
    })
  };
}

/**
 * Moves an action between event blocks or within a block.
 */
export function moveAction(
  project: Project,
  eventSheetId: string,
  sourceBlockId: string,
  actionId: string,
  targetBlockId: string,
  targetIndex: number
): Project {
  const eventSheet = project.eventSheets.find(es => es.id === eventSheetId);
  if (!eventSheet) return project;

  const sourceBlock = findInTree(eventSheet.events, sourceBlockId);
  const action = sourceBlock?.actions.find(a => a.id === actionId);
  if (!action) return project;

  let nextProject = {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, sourceBlockId, b => ({
          ...b,
          actions: b.actions.filter(a => a.id !== actionId)
        }))
      };
    })
  };

  return {
    ...nextProject,
    eventSheets: nextProject.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, targetBlockId, b => {
          const next = [...b.actions];
          const safeIndex = Math.min(targetIndex, next.length);
          next.splice(safeIndex, 0, action);
          return { ...b, actions: next };
        })
      };
    })
  };
}

/**
 * Toggles the disabled state of a condition.
 */
export function toggleConditionDisabled(
  project: Project,
  eventSheetId: string,
  blockId: string,
  conditionId: string
): Project {
  const es = project.eventSheets.find(s => s.id === eventSheetId);
  const findCond = (blocks: EventBlock[]): any => {
    for (const b of blocks) {
      if (b.id === blockId) return b.conditions.find(c => c.id === conditionId);
      const f = findCond(b.children);
      if (f) return f;
    }
  };
  const cond = es ? findCond(es.events) : null;
  if (!cond) return project;
  return updateCondition(project, eventSheetId, blockId, conditionId, { disabled: !cond.disabled });
}

/**
 * Toggles the disabled state of an action.
 */
export function toggleActionDisabled(
  project: Project,
  eventSheetId: string,
  blockId: string,
  actionId: string
): Project {
  const es = project.eventSheets.find(s => s.id === eventSheetId);
  const findAct = (blocks: EventBlock[]): any => {
    for (const b of blocks) {
      if (b.id === blockId) return b.actions.find(a => a.id === actionId);
      const f = findAct(b.children);
      if (f) return f;
    }
  };
  const act = es ? findAct(es.events) : null;
  if (!act) return project;
  return updateAction(project, eventSheetId, blockId, actionId, { disabled: !act.disabled });
}
/**
 * Recursively updates all logic items that reference a variable by name.
 */
function updateVariableReferencesInTree(blocks: EventBlock[], oldName: string, newName: string): EventBlock[] {
  return blocks.map(block => {
    const updatedBlock = { ...block };

    // Update conditions
    updatedBlock.conditions = block.conditions.map(cond => {
      let newParams = [...cond.params];

      // 1. Handle explicit variable parameters
      if (['compareVariable', 'compareGlobalVariable'].includes(cond.type) && newParams[0] === oldName) {
        newParams[0] = newName;
      }

      // 2. Handle expressions in all parameters
      newParams = newParams.map(p => replaceVariableNameInExpression(p, oldName, newName));

      return { ...cond, params: newParams };
    });

    // Update actions
    updatedBlock.actions = block.actions.map(act => {
      let newParams = [...act.params];

      // 1. Handle explicit variable parameters
      if (['setVariable', 'addVariable', 'subtractVariable'].includes(act.type) && newParams[0] === oldName) {
        newParams[0] = newName;
      }

      // 2. Handle expressions in all parameters
      newParams = newParams.map(p => replaceVariableNameInExpression(p, oldName, newName));

      return { ...act, params: newParams };
    });

    // Recursive children
    if (block.children.length > 0) {
      updatedBlock.children = updateVariableReferencesInTree(block.children, oldName, newName);
    }

    // Update initial value if this is a variable block (for local variables referencing other variables)
    if (updatedBlock.type === 'variable' && updatedBlock.variable) {
      updatedBlock.variable = {
        ...updatedBlock.variable,
        initialValue: replaceVariableNameInExpression(updatedBlock.variable.initialValue, oldName, newName)
      };
    }

    return updatedBlock;
  });
}

/**
 * Recursively updates all logic items and variables that reference an object type or family by name.
 */
export function updateObjectTypeReferencesInTree(blocks: EventBlock[], oldName: string, newName: string): EventBlock[] {
  return blocks.map(block => {
    const updatedBlock = { ...block };

    // Update conditions
    updatedBlock.conditions = block.conditions.map(cond => {
      const newParams = cond.params.map(p => replaceVariableNameInExpression(p, oldName, newName));
      return { ...cond, params: newParams };
    });

    // Update actions
    updatedBlock.actions = block.actions.map(act => {
      const newParams = act.params.map(p => replaceVariableNameInExpression(p, oldName, newName));
      return { ...act, params: newParams };
    });

    // Update variable blocks (initial values)
    if (updatedBlock.type === 'variable' && updatedBlock.variable) {
      updatedBlock.variable = {
        ...updatedBlock.variable,
        initialValue: replaceVariableNameInExpression(updatedBlock.variable.initialValue, oldName, newName)
      };
    }

    // Recursive children
    if (block.children.length > 0) {
      updatedBlock.children = updateObjectTypeReferencesInTree(block.children, oldName, newName);
    }

    return updatedBlock;
  });
}

/**
 * Synchronizes object type or family renaming across the entire project.
 */
export function syncObjectTypeRenaming(project: Project, oldName: string, newName: string): Project {
  if (oldName === newName) return project;

  return {
    ...project,
    // Update variables initial values
    globalVariables: project.globalVariables.map(v => ({
      ...v,
      initialValue: replaceVariableNameInExpression(v.initialValue, oldName, newName)
    })),
    // Update all event sheets
    eventSheets: project.eventSheets.map(sheet => ({
      ...sheet,
      events: updateObjectTypeReferencesInTree(sheet.events, oldName, newName)
    }))
  };
}

/**
 * Synchronizes instance variable renaming across the entire project.
 * Handles the prefix format: ObjectName.VariableName
 */
export function syncInstanceVariableRenaming(
  project: Project,
  targetName: string, // Object Type or Family name
  oldVarName: string,
  newVarName: string
): Project {
  if (oldVarName === newVarName) return project;

  const replaceInstanceVarInExpression = (expression: any) => {
    if (typeof expression !== 'string') return expression;

    // Replace "ObjectName.OldVarName" with "ObjectName.NewVarName"
    const escapedTarget = targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedVar = oldVarName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTarget}\\.${escapedVar}\\b`, 'g');
    return expression.replace(regex, `${targetName}.${newVarName}`);
  };

  const updateTree = (blocks: EventBlock[]): EventBlock[] => {
    return blocks.map(block => {
      const updatedBlock = { ...block };

      // Update conditions
      updatedBlock.conditions = block.conditions.map(cond => {
        let newParams = [...cond.params];

        // Handle explicit instance variable parameter
        // This usually applies if the condition is targetted at the specific object
        if (cond.type === 'compareInstanceVariable' && newParams[0] === oldVarName) {
          // We only update if this condition belongs to the object being renamed
          // (or if we can't be sure, we update and assume the user knows what they're doing)
          newParams[0] = newVarName;
        }

        newParams = newParams.map(p => replaceInstanceVarInExpression(p));
        return { ...cond, params: newParams };
      });

      // Update actions
      updatedBlock.actions = block.actions.map(act => {
        let newParams = [...act.params];

        // Handle explicit instance variable parameter
        if (['setInstanceVariable', 'addInstanceVariable', 'subtractInstanceVariable'].includes(act.type) && newParams[0] === oldVarName) {
          newParams[0] = newVarName;
        }

        newParams = newParams.map(p => replaceInstanceVarInExpression(p));
        return { ...act, params: newParams };
      });

      // Update variable blocks
      if (updatedBlock.type === 'variable' && updatedBlock.variable) {
        updatedBlock.variable = {
          ...updatedBlock.variable,
          initialValue: replaceInstanceVarInExpression(updatedBlock.variable.initialValue)
        };
      }

      if (block.children.length > 0) {
        updatedBlock.children = updateTree(block.children);
      }

      return updatedBlock;
    });
  };

  return {
    ...project,
    globalVariables: project.globalVariables.map(v => ({
      ...v,
      initialValue: replaceInstanceVarInExpression(v.initialValue)
    })),
    eventSheets: project.eventSheets.map(sheet => ({
      ...sheet,
      events: updateTree(sheet.events)
    }))
  };
}

/**
 * Safely replaces a variable name within an expression string.
 */
function replaceVariableNameInExpression(expression: any, oldName: string, newName: string): any {
  if (typeof expression !== 'string') return expression;

  // Note: we escape the oldName just in case it contains regex-special characters
  const escapedName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Use regex with word boundaries (\b) to replace only the exact variable name.
  // This prevents replacing "v" inside "variable" if we rename "v" to "x".
  const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
  return expression.replace(regex, newName);
}

/**
 * Adds a new global variable to the project.
 */
export function addGlobalVariable(project: Project, name: string, type: 'number' | 'string' | 'boolean' = 'number', initialValue: any = 0): Project {
  const sanitized = sanitizeName(name);
  const newVar: GlobalVariable = {
    id: generateId(),
    name: sanitized,
    type,
    initialValue,
    isStatic: false,
    isConstant: false,
    description: ''
  };
  return {
    ...project,
    globalVariables: [...project.globalVariables, newVar]
  };
}

/**
 * Updates a global variable and synchronizes references if the name changed.
 */
export function updateGlobalVariable(project: Project, variableId: string, updates: Partial<Omit<GlobalVariable, 'id'>>): Project {
  const oldVar = project.globalVariables.find(v => v.id === variableId);
  if (!oldVar) return project;
  const oldName = oldVar.name;

  let newName = updates.name;
  if (newName && newName !== oldName) {
    const allNames = getAllUsedNames(project);
    newName = getUniqueName(newName, allNames);
  } else {
    newName = oldName;
  }

  const finalUpdates = { ...updates, name: newName };

  // 1. Sync in globalVariables pool
  let updatedProject = {
    ...project,
    globalVariables: project.globalVariables.map(v => {
      if (v.id === variableId) return { ...v, ...updates };
      // Also update initial values of other variables if they use this one
      if (newName !== oldName) {
        return {
          ...v,
          initialValue: replaceVariableNameInExpression(v.initialValue, oldName, newName)
        };
      }
      return v;
    })
  };

  // 2. Sync in all Event Sheets (both name references and the definition blocks)
  updatedProject.eventSheets = updatedProject.eventSheets.map(sheet => ({
    ...sheet,
    events: syncVariableInTree(sheet.events, variableId, oldName, newName, updates)
  }));

  return updatedProject;
}

function syncVariableInTree(blocks: EventBlock[], variableId: string, oldName: string, newName: string, updates: Partial<GlobalVariable>): EventBlock[] {
  return blocks.map(b => {
    let nextB = b;

    // If this is the definition block for the variable, update its properties
    if (b.type === 'variable' && b.variable?.id === variableId) {
      nextB = { ...b, variable: { ...b.variable, ...updates } };
    }

    // If the name changed, sync references in expressions/params
    if (newName !== oldName) {
      nextB = updateVariableReferencesInBlock(nextB, oldName, newName);
    }

    // Recursively update children
    if (nextB.children.length > 0) {
      nextB = { ...nextB, children: syncVariableInTree(nextB.children, variableId, oldName, newName, updates) };
    }

    return nextB;
  });
}

/**
 * Counts usages of a variable name across the whole project.
 */
export function getVariableUsageCount(project: Project, variableName: string): number {
  let count = 0;

  // 1. Check in other global variables' initial values
  project.globalVariables.forEach(v => {
    if (v.name === variableName) return; // Don't count self
    if (typeof v.initialValue === 'string' && isVariableInExpression(v.initialValue, variableName)) {
      count++;
    }
  });

  // 2. Check in all event sheets
  project.eventSheets.forEach(es => {
    const scanBlocks = (blocks: EventBlock[]) => {
      blocks.forEach(b => {
        // Check conditions
        b.conditions.forEach(c => {
          c.params.forEach(p => {
            if (typeof p === 'string' && isVariableInExpression(p, variableName)) count++;
          });
        });
        // Check actions
        b.actions.forEach(a => {
          a.params.forEach(p => {
            if (typeof p === 'string' && isVariableInExpression(p, variableName)) count++;
          });
        });
        // Check local variables or other definitions
        if (b.variable && b.variable.name !== variableName) {
          if (typeof b.variable.initialValue === 'string' && isVariableInExpression(b.variable.initialValue, variableName)) count++;
        }

        scanBlocks(b.children);
      });
    };
    scanBlocks(es.events);
  });

  return count;
}

function updateVariableReferencesInBlock(block: EventBlock, oldName: string, newName: string): EventBlock {
  return {
    ...block,
    conditions: block.conditions.map(c => ({
      ...c,
      params: c.params.map(p => replaceVariableNameInExpression(p, oldName, newName))
    })),
    actions: block.actions.map(a => ({
      ...a,
      params: a.params.map(p => replaceVariableNameInExpression(p, oldName, newName))
    })),
    // Also update variable's own initial value if it uses the renamed variable (for local vars or other global vars)
    variable: block.variable ? {
      ...block.variable,
      initialValue: replaceVariableNameInExpression(block.variable.initialValue, oldName, newName)
    } : undefined
  };
}

/**
 * Returns a list of locations where a variable is used.
 */
export function getVariableUsageLocations(project: Project, variableName: string): { type: string, sheetName?: string, sheetId?: string, blockId?: string, index?: string, detail: string }[] {
  const locations: { type: string, sheetName?: string, sheetId?: string, blockId?: string, index?: string, detail: string }[] = [];

  // 1. Check in other global variables
  project.globalVariables.forEach(v => {
    if (v.name === variableName) return;
    if (typeof v.initialValue === 'string' && isVariableInExpression(v.initialValue, variableName)) {
      locations.push({ type: 'Global Variable', detail: `Initial value of "${v.name}"` });
    }
  });

  // 2. Check in all event sheets
  project.eventSheets.forEach(es => {
    const scanBlocks = (blocks: EventBlock[], depthIndex: string) => {
      blocks.forEach((b, idx) => {
        const currentIndex = depthIndex ? `${depthIndex}.${idx + 1}` : `${idx + 1}`;
        b.conditions.forEach(c => {
          c.params.forEach(p => {
            if (typeof p === 'string' && isVariableInExpression(p, variableName)) {
              locations.push({ type: 'Condition', sheetName: es.name, sheetId: es.id, blockId: b.id, index: currentIndex, detail: `${c.type} (param)` });
            }
          });
        });
        b.actions.forEach(a => {
          a.params.forEach(p => {
            if (typeof p === 'string' && isVariableInExpression(p, variableName)) {
              locations.push({ type: 'Action', sheetName: es.name, sheetId: es.id, blockId: b.id, index: currentIndex, detail: `${a.type} (param)` });
            }
          });
        });
        if (b.variable && b.variable.name !== variableName) {
          if (typeof b.variable.initialValue === 'string' && isVariableInExpression(b.variable.initialValue, variableName)) {
            locations.push({ type: 'Local Variable', sheetName: es.name, sheetId: es.id, blockId: b.id, index: currentIndex, detail: `Initial value of "${b.variable.name}"` });
          }
        }
        scanBlocks(b.children, currentIndex);
      });
    };
    scanBlocks(es.events, '');
  });
  return locations;
}

function isVariableInExpression(expression: string, variableName: string): boolean {
  const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
  return regex.test(expression);
}

