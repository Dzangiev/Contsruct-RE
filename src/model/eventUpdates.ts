import { Project, EventSheet, EventBlock, Condition, Action } from './project';
import { generateId } from '../utils/id';

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
 * Adds a new event block to an event sheet.
 */
export function addEventBlock(
  project: Project, 
  eventSheetId: string, 
  parentBlockId: string | null, 
  type: 'event' | 'group' | 'comment' | 'variable'
): Project {
  const blockId = generateId();
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
      name: 'Variable' + (project.globalVariables.length + 1),
      type: 'number',
      initialValue: 0,
      comment: ''
    };
    updatedProject = {
      ...project,
      globalVariables: [...project.globalVariables, newBlock.variable]
    };
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
        events: updateInTree(es.events, parentBlockId, p => ({
          ...p,
          children: [...p.children, newBlock]
        }))
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
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
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
  targetIndex: number
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
    if (targetParentId === null) {
      const next = [...blocks];
      const safeIndex = Math.min(targetIndex, next.length);
      next.splice(safeIndex, 0, blockToMove);
      return next;
    }
    return blocks.map(b => {
      if (b.id === targetParentId) {
        const nextChildren = [...b.children];
        const safeIndex = Math.min(targetIndex, nextChildren.length);
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

  return {
    ...project,
    eventSheets: project.eventSheets.map(es => es.id === eventSheetId ? updatedSheet : es)
  };
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

  // If any cloned blocks have variables, add them to global variables
  cloned.forEach(b => {
    if (b.variable) {
      updatedProject = {
        ...updatedProject,
        globalVariables: [...updatedProject.globalVariables, b.variable]
      };
    }
  });

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
