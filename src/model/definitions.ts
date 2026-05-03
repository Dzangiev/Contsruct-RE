export interface ParamDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'objectType' | 'layer' | 'enum' | 'globalVariable' | 'instanceVariable' | 'functionName' | 'any';
  options?: string[]; // For enum type
  defaultValue?: any;
}

export interface PluginDefinition {
  kind: string;
  name: string;
  description: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const PLUGIN_DEFINITIONS: PluginDefinition[] = [
  {
    kind: 'sprite',
    name: 'Sprite',
    description: 'An object with an image, commonly used for characters, projectiles, and scenery.',
    icon: 'image',
    defaultWidth: 64,
    defaultHeight: 64
  },
  {
    kind: 'tiled-background',
    name: 'Tiled Background',
    description: 'An object that repeats its image in a grid. Useful for backgrounds and walls.',
    icon: 'grid',
    defaultWidth: 128,
    defaultHeight: 128
  },
  {
    kind: 'text',
    name: 'Text',
    description: 'Display text on the screen.',
    icon: 'type',
    defaultWidth: 100,
    defaultHeight: 20
  }
];

export interface BehaviorDefinition {
  type: string;
  name: string;
  description: string;
  defaultProperties: Record<string, any>;
}

export const BEHAVIOR_DEFINITIONS: BehaviorDefinition[] = [
  {
    type: 'platform',
    name: 'Platform',
    description: 'Standard platformer character movement with gravity, jumping, and floor collisions.',
    defaultProperties: {
      maxSpeed: 330,
      acceleration: 1500,
      deceleration: 1500,
      jumpStrength: 650,
      gravity: 1500,
      maxFallSpeed: 1000,
      jumpSustain: 0.2,
      doubleJump: false
    }
  },
  {
    type: 'bullet',
    name: 'Bullet',
    description: 'Moves the object forward at a constant speed.',
    defaultProperties: {
      speed: 400,
      acceleration: 0,
      gravity: 0,
      bounce: false,
      step: 0
    }
  },
  {
    type: 'eight-direction',
    name: '8 Direction',
    description: 'Movement in 8 directions using arrow keys.',
    defaultProperties: {
      maxSpeed: 200,
      acceleration: 600,
      deceleration: 900,
      directions: '8-way'
    }
  },
  {
    type: 'scroll-to',
    name: 'Scroll To',
    description: 'Centers the viewport on this object during preview.',
    defaultProperties: {}
  },
  {
    type: 'solid',
    name: 'Solid',
    description: 'Makes the object a solid obstacle for other behaviors like Platform.',
    defaultProperties: {}
  }
];

export interface LogicDefinition {
  type: string;
  name: string;
  description?: string;
  params: ParamDefinition[];
  category: string;
  target: 'system' | 'object' | 'both';
  requiredKind?: string | string[];
}

export const CONDITIONS: LogicDefinition[] = [
  // System Conditions
  {
    type: 'always',
    name: 'Every tick',
    description: 'Condition is always true.',
    params: [],
    category: 'System',
    target: 'system'
  },
  {
    type: 'onStartOfLayout',
    name: 'On start of layout',
    description: 'Runs once when the layout starts.',
    params: [],
    category: 'System',
    target: 'system'
  },
  {
    type: 'compareGlobalVariable',
    name: 'Compare variable',
    description: 'Compare the value of a global variable.',
    params: [
      { name: 'Variable', type: 'string', defaultValue: 'Score' },
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'else',
    name: 'Else',
    description: 'Runs if the preceding event was false.',
    params: [],
    category: 'System',
    target: 'system'
  },
  {
    type: 'keyDown',
    name: 'Key is down',
    description: 'True if a specific key is currently held down.',
    params: [{ name: 'Key', type: 'string', defaultValue: 'Space' }],
    category: 'Keyboard',
    target: 'system'
  },
  {
    type: 'keyPressed',
    name: 'On key pressed',
    description: 'True only during the frame the key was pressed.',
    params: [{ name: 'Key', type: 'string', defaultValue: 'Space' }],
    category: 'Keyboard',
    target: 'system'
  },
  {
    type: 'pointerDown',
    name: 'Pointer is down',
    description: 'True if the pointer (mouse/touch) is currently held down.',
    params: [],
    category: 'Pointer',
    target: 'system'
  },
  {
    type: 'pointerPressed',
    name: 'On pointer pressed',
    description: 'True only during the frame the pointer was pressed.',
    params: [],
    category: 'Pointer',
    target: 'system'
  },
  {
    type: 'pointerReleased',
    name: 'On pointer released',
    description: 'True only during the frame the pointer was released.',
    params: [],
    category: 'Pointer',
    target: 'system'
  },
  // Picking (System)
  {
    type: 'pickAll',
    name: 'Pick all',
    description: 'Resets the selection for an object type to all available instances.',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Picking',
    target: 'system'
  },
  {
    type: 'pickRandom',
    name: 'Pick random (System)',
    description: 'Picks one random instance of an object type from all available instances.',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Picking',
    target: 'system'
  },
  // Object Conditions
  {
    type: 'isVisible',
    name: 'Is visible',
    description: 'Check if the object is currently visible.',
    params: [],
    category: 'Appearance',
    target: 'object'
  },
  {
    type: 'comparePosition',
    name: 'Compare position',
    description: 'Compare X or Y position of the object.',
    params: [
      { name: 'Axis', type: 'enum', options: ['x', 'y'], defaultValue: 'x' },
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform',
    target: 'object'
  },
  {
    type: 'pointerOverObject',
    name: 'Is pointer over object',
    description: 'True if the pointer is currently over the object.',
    params: [],
    category: 'Pointer',
    target: 'object'
  },
  {
    type: 'pointerPressedOnObject',
    name: 'On pointer pressed on object',
    description: 'True only if the pointer was pressed while over the object.',
    params: [],
    category: 'Pointer',
    target: 'object'
  },
  {
    type: 'isOverlapping',
    name: 'Is overlapping another object',
    description: 'True if the object is overlapping another instance of a specific type.',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Collisions',
    target: 'object'
  },
  {
    type: 'onCollision',
    name: 'On collision with another object',
    description: 'True only during the frame the object first overlaps another instance of a specific type.',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Collisions',
    target: 'object'
  },
  {
    type: 'compareInstanceVariable',
    name: 'Compare instance variable',
    description: 'Compare the value of an instance variable.',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'Instance Variables',
    target: 'object'
  },
  {
    type: 'compareText',
    name: 'Compare text',
    description: 'Compare the current text of the object.',
    params: [
      { name: 'Comparison', type: 'enum', options: ['==', '!=', 'includes'], defaultValue: '==' },
      { name: 'Value', type: 'string', defaultValue: '""' }
    ],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  },
  // Picking (Object)
  {
    type: 'pickRandom',
    name: 'Pick random',
    description: 'Picks one random instance from the current selection of this object type.',
    params: [],
    category: 'Picking',
    target: 'object'
  },
  {
    type: 'pickNearest',
    name: 'Pick nearest',
    description: 'Picks the instance of this object type nearest to a specific position.',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Picking',
    target: 'object'
  },
  {
    type: 'pickFarthest',
    name: 'Pick farthest',
    description: 'Picks the instance of this object type farthest from a specific position.',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Picking',
    target: 'object'
  },
  {
    type: 'pickByUID',
    name: 'Pick by unique ID',
    description: 'Picks the instance with a specific unique ID (string).',
    params: [{ name: 'UID', type: 'string', defaultValue: '""' }],
    category: 'Picking',
    target: 'object'
  },
  {
    type: 'pickByIndex',
    name: 'Pick by index',
    description: 'Picks an instance by its zero-based index in the current selection.',
    params: [{ name: 'Index', type: 'number', defaultValue: 0 }],
    category: 'Picking',
    target: 'object'
  }
];

export const ACTIONS: LogicDefinition[] = [
  {
    type: 'destroy',
    name: 'Destroy',
    description: 'Remove the object instance from the layout.',
    params: [],
    category: 'Misc',
    target: 'object'
  },
  {
    type: 'setPosition',
    name: 'Set position',
    description: 'Move the object to a specific X and Y coordinate.',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform',
    target: 'object'
  },
  {
    type: 'moveBy',
    name: 'Move by',
    description: 'Change the position relative to the current position.',
    params: [
      { name: 'DX', type: 'number', defaultValue: 10 },
      { name: 'DY', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform',
    target: 'object'
  },
  {
    type: 'setVisible',
    name: 'Set visible',
    description: 'Show or hide the object.',
    params: [{ name: 'Visible', type: 'boolean', defaultValue: true }],
    category: 'Appearance',
    target: 'object'
  },
  {
    type: 'createInstance',
    name: 'Create object',
    description: 'Create a new instance of an object type.',
    params: [
      { name: 'Object Type', type: 'objectType' },
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 },
      { name: 'Layer', type: 'layer' }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'setVariable',
    name: 'Set variable',
    description: 'Set the value of a global variable.',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'addVariable',
    name: 'Add to variable',
    description: 'Add a value to a global or local variable.',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'subtractVariable',
    name: 'Subtract from variable',
    description: 'Subtract a value from a global or local variable.',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'setInstanceVariable',
    name: 'Set instance variable',
    description: 'Set the value of an instance variable.',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 100 }
    ],
    category: 'Instance Variables',
    target: 'object'
  },
  {
    type: 'addInstanceVariable',
    name: 'Add to instance variable',
    description: 'Add a value to an instance variable.',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'Instance Variables',
    target: 'object'
  },
  {
    type: 'subtractInstanceVariable',
    name: 'Subtract from instance variable',
    description: 'Subtract a value from an instance variable.',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'Instance Variables',
    target: 'object'
  },
  {
    type: 'log',
    name: 'Log to console',
    description: 'Output a message to the runtime debug console.',
    params: [
      { name: 'Message', type: 'string', defaultValue: '"Hello World"' },
      { name: 'Type', type: 'enum', options: ['info', 'warn', 'error'], defaultValue: 'info' }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'callFunction',
    name: 'Call function',
    description: 'Execute the logic inside a named function.',
    params: [
      { name: 'Function', type: 'functionName', defaultValue: '' }
    ],
    category: 'Functions',
    target: 'system'
  },
  {
    type: 'setReturnValue',
    name: 'Set return value',
    description: 'Set the value that this function will return to its caller.',
    params: [
      { name: 'Value', type: 'any', defaultValue: '0' }
    ],
    category: 'Functions',
    target: 'system'
  },
  {
    type: 'setText',
    name: 'Set text',
    description: 'Change the text displayed by the object.',
    params: [{ name: 'Text', type: 'string', defaultValue: '"Hello"' }],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'appendText',
    name: 'Append text',
    description: 'Add text to the end of the existing text.',
    params: [{ name: 'Text', type: 'string', defaultValue: '" World"' }],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'setTextColor',
    name: 'Set text color',
    description: 'Change the color of the text.',
    params: [{ name: 'Color', type: 'string', defaultValue: '"#ffffff"' }],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'setFontSize',
    name: 'Set font size',
    description: 'Change the size of the font.',
    params: [{ name: 'Size', type: 'number', defaultValue: 12 }],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  }
];

export function findConditionDefinition(type: string): LogicDefinition | undefined {
  return CONDITIONS.find(c => c.type === type);
}

export function findActionDefinition(type: string): LogicDefinition | undefined {
  return ACTIONS.find(a => a.type === type);
}
