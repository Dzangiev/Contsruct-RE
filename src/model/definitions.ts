export interface ParamDefinition {
  name: string;
  nameKey?: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'objectType' | 'layer' | 'instanceVariable' | 'globalVariable' | 'functionName' | 'color' | 'any' | 'asset';
  options?: string[]; // For enum type
  defaultValue?: any;
}

export interface PluginDefinition {
  kind: string;
  name: string;
  nameKey?: string;
  description: string;
  descriptionKey?: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  propertyDefinitions: PropertyDefinition[];
}

export const PLUGIN_DEFINITIONS: PluginDefinition[] = [
  {
    kind: 'sprite',
    name: 'Sprite',
    nameKey: 'PLUGIN_SPRITE_NAME',
    description: 'An object with an image, commonly used for characters, projectiles, and scenery.',
    descriptionKey: 'PLUGIN_SPRITE_DESC',
    icon: 'image',
    defaultWidth: 64,
    defaultHeight: 64,
    propertyDefinitions: [
      { name: 'color', labelKey: 'COLOR', type: 'string', defaultValue: '#ffffff' }
    ]
  },
  {
    kind: 'tiled-background',
    name: 'Tiled Background',
    nameKey: 'PLUGIN_TILED_BACKGROUND_NAME',
    description: 'An object that repeats its image in a grid. Useful for backgrounds and walls.',
    descriptionKey: 'PLUGIN_TILED_BACKGROUND_DESC',
    icon: 'grid',
    defaultWidth: 128,
    defaultHeight: 128,
    propertyDefinitions: [
      { name: 'color', labelKey: 'COLOR', type: 'string', defaultValue: '#ffffff' },
      { name: 'tileWidth', labelKey: 'TILE_WIDTH', type: 'number', defaultValue: 32 },
      { name: 'tileHeight', labelKey: 'TILE_HEIGHT', type: 'number', defaultValue: 32 }
    ]
  },
  {
    kind: 'text',
    name: 'Text',
    nameKey: 'PLUGIN_TEXT_NAME',
    description: 'Display text on the screen.',
    descriptionKey: 'PLUGIN_TEXT_DESC',
    icon: 'type',
    defaultWidth: 100,
    defaultHeight: 20,
    propertyDefinitions: [
      { name: 'text', labelKey: 'TEXT', type: 'string', defaultValue: 'Text' },
      { name: 'color', labelKey: 'COLOR', type: 'string', defaultValue: '#ffffff' },
      { name: 'fontSize', labelKey: 'FONT_SIZE', type: 'number', defaultValue: 12 },
      { name: 'fontFace', labelKey: 'FONT_FACE', type: 'string', defaultValue: 'Arial' },
      { name: 'horizontalAlign', labelKey: 'HORIZONTAL_ALIGN', type: 'enum', options: ['left', 'center', 'right'], defaultValue: 'left' },
      { name: 'verticalAlign', labelKey: 'VERTICAL_ALIGN', type: 'enum', options: ['top', 'center', 'bottom'], defaultValue: 'top' }
    ]
  },
  {
    kind: 'particles',
    name: 'Particles',
    nameKey: 'PLUGIN_PARTICLES_NAME',
    description: 'Emits small images or pixels to create effects like fire, smoke, and sparks.',
    descriptionKey: 'PLUGIN_PARTICLES_DESC',
    icon: 'sparkles',
    defaultWidth: 32,
    defaultHeight: 32,
    propertyDefinitions: [
      { name: 'rate', labelKey: 'RATE', type: 'number', defaultValue: 10 },
      { name: 'lifeTime', labelKey: 'LIFE_TIME', type: 'number', defaultValue: 2 },
      { name: 'speed', labelKey: 'SPEED', type: 'number', defaultValue: 100 },
      { name: 'spread', labelKey: 'SPREAD', type: 'number', defaultValue: 360 },
      { name: 'gravity', labelKey: 'GRAVITY', type: 'number', defaultValue: 0 },
      { name: 'color', labelKey: 'COLOR', type: 'string', defaultValue: '#ff9900' },
      { name: 'startSize', labelKey: 'START_SIZE', type: 'number', defaultValue: 4 },
      { name: 'endSize', labelKey: 'END_SIZE', type: 'number', defaultValue: 0 }
    ]
  },
  {
    kind: 'audio',
    name: 'Audio',
    nameKey: 'PLUGIN_AUDIO_NAME',
    description: 'Play sound effects and background music.',
    descriptionKey: 'PLUGIN_AUDIO_DESC',
    icon: 'volume-2',
    defaultWidth: 0,
    defaultHeight: 0,
    propertyDefinitions: []
  },
  {
    kind: 'tilemap',
    name: 'Tilemap',
    nameKey: 'PLUGIN_TILEMAP_NAME',
    description: 'An object that displays a grid of tiles from a tileset.',
    descriptionKey: 'PLUGIN_TILEMAP_DESC',
    icon: 'layout-grid',
    defaultWidth: 256,
    defaultHeight: 256,
    propertyDefinitions: [
      { name: 'tileWidth', labelKey: 'TILE_WIDTH', type: 'number', defaultValue: 32 },
      { name: 'tileHeight', labelKey: 'TILE_HEIGHT', type: 'number', defaultValue: 32 },
      { name: 'assetId', labelKey: 'ASSET_ID', type: 'asset', defaultValue: '' }
    ]
  },
  {
    kind: 'touch',
    name: 'Touch',
    nameKey: 'PLUGIN_TOUCH_NAME',
    description: 'Input from touch-screen devices.',
    descriptionKey: 'PLUGIN_TOUCH_DESC',
    icon: 'hand',
    defaultWidth: 0,
    defaultHeight: 0,
    propertyDefinitions: []
  },
  {
    kind: 'gamepad',
    name: 'Gamepad',
    nameKey: 'PLUGIN_GAMEPAD_NAME',
    description: 'Input from game controllers.',
    descriptionKey: 'PLUGIN_GAMEPAD_DESC',
    icon: 'gamepad-2',
    defaultWidth: 0,
    defaultHeight: 0,
    propertyDefinitions: []
  }
];

export interface PropertyDefinition {
  name: string;
  labelKey?: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'asset';
  options?: string[];
  defaultValue: any;
}

export interface BehaviorDefinition {
  type: string;
  name: string;
  nameKey?: string;
  description: string;
  descriptionKey?: string;
  propertyDefinitions: PropertyDefinition[];
}

export const BEHAVIOR_DEFINITIONS: BehaviorDefinition[] = [
  {
    type: 'platform',
    name: 'Platform',
    nameKey: 'BEHAVIOR_PLATFORM_NAME',
    description: 'Standard platformer character movement with gravity, jumping, and floor collisions.',
    descriptionKey: 'BEHAVIOR_PLATFORM_DESC',
    propertyDefinitions: [
      { name: 'maxSpeed', labelKey: 'MAX_SPEED', type: 'number', defaultValue: 330 },
      { name: 'acceleration', labelKey: 'ACCELERATION', type: 'number', defaultValue: 1500 },
      { name: 'deceleration', labelKey: 'DECELERATION', type: 'number', defaultValue: 1500 },
      { name: 'jumpStrength', labelKey: 'JUMP_STRENGTH', type: 'number', defaultValue: 650 },
      { name: 'gravity', labelKey: 'GRAVITY', type: 'number', defaultValue: 1500 },
      { name: 'maxFallSpeed', labelKey: 'MAX_FALL_SPEED', type: 'number', defaultValue: 1000 },
      { name: 'jumpSustain', labelKey: 'JUMP_SUSTAIN', type: 'number', defaultValue: 0.2 },
      { name: 'doubleJump', labelKey: 'DOUBLE_JUMP', type: 'boolean', defaultValue: false }
    ]
  },
  {
    type: 'bullet',
    name: 'Bullet',
    nameKey: 'BEHAVIOR_BULLET_NAME',
    description: 'Moves the object forward at a constant speed.',
    descriptionKey: 'BEHAVIOR_BULLET_DESC',
    propertyDefinitions: [
      { name: 'speed', labelKey: 'SPEED', type: 'number', defaultValue: 400 },
      { name: 'acceleration', labelKey: 'ACCELERATION', type: 'number', defaultValue: 0 },
      { name: 'gravity', labelKey: 'GRAVITY', type: 'number', defaultValue: 0 },
      { name: 'bounce', labelKey: 'BOUNCE', type: 'boolean', defaultValue: false }
    ]
  },
  {
    type: 'eight-direction',
    name: '8 Direction',
    nameKey: 'BEHAVIOR_8DIRECTION_NAME',
    description: 'Movement in 8 directions using arrow keys.',
    descriptionKey: 'BEHAVIOR_8DIRECTION_DESC',
    propertyDefinitions: [
      { name: 'maxSpeed', labelKey: 'MAX_SPEED', type: 'number', defaultValue: 200 },
      { name: 'acceleration', labelKey: 'ACCELERATION', type: 'number', defaultValue: 600 },
      { name: 'deceleration', labelKey: 'DECELERATION', type: 'number', defaultValue: 900 },
      { name: 'directions', labelKey: 'DIRECTIONS', type: 'enum', options: ['4-way', '8-way', 'Left/Right'], defaultValue: '8-way' }
    ]
  },
  {
    type: 'scroll-to',
    name: 'Scroll To',
    nameKey: 'BEHAVIOR_SCROLLTO_NAME',
    description: 'Centers the viewport on this object during preview.',
    descriptionKey: 'BEHAVIOR_SCROLLTO_DESC',
    propertyDefinitions: []
  },
  {
    type: 'solid',
    name: 'Solid',
    nameKey: 'BEHAVIOR_SOLID_NAME',
    description: 'Makes the object a solid obstacle for other behaviors like Platform.',
    descriptionKey: 'BEHAVIOR_SOLID_DESC',
    propertyDefinitions: [
      { name: 'tags', labelKey: 'TAGS', type: 'string', defaultValue: '' }
    ]
  },
  {
    type: 'physics',
    name: 'Physics',
    nameKey: 'BEHAVIOR_PHYSICS_NAME',
    description: 'Simulates realistic physics using the Matter.js engine.',
    descriptionKey: 'BEHAVIOR_PHYSICS_DESC',
    propertyDefinitions: [
      { name: 'isStatic', labelKey: 'IS_STATIC', type: 'boolean', defaultValue: false },
      { name: 'density', labelKey: 'DENSITY', type: 'number', defaultValue: 0.001 },
      { name: 'friction', labelKey: 'FRICTION', type: 'number', defaultValue: 0.1 },
      { name: 'restitution', labelKey: 'RESTITUTION', type: 'number', defaultValue: 0.2 },
      { name: 'frictionAir', labelKey: 'FRICTION_AIR', type: 'number', defaultValue: 0.01 },
      { name: 'fixedRotation', labelKey: 'FIXED_ROTATION', type: 'boolean', defaultValue: false }
    ]
  },
  {
    type: 'pathfinding',
    name: 'Pathfinding',
    nameKey: 'BEHAVIOR_PATHFINDING_NAME',
    description: 'Allows the object to find and follow a path around Solid obstacles.',
    descriptionKey: 'BEHAVIOR_PATHFINDING_DESC',
    propertyDefinitions: [
      { name: 'maxSpeed', labelKey: 'MAX_SPEED', type: 'number', defaultValue: 200 },
      { name: 'acceleration', labelKey: 'ACCELERATION', type: 'number', defaultValue: 600 },
      { name: 'deceleration', labelKey: 'DECELERATION', type: 'number', defaultValue: 600 },
      { name: 'rotateSpeed', labelKey: 'ROTATE_SPEED', type: 'number', defaultValue: 180 },
      { name: 'cellSide', labelKey: 'CELL_SIDE', type: 'number', defaultValue: 32 }
    ]
  },
  {
    type: 'tween',
    name: 'Tween',
    nameKey: 'BEHAVIOR_TWEEN_NAME',
    description: 'Smoothly interpolate properties over time.',
    descriptionKey: 'BEHAVIOR_TWEEN_DESC',
    propertyDefinitions: []
  }
];

export interface LogicDefinition {
  type: string;
  name: string;
  nameKey?: string;
  description?: string;
  descriptionKey?: string;
  params: ParamDefinition[];
  category: string;
  categoryKey?: string;
  target: 'system' | 'object' | 'both';
  requiredKind?: string | string[];
  behaviorType?: string;
  isTrigger?: boolean;
}

export const CONDITIONS: LogicDefinition[] = [
  // System Conditions
  {
    type: 'always',
    name: 'Every tick',
    nameKey: 'EVERY_TICK',
    description: 'Condition is always true.',
    descriptionKey: 'EVERY_TICK_DESC',
    params: [],
    category: 'System',
    categoryKey: 'CAT_SYSTEM',
    target: 'system'
  },
  {
    type: 'onStartOfLayout',
    name: 'On start of layout',
    nameKey: 'ON_START_OF_LAYOUT',
    description: 'Runs once when the layout starts.',
    descriptionKey: 'ON_START_OF_LAYOUT_DESC',
    params: [],
    category: 'System',
    categoryKey: 'CAT_SYSTEM',
    target: 'system',
    isTrigger: true
  },
  {
    type: 'compareGlobalVariable',
    name: 'Compare variable',
    nameKey: 'COMPARE_VARIABLE',
    description: 'Compare the value of a global variable.',
    descriptionKey: 'COMPARE_VARIABLE_DESC',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'System',
    categoryKey: 'CAT_SYSTEM',
    target: 'system'
  },
  {
    type: 'else',
    name: 'Else',
    nameKey: 'ELSE',
    description: 'Runs if the preceding event was false.',
    descriptionKey: 'ELSE_DESC',
    params: [],
    category: 'System',
    categoryKey: 'CAT_SYSTEM',
    target: 'system'
  },
  {
    type: 'keyDown',
    name: 'Key is down',
    nameKey: 'KEY_IS_DOWN',
    description: 'True if a specific key is currently held down.',
    descriptionKey: 'KEY_IS_DOWN_DESC',
    params: [{ name: 'Key', type: 'string', defaultValue: 'Space' }],
    category: 'Keyboard',
    categoryKey: 'CAT_KEYBOARD',
    target: 'system'
  },
  {
    type: 'keyPressed',
    name: 'On key pressed',
    nameKey: 'ON_KEY_PRESSED',
    description: 'True only during the frame the key was pressed.',
    descriptionKey: 'ON_KEY_PRESSED_DESC',
    params: [{ name: 'Key', type: 'string', defaultValue: 'Space' }],
    category: 'Keyboard',
    categoryKey: 'CAT_KEYBOARD',
    target: 'system',
    isTrigger: true
  },
  {
    type: 'pointerDown',
    name: 'Pointer is down',
    nameKey: 'POINTER_IS_DOWN',
    description: 'True if the pointer (mouse/touch) is currently held down.',
    descriptionKey: 'POINTER_IS_DOWN_DESC',
    params: [],
    category: 'Pointer',
    categoryKey: 'CAT_POINTER',
    target: 'system'
  },
  {
    type: 'pointerPressed',
    name: 'On pointer pressed',
    nameKey: 'ON_POINTER_PRESSED',
    description: 'True only during the frame the pointer was pressed.',
    descriptionKey: 'ON_POINTER_PRESSED_DESC',
    params: [],
    category: 'Pointer',
    categoryKey: 'CAT_POINTER',
    target: 'system',
    isTrigger: true
  },
  {
    type: 'pointerReleased',
    name: 'On pointer released',
    nameKey: 'ON_POINTER_RELEASED',
    description: 'True only during the frame the pointer was released.',
    descriptionKey: 'ON_POINTER_RELEASED_DESC',
    params: [],
    category: 'Pointer',
    categoryKey: 'CAT_POINTER',
    target: 'system',
    isTrigger: true
  },
  // Picking (System)
  {
    type: 'pickAll',
    name: 'Pick all',
    nameKey: 'PICK_ALL',
    description: 'Resets the selection for an object type to all available instances.',
    descriptionKey: 'PICK_ALL_DESC',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Picking',
    categoryKey: 'CAT_PICKING',
    target: 'system'
  },
  {
    type: 'pickRandom',
    name: 'Pick random (System)',
    nameKey: 'PICK_RANDOM',
    description: 'Picks one random instance of an object type from all available instances.',
    descriptionKey: 'PICK_RANDOM_DESC',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Picking',
    categoryKey: 'CAT_PICKING',
    target: 'system'
  },
  // Object Conditions
  {
    type: 'isVisible',
    name: 'Is visible',
    nameKey: 'IS_VISIBLE',
    description: 'Check if the object is currently visible.',
    descriptionKey: 'IS_VISIBLE_DESC',
    params: [],
    category: 'Appearance',
    categoryKey: 'CAT_APPEARANCE',
    target: 'object'
  },
  {
    type: 'comparePosition',
    name: 'Compare position',
    nameKey: 'COMPARE_POSITION',
    description: 'Compare X or Y position of the object.',
    descriptionKey: 'COMPARE_POSITION_DESC',
    params: [
      { name: 'Axis', type: 'enum', options: ['x', 'y'], defaultValue: 'x' },
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform',
    categoryKey: 'CAT_TRANSFORM',
    target: 'object'
  },
  {
    type: 'pointerOverObject',
    name: 'Is pointer over object',
    nameKey: 'IS_POINTER_OVER_OBJECT',
    description: 'True if the pointer is currently over the object.',
    descriptionKey: 'IS_POINTER_OVER_OBJECT_DESC',
    params: [],
    category: 'Pointer',
    categoryKey: 'CAT_POINTER',
    target: 'object'
  },
  {
    type: 'pointerPressedOnObject',
    name: 'On pointer pressed on object',
    nameKey: 'ON_POINTER_PRESSED_ON_OBJECT',
    description: 'True only if the pointer was pressed while over the object.',
    descriptionKey: 'ON_POINTER_PRESSED_ON_OBJECT_DESC',
    params: [],
    category: 'Pointer',
    categoryKey: 'CAT_POINTER',
    target: 'object',
    isTrigger: true
  },
  // Animation Conditions
  {
    type: 'isAnimPlaying',
    name: 'Is animation playing',
    nameKey: 'IS_ANIM_PLAYING',
    description: 'True if the specified animation is currently playing.',
    descriptionKey: 'IS_ANIM_PLAYING_DESC',
    params: [{ name: 'Animation', type: 'string', defaultValue: '""' }],
    category: 'Animations',
    categoryKey: 'CAT_ANIMATIONS',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'compareAnimFrame',
    name: 'Compare frame',
    nameKey: 'COMPARE_ANIM_FRAME',
    description: 'Compare the current animation frame index.',
    descriptionKey: 'COMPARE_ANIM_FRAME_DESC',
    params: [
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Frame', type: 'number', defaultValue: 0 }
    ],
    category: 'Animations',
    categoryKey: 'CAT_ANIMATIONS',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'onAnimFinished',
    name: 'On animation finished',
    nameKey: 'ON_ANIM_FINISHED',
    description: 'Runs when the current animation reaches its end.',
    descriptionKey: 'ON_ANIM_FINISHED_DESC',
    params: [{ name: 'Animation', type: 'string', defaultValue: '""' }],
    category: 'Animations',
    categoryKey: 'CAT_ANIMATIONS',
    target: 'object',
    requiredKind: 'sprite',
    isTrigger: true
  },
  {
    type: 'onAnimFrameChanged',
    name: 'On frame changed',
    nameKey: 'ON_ANIM_FRAME_CHANGED',
    description: 'Runs whenever the animation frame switches.',
    descriptionKey: 'ON_ANIM_FRAME_CHANGED_DESC',
    params: [],
    category: 'Animations',
    categoryKey: 'CAT_ANIMATIONS',
    target: 'object',
    requiredKind: 'sprite',
    isTrigger: true
  },
  {
    type: 'isOverlapping',
    name: 'Is overlapping another object',
    nameKey: 'IS_OVERLAPPING',
    description: 'True if the object is overlapping another instance of a specific type.',
    descriptionKey: 'IS_OVERLAPPING_DESC',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Collisions',
    categoryKey: 'CAT_COLLISIONS',
    target: 'object'
  },
  {
    type: 'onCollision',
    name: 'On collision with another object',
    nameKey: 'ON_COLLISION',
    description: 'True only during the frame the object first overlaps another instance of a specific type.',
    descriptionKey: 'ON_COLLISION_DESC',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Collisions',
    categoryKey: 'CAT_COLLISIONS',
    target: 'object',
    isTrigger: true
  },
  {
    type: 'compareInstanceVariable',
    name: 'Compare instance variable',
    nameKey: 'COMPARE_INSTANCE_VARIABLE',
    description: 'Compare the value of an instance variable.',
    descriptionKey: 'COMPARE_INSTANCE_VARIABLE_DESC',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'Instance Variables',
    categoryKey: 'CAT_INSTANCE_VARIABLES',
    target: 'object'
  },
  {
    type: 'compareText',
    name: 'Compare text',
    nameKey: 'COMPARE_TEXT',
    description: 'Compare the current text of the object.',
    descriptionKey: 'COMPARE_TEXT_DESC',
    params: [
      { name: 'Comparison', type: 'enum', options: ['==', '!=', 'includes'], defaultValue: '==' },
      { name: 'Value', type: 'string', defaultValue: '""' }
    ],
    category: 'Text',
    categoryKey: 'CAT_TEXT',
    target: 'object',
    requiredKind: 'text'
  },
  // --- Input Conditions ---
  {
    type: 'onTouchStart',
    name: 'On any touch start',
    nameKey: 'ON_TOUCH_START',
    description: 'Triggered when a new touch contact is made.',
    descriptionKey: 'ON_TOUCH_START_DESC',
    params: [],
    category: 'Touch',
    categoryKey: 'CAT_TOUCH',
    target: 'system',
    isTrigger: true
  },
  {
    type: 'onTouchEnd',
    name: 'On any touch end',
    nameKey: 'ON_TOUCH_END',
    description: 'Triggered when a touch contact is removed.',
    descriptionKey: 'ON_TOUCH_END_DESC',
    params: [],
    category: 'Touch',
    categoryKey: 'CAT_TOUCH',
    target: 'system',
    isTrigger: true
  },
  {
    type: 'isGamepadButtonDown',
    name: 'Is button down',
    nameKey: 'IS_GAMEPAD_BUTTON_DOWN',
    description: 'True if a specific gamepad button is currently held down.',
    descriptionKey: 'IS_GAMEPAD_BUTTON_DOWN_DESC',
    params: [
      { name: 'Gamepad', type: 'number', defaultValue: 0 },
      { name: 'Button', type: 'number', defaultValue: 0 }
    ],
    category: 'Gamepad',
    categoryKey: 'CAT_GAMEPAD',
    target: 'system'
  },
  {
    type: 'onGamepadButtonDown',
    name: 'On button pressed',
    nameKey: 'ON_GAMEPAD_BUTTON_PRESSED',
    description: 'Triggered when a gamepad button is first pressed.',
    descriptionKey: 'ON_GAMEPAD_BUTTON_PRESSED_DESC',
    params: [
      { name: 'Gamepad', type: 'number', defaultValue: 0 },
      { name: 'Button', type: 'number', defaultValue: 0 }
    ],
    category: 'Gamepad',
    categoryKey: 'CAT_GAMEPAD',
    target: 'system',
    isTrigger: true
  },
  // Picking (Object)
  {
    type: 'pickRandom',
    name: 'Pick random',
    nameKey: 'PICK_RANDOM',
    description: 'Picks one random instance from the current selection of this object type.',
    descriptionKey: 'PICK_RANDOM_DESC',
    params: [],
    category: 'Picking',
    categoryKey: 'CAT_PICKING',
    target: 'object'
  },
  {
    type: 'pickNearest',
    name: 'Pick nearest',
    nameKey: 'PICK_NEAREST',
    description: 'Picks the instance of this object type nearest to a specific position.',
    descriptionKey: 'PICK_NEAREST_DESC',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Picking',
    categoryKey: 'CAT_PICKING',
    target: 'object'
  },
  {
    type: 'pickFarthest',
    name: 'Pick farthest',
    nameKey: 'PICK_FARTHEST',
    description: 'Picks the instance of this object type farthest from a specific position.',
    descriptionKey: 'PICK_FARTHEST_DESC',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Picking',
    categoryKey: 'CAT_PICKING',
    target: 'object'
  },
  {
    type: 'pickByUID',
    name: 'Pick by unique ID',
    nameKey: 'PICK_BY_UID',
    description: 'Picks the instance with a specific unique ID (string).',
    descriptionKey: 'PICK_BY_UID_DESC',
    params: [{ name: 'UID', type: 'string', defaultValue: '""' }],
    category: 'Picking',
    categoryKey: 'CAT_PICKING',
    target: 'object'
  },
  {
    type: 'pickByIndex',
    name: 'Pick by index',
    nameKey: 'PICK_BY_INDEX',
    description: 'Picks an instance by its zero-based index in the current selection.',
    descriptionKey: 'PICK_BY_INDEX_DESC',
    params: [{ name: 'Index', type: 'number', defaultValue: 0 }],
    category: 'Picking',
    categoryKey: 'CAT_PICKING',
    target: 'object'
  },
  {
    type: 'physicsIsStatic',
    name: 'Is static',
    nameKey: 'PHYSICS_IS_STATIC',
    description: 'True if the object is currently set to be physically static.',
    descriptionKey: 'PHYSICS_IS_STATIC_DESC',
    params: [],
    category: 'Physics',
    categoryKey: 'CAT_PHYSICS',
    target: 'object',
    behaviorType: 'physics'
  },
  // Tween Conditions
  {
    type: 'onTweenFinished',
    name: 'On any tween finished',
    nameKey: 'ON_TWEEN_FINISHED',
    description: 'Triggered when any tween on this object completes.',
    descriptionKey: 'ON_TWEEN_FINISHED_DESC',
    params: [
      { name: 'Tag', type: 'string', defaultValue: '""' }
    ],
    category: 'Tween',
    categoryKey: 'CAT_TWEEN',
    target: 'object',
    behaviorType: 'tween',
    isTrigger: true
  },
  {
    type: 'isTweenPlaying',
    name: 'Is any tween playing',
    nameKey: 'IS_TWEEN_PLAYING',
    description: 'True if there is at least one active tween on this object.',
    descriptionKey: 'IS_TWEEN_PLAYING_DESC',
    params: [
      { name: 'Tag', type: 'string', defaultValue: '""' }
    ],
    category: 'Tween',
    categoryKey: 'CAT_TWEEN',
    target: 'object',
    behaviorType: 'tween'
  }
];

export const ACTIONS: LogicDefinition[] = [
  {
    type: 'destroy',
    name: 'Destroy',
    nameKey: 'DESTROY',
    description: 'Remove the object instance from the layout.',
    descriptionKey: 'DESTROY',
    params: [],
    category: 'Misc',
    categoryKey: 'CAT_MISC',
    target: 'object'
  },
  {
    type: 'setPosition',
    name: 'Set position',
    nameKey: 'SET_POSITION',
    description: 'Move the object to a specific X and Y coordinate.',
    descriptionKey: 'SET_POSITION_DESC',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform',
    categoryKey: 'CAT_TRANSFORM',
    target: 'object'
  },
  {
    type: 'moveBy',
    name: 'Move by',
    nameKey: 'MOVE_BY',
    description: 'Change the position relative to the current position.',
    descriptionKey: 'MOVE_BY_DESC',
    params: [
      { name: 'DX', type: 'number', defaultValue: 10 },
      { name: 'DY', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform',
    categoryKey: 'CAT_TRANSFORM',
    target: 'object'
  },
  {
    type: 'setVisible',
    name: 'Set visible',
    nameKey: 'SET_VISIBLE',
    description: 'Show or hide the object.',
    descriptionKey: 'SET_VISIBLE_DESC',
    params: [{ name: 'Visible', type: 'boolean', defaultValue: true }],
    category: 'Appearance',
    categoryKey: 'CAT_APPEARANCE',
    target: 'object'
  },
  {
    type: 'createInstance',
    name: 'Create object',
    nameKey: 'CREATE_OBJECT',
    description: 'Create a new instance of an object type.',
    descriptionKey: 'CREATE_OBJECT_DESC',
    params: [
      { name: 'Object Type', type: 'objectType' },
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 },
      { name: 'Layer', type: 'layer' }
    ],
    category: 'System',
    categoryKey: 'CAT_SYSTEM',
    target: 'system'
  },
  {
    type: 'setVariable',
    name: 'Set variable',
    nameKey: 'SET_VARIABLE',
    description: 'Set the value of a global variable.',
    descriptionKey: 'SET_VARIABLE_DESC',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'System',
    categoryKey: 'CAT_SYSTEM',
    target: 'system'
  },
  {
    type: 'addVariable',
    name: 'Add to variable',
    nameKey: 'ADD_TO_VARIABLE',
    description: 'Add a value to a global or local variable.',
    descriptionKey: 'ADD_TO_VARIABLE_DESC',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'System',
    categoryKey: 'CAT_SYSTEM',
    target: 'system'
  },
  {
    type: 'subtractVariable',
    name: 'Subtract from variable',
    nameKey: 'SUBTRACT_FROM_VARIABLE',
    description: 'Subtract a value from a global or local variable.',
    descriptionKey: 'SUBTRACT_FROM_VARIABLE_DESC',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'System',
    categoryKey: 'CAT_SYSTEM',
    target: 'system'
  },
  {
    type: 'setInstanceVariable',
    name: 'Set instance variable',
    nameKey: 'SET_INSTANCE_VARIABLE',
    description: 'Set the value of an instance variable.',
    descriptionKey: 'SET_INSTANCE_VARIABLE_DESC',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 100 }
    ],
    category: 'Instance Variables',
    categoryKey: 'CAT_INSTANCE_VARIABLES',
    target: 'object'
  },
  {
    type: 'addInstanceVariable',
    name: 'Add to instance variable',
    nameKey: 'ADD_TO_INSTANCE_VARIABLE',
    description: 'Add a value to an instance variable.',
    descriptionKey: 'ADD_TO_INSTANCE_VARIABLE_DESC',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'Instance Variables',
    categoryKey: 'CAT_INSTANCE_VARIABLES',
    target: 'object'
  },
  {
    type: 'subtractInstanceVariable',
    name: 'Subtract from instance variable',
    nameKey: 'SUBTRACT_FROM_INSTANCE_VARIABLE',
    description: 'Subtract a value from an instance variable.',
    descriptionKey: 'SUBTRACT_FROM_INSTANCE_VARIABLE_DESC',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'Instance Variables',
    categoryKey: 'CAT_INSTANCE_VARIABLES',
    target: 'object'
  },
  {
    type: 'log',
    name: 'Log to console',
    nameKey: 'LOG_TO_CONSOLE',
    description: 'Output a message to the runtime debug console.',
    descriptionKey: 'LOG_TO_CONSOLE_DESC',
    params: [
      { name: 'Message', type: 'string', defaultValue: '"Hello World"' },
      { name: 'Type', type: 'enum', options: ['info', 'warn', 'error'], defaultValue: 'info' }
    ],
    category: 'System',
    categoryKey: 'CAT_SYSTEM',
    target: 'system'
  },
  {
    type: 'callFunction',
    name: 'Call function',
    nameKey: 'CALL_FUNCTION',
    description: 'Execute the logic inside a named function.',
    descriptionKey: 'CALL_FUNCTION_DESC',
    params: [
      { name: 'Function', type: 'functionName', defaultValue: '' }
    ],
    category: 'Functions',
    categoryKey: 'CAT_FUNCTIONS',
    target: 'system'
  },
  {
    type: 'setReturnValue',
    name: 'Set return value',
    nameKey: 'SET_RETURN_VALUE',
    description: 'Set the value that this function will return to its caller.',
    params: [
      { name: 'Value', type: 'any', defaultValue: '0' }
    ],
    category: 'Functions',
    categoryKey: 'CAT_FUNCTIONS',
    target: 'system'
  },
  {
    type: 'setText',
    name: 'Set text',
    nameKey: 'SET_TEXT',
    description: 'Change the text displayed by the object.',
    params: [{ name: 'Text', type: 'string', defaultValue: '"Hello"' }],
    category: 'Text',
    categoryKey: 'CAT_TEXT',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'appendText',
    name: 'Append text',
    nameKey: 'APPEND_TEXT',
    description: 'Add text to the end of the existing text.',
    params: [{ name: 'Text', type: 'string', defaultValue: '" World"' }],
    category: 'Text',
    categoryKey: 'CAT_TEXT',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'setTextColor',
    name: 'Set text color',
    nameKey: 'SET_TEXT_COLOR',
    description: 'Change the color of the text.',
    params: [{ name: 'Color', type: 'color', defaultValue: '"#ffffff"' }],
    category: 'Text',
    categoryKey: 'CAT_TEXT',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'setFontSize',
    name: 'Set font size',
    nameKey: 'SET_FONT_SIZE',
    description: 'Change the size of the font.',
    params: [{ name: 'Size', type: 'number', defaultValue: 12 }],
    category: 'Text',
    categoryKey: 'CAT_TEXT',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'applyPhysicsForce',
    name: 'Apply force',
    nameKey: 'APPLY_FORCE',
    description: 'Apply a physical force to the object.',
    params: [
      { name: 'Force X', type: 'number', defaultValue: 0 },
      { name: 'Force Y', type: 'number', defaultValue: -0.1 }
    ],
    category: 'Physics',
    categoryKey: 'CAT_PHYSICS',
    target: 'object',
    behaviorType: 'physics'
  },
  {
    type: 'setPhysicsVelocity',
    name: 'Set velocity',
    nameKey: 'SET_VELOCITY',
    description: 'Set the linear velocity of the object.',
    params: [
      { name: 'Velocity X', type: 'number', defaultValue: 0 },
      { name: 'Velocity Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Physics',
    categoryKey: 'CAT_PHYSICS',
    target: 'object',
    behaviorType: 'physics'
  },
  {
    type: 'findPath',
    name: 'Find path to',
    nameKey: 'FIND_PATH_TO',
    description: 'Calculate a path to the target coordinates and start moving.',
    params: [
      { name: 'Target X', type: 'number', defaultValue: 0 },
      { name: 'Target Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Pathfinding',
    categoryKey: 'CAT_PATHFINDING',
    target: 'object',
    behaviorType: 'pathfinding'
  },
  {
    type: 'setPathfindingMaxSpeed',
    name: 'Set max speed',
    nameKey: 'SET_PATHFINDING_MAX_SPEED',
    description: 'Change the maximum movement speed.',
    params: [{ name: 'Speed', type: 'number', defaultValue: 200 }],
    category: 'Pathfinding',
    categoryKey: 'CAT_PATHFINDING',
    target: 'object',
    behaviorType: 'pathfinding'
  },
  {
    type: 'setPathfindingAcceleration',
    name: 'Set acceleration',
    nameKey: 'SET_PATHFINDING_ACCELERATION',
    description: 'Change the acceleration rate.',
    params: [{ name: 'Acceleration', type: 'number', defaultValue: 600 }],
    category: 'Pathfinding',
    categoryKey: 'CAT_PATHFINDING',
    target: 'object',
    behaviorType: 'pathfinding'
  },
  // Animation Actions
  {
    type: 'setAnim',
    name: 'Set animation',
    nameKey: 'SET_ANIMATION',
    description: 'Change the current animation.',
    params: [
      { name: 'Animation', type: 'string', defaultValue: '"Animation 1"' },
      { name: 'From', type: 'enum', options: ['current frame', 'beginning'], defaultValue: 'beginning' }
    ],
    category: 'Animations',
    categoryKey: 'CAT_ANIMATIONS',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'setAnimFrame',
    name: 'Set frame',
    nameKey: 'SET_ANIM_FRAME',
    description: 'Set the current animation frame index.',
    params: [{ name: 'Frame', type: 'number', defaultValue: 0 }],
    category: 'Animations',
    categoryKey: 'CAT_ANIMATIONS',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'setAnimPlaying',
    name: 'Set playing',
    nameKey: 'SET_ANIM_PLAYING',
    description: 'Start or stop the animation playback.',
    params: [{ name: 'Playing', type: 'boolean', defaultValue: true }],
    category: 'Animations',
    categoryKey: 'CAT_ANIMATIONS',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'setAnimSpeed',
    name: 'Set speed',
    nameKey: 'SET_ANIM_SPEED',
    description: 'Change the playback speed (FPS).',
    params: [{ name: 'Speed', type: 'number', defaultValue: 10 }],
    category: 'Animations',
    categoryKey: 'CAT_ANIMATIONS',
    target: 'object',
    requiredKind: 'sprite'
  },
  // Audio Actions
  {
    type: 'audioPlay',
    name: 'Play',
    nameKey: 'AUDIO_PLAY',
    description: 'Play an audio asset.',
    params: [
      { name: 'Audio', type: 'asset' },
      { name: 'Looping', type: 'boolean', defaultValue: false },
      { name: 'Volume', type: 'number', defaultValue: 100 },
      { name: 'Tag', type: 'string', defaultValue: '""' }
    ],
    category: 'Audio',
    categoryKey: 'CAT_AUDIO',
    target: 'object',
    requiredKind: 'audio'
  },
  {
    type: 'audioStop',
    name: 'Stop',
    nameKey: 'AUDIO_STOP',
    description: 'Stop playing audio with a specific tag.',
    params: [
      { name: 'Tag', type: 'string', defaultValue: '""' }
    ],
    category: 'Audio',
    categoryKey: 'CAT_AUDIO',
    target: 'object',
    requiredKind: 'audio'
  },
  {
    type: 'audioStopAll',
    name: 'Stop all',
    nameKey: 'AUDIO_STOP_ALL',
    description: 'Stop all sounds currently playing.',
    params: [],
    category: 'Audio',
    categoryKey: 'CAT_AUDIO',
    target: 'object',
    requiredKind: 'audio'
  },
  {
    type: 'audioSetVolume',
    name: 'Set volume',
    nameKey: 'AUDIO_SET_VOLUME',
    description: 'Set the volume for a specific tag.',
    params: [
      { name: 'Tag', type: 'string', defaultValue: '""' },
      { name: 'Volume', type: 'number', defaultValue: 100 }
    ],
    category: 'Audio',
    categoryKey: 'CAT_AUDIO',
    target: 'object',
    requiredKind: 'audio'
  },
  // Tween Actions
  {
    type: 'tweenProperty',
    name: 'Tween property',
    nameKey: 'TWEEN_PROPERTY',
    description: 'Smoothly change a property to a target value.',
    params: [
      { name: 'Property', type: 'enum', options: ['X', 'Y', 'Width', 'Height', 'Angle', 'Opacity'], defaultValue: 'X' },
      { name: 'End value', type: 'number', defaultValue: 100 },
      { name: 'Time', type: 'number', defaultValue: 1 },
      { name: 'Easing', type: 'enum', options: ['Linear', 'EaseIn', 'EaseOut', 'EaseInOut'], defaultValue: 'Linear' },
      { name: 'Tag', type: 'string', defaultValue: '""' }
    ],
    category: 'Tween',
    categoryKey: 'CAT_TWEEN',
    target: 'object',
    behaviorType: 'tween'
  },
  // Tilemap Actions
  {
    type: 'tilemapSetTile',
    name: 'Set tile',
    nameKey: 'TILEMAP_SET_TILE',
    description: 'Change the tile at a specific grid coordinate.',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 },
      { name: 'Tile index', type: 'number', defaultValue: 0 }
    ],
    category: 'Tilemap',
    categoryKey: 'CAT_TILEMAP',
    target: 'object',
    requiredKind: 'tilemap'
  }
];

export interface EffectDefinition {
  type: string;
  name: string;
  nameKey?: string;
  description: string;
  descriptionKey?: string;
  propertyDefinitions: PropertyDefinition[];
}

export const EFFECT_DEFINITIONS: EffectDefinition[] = [
  {
    type: 'blur',
    name: 'Blur',
    nameKey: 'EFFECT_BLUR_NAME',
    description: 'Blurs the object or layer.',
    descriptionKey: 'EFFECT_BLUR_DESC',
    propertyDefinitions: [
      { name: 'intensity', labelKey: 'INTENSITY', type: 'number', defaultValue: 5 }
    ]
  },
  {
    type: 'grayscale',
    name: 'Grayscale',
    nameKey: 'EFFECT_GRAYSCALE_NAME',
    description: 'Converts colors to shades of gray.',
    descriptionKey: 'EFFECT_GRAYSCALE_DESC',
    propertyDefinitions: [
      { name: 'amount', labelKey: 'AMOUNT', type: 'number', defaultValue: 1 }
    ]
  },
  {
    type: 'brightness-contrast',
    name: 'Brightness/Contrast',
    nameKey: 'EFFECT_BRIGHTNESS_CONTRAST_NAME',
    description: 'Adjust the brightness and contrast.',
    descriptionKey: 'EFFECT_BRIGHTNESS_CONTRAST_DESC',
    propertyDefinitions: [
      { name: 'brightness', labelKey: 'BRIGHTNESS', type: 'number', defaultValue: 1 },
      { name: 'contrast', labelKey: 'CONTRAST', type: 'number', defaultValue: 1 }
    ]
  },
  {
    type: 'hue-rotate',
    name: 'Hue Rotate',
    nameKey: 'EFFECT_HUEROTATE_NAME',
    description: 'Rotates the color hue.',
    descriptionKey: 'EFFECT_HUEROTATE_DESC',
    propertyDefinitions: [
      { name: 'angle', labelKey: 'ANGLE_LABEL', type: 'number', defaultValue: 0 }
    ]
  },
  {
    type: 'sepia',
    name: 'Sepia',
    nameKey: 'EFFECT_SEPIA_NAME',
    description: 'Applies a sepia (vintage) tone.',
    descriptionKey: 'EFFECT_SEPIA_DESC',
    propertyDefinitions: [
      { name: 'amount', labelKey: 'AMOUNT', type: 'number', defaultValue: 1 }
    ]
  }
];

export interface StateDefinition {
  id: string;
  name: string;
  description?: string;
  isInitial?: boolean;
}

export function findConditionDefinition(type: string): LogicDefinition | undefined {
  return CONDITIONS.find(c => c.type === type);
}

export function findActionDefinition(type: string): LogicDefinition | undefined {
  return ACTIONS.find(a => a.type === type);
}
