import React from 'react';
import { Project, Instance, EventBlock, ObjectTypeKind } from '../model/project';
import Matter from 'matter-js';
import { useEditorStore } from '../store/useEditorStore';
import { Play, Pause, RotateCcw, BarChart2, Maximize2, X, Settings, Bug, Clock, Monitor, Terminal, Grid } from 'lucide-react';
import { evaluateExpression, EvaluationContext } from './expressionEvaluator';
import { PLUGIN_DEFINITIONS } from '../model/definitions';
import { getEffectsFilter } from '../utils/renderUtils';
import { BEHAVIORS } from './behaviors';
import { BehaviorContext } from './behaviors/types';

interface RuntimeProps {
  project: Project;
  layoutId: string | null;
  onStop: () => void;
}

type ScalingMode = 'letterbox' | 'fit' | 'stretch' | 'integer';

/**
 * A professional runtime engine that renders and executes the game layout with advanced controls.
 */

// A* Pathfinding Helper
interface Point { x: number; y: number; }
interface Node extends Point {
  g: number; h: number; f: number;
  parent: Node | null;
}

function findPath(start: Point, end: Point, grid: boolean[][], cellSize: number): Point[] {
  const openList: Node[] = [];
  const closedList: Set<string> = new Set();
  
  const startNode: Node = { 
    x: Math.floor(start.x / cellSize), 
    y: Math.floor(start.y / cellSize), 
    g: 0, h: 0, f: 0, parent: null 
  };
  const endNode: Node = { 
    x: Math.floor(end.x / cellSize), 
    y: Math.floor(end.y / cellSize), 
    g: 0, h: 0, f: 0, parent: null 
  };

  openList.push(startNode);

  while (openList.length > 0) {
    let current = openList[0];
    let currentIndex = 0;
    openList.forEach((node, index) => {
      if (node.f < current.f) {
        current = node;
        currentIndex = index;
      }
    });

    openList.splice(currentIndex, 1);
    closedList.add(`${current.x},${current.y}`);

    if (current.x === endNode.x && current.y === endNode.y) {
      const path: Point[] = [];
      let temp: Node | null = current;
      while (temp) {
        path.push({ x: temp.x * cellSize + cellSize / 2, y: temp.y * cellSize + cellSize / 2 });
        temp = temp.parent;
      }
      return path.reverse();
    }

    const neighbors = [
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }
    ];

    for (const offset of neighbors) {
      const nx = current.x + offset.x;
      const ny = current.y + offset.y;

      if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) continue;
      if (grid[ny][nx]) continue; // Obstacle
      if (closedList.has(`${nx},${ny}`)) continue;

      const g = current.g + (offset.x !== 0 && offset.y !== 0 ? 1.414 : 1);
      const h = Math.abs(nx - endNode.x) + Math.abs(ny - endNode.y);
      const f = g + h;

      const existing = openList.find(n => n.x === nx && n.y === ny);
      if (existing && g >= existing.g) continue;

      if (!existing) {
        openList.push({ x: nx, y: ny, g, h, f, parent: current });
      } else {
        existing.g = g;
        existing.f = f;
        existing.parent = current;
      }
    }
  }

  return [];
}
export const Runtime: React.FC<RuntimeProps> = ({ project, layoutId, onStop }) => {
  const { editorState } = useEditorStore();
  const layout = project.layouts.find(l => l.id === layoutId) || project.layouts[0];
  const eventSheet = project.eventSheets.find(es => es.id === layout?.eventSheetId) || project.eventSheets[0];

  const [runtimeInstances, setRuntimeInstances] = React.useState<Instance[]>([]);
  const runtimeInstancesRef = React.useRef<Instance[]>([]);

  // Initialize instances on mount
  React.useEffect(() => {
    if (!layout) return;
    const initial = layout.instances.map(inst => {
      const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
      const ivs: Record<string, any> = {};
      
      // 1. Collect from Object Type
      ot?.instanceVariables.forEach(v => { ivs[v.name] = v.initialValue; });
      
      // 2. Collect from Families
      project.families.forEach(f => {
        if (f.objectTypeIds.includes(inst.objectTypeId)) {
          f.instanceVariables.forEach(v => {
            // Families can override or provide new variables. In C3, if names clash, it's usually an error or specific precedence.
            // Here we'll let object type variables take precedence if they have the same name.
            if (!(v.name in ivs)) {
              ivs[v.name] = v.initialValue;
            }
          });
        }
      });
      
      // Initialize Animation State
      const defaultAnim = ot?.animations?.[0];
      return { 
        ...inst, 
        properties: { 
          ...ivs, 
          ...inst.properties,
          _animId: defaultAnim?.id || '',
          _frameIdx: 0,
          _animTimer: 0,
          _animPlaying: true,
          _animSpeed: defaultAnim?.speed ?? 10
        } 
      };
    });
    runtimeInstancesRef.current = initial;
    setRuntimeInstances(initial);

    // Initialize Physics Engine
    if (!physicsEngineRef.current) {
      physicsEngineRef.current = Matter.Engine.create({
        gravity: { x: 0, y: 1 } // Standard gravity
      });
    }
    const engine = physicsEngineRef.current;
    Matter.World.clear(engine.world, false);
    physicsBodiesRef.current.clear();

    initial.forEach(inst => {
      const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
      
      // Check for physics behavior on Object Type OR its Families
      let physBehavior = ot?.behaviors.find(b => b.type === 'physics' && !b.disabled);
      if (!physBehavior) {
        const familyWithPhys = project.families.find(f => 
          f.objectTypeIds.includes(inst.objectTypeId) && 
          f.behaviors.some(b => b.type === 'physics' && !b.disabled)
        );
        physBehavior = familyWithPhys?.behaviors.find(b => b.type === 'physics' && !b.disabled);
      }
      
      if (physBehavior) {
        const props = physBehavior.properties;
        const body = Matter.Bodies.rectangle(
          inst.x + inst.width / 2, 
          inst.y + inst.height / 2, 
          inst.width, 
          inst.height, 
          {
            isStatic: !!props.isStatic,
            density: Number(props.density ?? 0.001),
            friction: Number(props.friction ?? 0.1),
            restitution: Number(props.restitution ?? 0.2),
            frictionAir: Number(props.frictionAir ?? 0.01),
            inertia: props.fixedRotation ? Infinity : undefined
          }
        );
        Matter.Body.setAngle(body, inst.angle * (Math.PI / 180));
        Matter.World.add(engine.world, body);
        physicsBodiesRef.current.set(inst.id, body);
      }
    });

  }, [layout, project.objectTypes]);

  const [fps, setFps] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showStats, setShowStats] = React.useState(true);
  const [debugDraw, setDebugDraw] = React.useState(false);
  const [scalingMode, setScalingMode] = React.useState<ScalingMode>('letterbox');
  const [timeScale, setTimeScale] = React.useState(1.0);
  const [previewZoom, setPreviewZoom] = React.useState(1.0);
  const [clipToViewport, setClipToViewport] = React.useState(true);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showGrid, setShowGrid] = React.useState(false);
  const [logs, setLogs] = React.useState<{ msg: string, time: string, type: 'info' | 'warn' | 'error' }[]>([]);
  const [showLogs, setShowLogs] = React.useState(false);
  const [fpsHistory, setFpsHistory] = React.useState<number[]>(new Array(60).fill(0));
  const runtimeVariablesRef = React.useRef<Record<string, any>>({});
  
  React.useEffect(() => {
    const vars: Record<string, any> = {};
    // 1. Project-level globals
    project.globalVariables.forEach(v => { vars[v.name] = v.initialValue; });
    
    // 2. Sheet-level globals (depth 0 variable blocks)
    project.eventSheets.forEach(es => {
      es.events.forEach(block => {
        if (block.type === 'variable' && block.variable) {
          vars[block.variable.name] = block.variable.initialValue;
        }
      });
    });
    
    runtimeVariablesRef.current = vars;
  }, [project.globalVariables, project.eventSheets]);

  const hasStartedRef = React.useRef(false);

  const addLog = (msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [{ msg, time: new Date().toLocaleTimeString(), type }, ...prev].slice(0, 50));
  };

  const frameCountRef = React.useRef(0);
  const lastFpsUpdateRef = React.useRef(performance.now());
  const lastTimeRef = React.useRef<number>(performance.now());
  
  const keysDownRef = React.useRef<Set<string>>(new Set());
  const keysPressedRef = React.useRef<Set<string>>(new Set());
  const prevOverlapsRef = React.useRef<Set<string>>(new Set()); // "id1:id2"
  
  const pointerPosRef = React.useRef({ x: 0, y: 0 });
  const pointerDownRef = React.useRef(false);
  const pointerPressedRef = React.useRef(false);
  const pointerReleasedRef = React.useRef(false);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const gamepadsRef = React.useRef<Gamepad[]>([]);
  const lastGamepadButtonsRef = React.useRef<boolean[][]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const behaviorsStateRef = React.useRef<Record<string, Record<string, any>>>({});
  const lastReturnValueRef = React.useRef<any>(0);
  const staticVariablesRef = React.useRef<Record<string, any>>({});

  // Pathfinding Refs
  const pathfindingGridRef = React.useRef<{ width: number, height: number, data: boolean[][] } | null>(null);

  // Physics Engine Refs
  const physicsEngineRef = React.useRef<Matter.Engine | null>(null);
  const physicsBodiesRef = React.useRef<Map<string, Matter.Body>>(new Map());
  const particlesRef = React.useRef<Map<string, any[]>>(new Map());
  const triggerIndexRef = React.useRef<Map<string, EventBlock[]>>(new Map());
  const playingSoundsRef = React.useRef<Map<string, HTMLAudioElement[]>>(new Map());
  const tweensRef = React.useRef<Map<string, any[]>>(new Map());
  const emitTriggerRef = React.useRef<(type: string, data?: any, currentInsts?: Instance[]) => Instance[]>(() => []);

  React.useEffect(() => {
    addLog(`Runtime initialized for layout: ${layout?.name}`, 'info');
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!keysDownRef.current.has(e.code)) {
        keysPressedRef.current.add(e.code);
        emitTriggerRef.current('keyPressed', { key: e.code });
      }
      keysDownRef.current.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current.delete(e.code);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = project.settings.viewportWidth / rect.width;
      const scaleY = project.settings.viewportHeight / rect.height;
      
      pointerPosRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };
    const onPointerDown = (e: PointerEvent) => {
      pointerDownRef.current = true;
      pointerPressedRef.current = true;
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const scaleX = project.settings.viewportWidth / rect.width;
        const scaleY = project.settings.viewportHeight / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        pointerPosRef.current = { x, y };

        emitTriggerRef.current('pointerPressed', { x, y });
        
        // Handle pointerPressedOnObject trigger
        runtimeInstancesRef.current.forEach(inst => {
           if (x >= inst.x && x <= inst.x + inst.width && y >= inst.y && y <= inst.y + inst.height) {
              emitTriggerRef.current('pointerPressedOnObject', { inst });
           }
        });
      }
    };
    const onPointerUp = () => {
      pointerDownRef.current = false;
      pointerReleasedRef.current = true;
      emitTriggerRef.current('pointerReleased', pointerPosRef.current);
    };

    const onTouchStart = (e: TouchEvent) => {
      emitTriggerRef.current('onTouchStart');
    };
    const onTouchEnd = (e: TouchEvent) => {
      emitTriggerRef.current('onTouchEnd');
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [project.settings.viewportWidth, project.settings.viewportHeight]);

  React.useEffect(() => {
    if (!layout || !eventSheet) return;

    let animationFrameId: number;

    const rebuildTriggerIndex = () => {
      const index = new Map<string, EventBlock[]>();
      const CONDITIONS = project.eventSheets.length > 0 ? (window as any).CONDITIONS || [] : []; // Fallback to global if needed
      
      const scan = (blocks: EventBlock[]) => {
        blocks.forEach(b => {
          if (b.conditions.length > 0) {
            const firstCond = b.conditions[0];
            // We need a way to check isTrigger. For now we use a hardcoded list or find it in CONDITIONS
            const triggerTypes = [
              'onStartOfLayout', 'keyPressed', 'pointerPressed', 'pointerReleased', 'pointerPressedOnObject', 
              'onCollision', 'onAnimFinished', 'onAnimFrameChanged',
              'onTouchStart', 'onTouchEnd', 'onGamepadButtonDown'
            ];
            if (triggerTypes.includes(firstCond.type)) {
              if (!index.has(firstCond.type)) index.set(firstCond.type, []);
              index.get(firstCond.type)!.push(b);
            }
          }
          if (b.children) scan(b.children);
        });
      };
      project.eventSheets.forEach(es => scan(es.events));
      triggerIndexRef.current = index;
    };
    rebuildTriggerIndex();

    const getEvaluationContext = (dt: number, instances: Instance[], pickedSets: PickedSets = {}, currentInstance?: Instance, funcParams?: any[], localVars?: Record<string, any>): EvaluationContext => {
      const objects: Record<string, any> = {};
      // 1. Object Types
      project.objectTypes.forEach(ot => {
        const picked = pickedSets[ot.id];
        let target: Instance | undefined;
        if (currentInstance && currentInstance.objectTypeId === ot.id) {
           target = currentInstance;
        } else if (picked && picked.length > 0) {
           target = instances.find(i => i.id === picked[0]);
        } else {
           target = instances.find(i => i.objectTypeId === ot.id);
        }
        
        if (target) {
          objects[ot.name] = {
            ...target,
            instanceVariables: target.properties
          };
        }
      });

      // 2. Families
      project.families.forEach(f => {
        const picked = pickedSets[f.id];
        let target: Instance | undefined;
        if (currentInstance && f.objectTypeIds.includes(currentInstance.objectTypeId)) {
           target = currentInstance;
        } else if (picked && picked.length > 0) {
           target = instances.find(i => i.id === picked[0]);
        } else {
           target = instances.find(i => f.objectTypeIds.includes(i.objectTypeId));
        }

        if (target) {
          objects[f.name] = {
            ...target,
            instanceVariables: target.properties
          };
        }
      });

    return {
      variables: runtimeVariablesRef.current,
      objects,
      system: {
        dt,
        time: (performance.now() - lastFpsUpdateRef.current) / 1000, 
        pointerX: pointerPosRef.current.x,
        pointerY: pointerPosRef.current.y
      },
      functionParams: funcParams,
      returnValue: lastReturnValueRef.current,
      localVariables: localVars
    };
  };

    type PickedSets = Record<string, string[]>; // objectTypeId -> instanceIds

    const filterInstances = (condition: any, currentPicked: Instance[], allInstances: Instance[], dt: number, pickedSets: PickedSets): Instance[] => {
      const px = pointerPosRef.current.x;
      const py = pointerPosRef.current.y;

      const checkInstance = (i: Instance): boolean => {
        const isUnderPointer = (): boolean => {
          if (!i.visible) return false;
          // Simple AABB check for now
          return px >= i.x && px <= i.x + i.width &&
                 py >= i.y && py <= i.y + i.height;
        };

        switch (condition.type) {
          case 'always': return true;
          case 'isVisible': return i.visible;
          case 'comparePosition': {
            const axis = condition.params[0];
            const operator = condition.params[1];
            const compareValue = Number(condition.params[2] ?? 0);
            const val = axis === 'x' ? i.x : i.y;
            switch (operator) {
              case '<': return val < compareValue;
              case '<=': return val <= compareValue;
              case '==': return val == compareValue;
              case '>=': return val >= compareValue;
              case '>': return val > compareValue;
              default: return false;
            }
          }
          case 'pointerOverObject': return isUnderPointer();
          case 'pointerPressedOnObject': return pointerPressedRef.current && isUnderPointer();
          case 'pointerReleasedOnObject': return pointerReleasedRef.current && isUnderPointer();
          case 'isOverlapping': {
            const otherId = condition.params[0];
            if (!otherId) return false;
            const family = project.families.find(f => f.id === otherId);
            const others = family 
              ? allInstances.filter(o => family.objectTypeIds.includes(o.objectTypeId))
              : allInstances.filter(o => o.objectTypeId === otherId);
            return others.some(o => {
              if (i.id === o.id) return false;
              return i.x < o.x + o.width &&
                     i.x + i.width > o.x &&
                     i.y < o.y + o.height &&
                     i.y + i.height > o.y;
            });
          }
          case 'onCollision': {
            const otherId = condition.params[0];
            if (!otherId) return false;
            const family = project.families.find(f => f.id === otherId);
            const others = family 
              ? allInstances.filter(o => family.objectTypeIds.includes(o.objectTypeId))
              : allInstances.filter(o => o.objectTypeId === otherId);
            return others.some(o => {
              if (i.id === o.id) return false;
              const isOverlapping = i.x < o.x + o.width &&
                                    i.x + i.width > o.x &&
                                    i.y < o.y + o.height &&
                                    i.y + i.height > o.y;
              if (!isOverlapping) return false;
              
              const pairId = i.id < o.id ? `${i.id}:${o.id}` : `${o.id}:${i.id}`;
              return !prevOverlapsRef.current.has(pairId);
            });
          }
          case 'compareInstanceVariable': {
            const varName = condition.params[0];
            const operator = condition.params[1];
            const context = getEvaluationContext(dt, [i], pickedSets, i);
            const compareValue = evaluateExpression(condition.params[2], context);
            const val = i.properties[varName];
            switch (operator) {
              case '<': return val < compareValue;
              case '<=': return val <= compareValue;
              case '==': return val == compareValue;
              case '>=': return val >= compareValue;
              case '>': return val > compareValue;
              default: return false;
            }
          }
          case 'compareText': {
            const operator = condition.params[0];
            const context = getEvaluationContext(dt, [i], pickedSets, i);
            const compareValue = String(evaluateExpression(condition.params[1], context));
            const val = String(i.properties.text || '');
            switch (operator) {
              case '==': return val === compareValue;
              case '!=': return val !== compareValue;
              case 'includes': return val.includes(compareValue);
              default: return false;
            }
          }
          case 'pickRandom': {
            return true; // Logic handled in bulk after filtering
          }
          case 'pickNearest': {
            return true; // Logic handled in bulk after filtering
          }
          case 'pickFarthest': {
            return true; // Logic handled in bulk after filtering
          }
          case 'pickByUID': {
            const targetId = String(evaluateExpression(condition.params[0], getEvaluationContext(dt, [i], pickedSets, i)));
            return i.id === targetId;
          }
          case 'physicsIsStatic': {
            const body = physicsBodiesRef.current.get(i.id);
            return body ? body.isStatic : false;
          }
          case 'isAnimPlaying': {
            const animName = String(evaluateExpression(condition.params[0], getEvaluationContext(dt, [i], pickedSets, i)));
            const ot = project.objectTypes.find(o => o.id === i.objectTypeId);
            const animId = i.properties._animId;
            const anim = ot?.animations?.find(a => a.id === animId) || ot?.animations?.[0];
            const isPlaying = i.properties._animPlaying !== false;
            if (animName && animName !== '""') {
              return isPlaying && anim?.name === animName;
            }
            return isPlaying;
          }
          case 'compareAnimFrame': {
            const operator = condition.params[0];
            const compareValue = Number(evaluateExpression(condition.params[1], getEvaluationContext(dt, [i], pickedSets, i)));
            const val = i.properties._frameIdx || 0;
            switch (operator) {
              case '<': return val < compareValue;
              case '<=': return val <= compareValue;
              case '==': return val == compareValue;
              case '>=': return val >= compareValue;
              case '>': return val > compareValue;
              default: return false;
            }
          }
          case 'onAnimFinished': {
            // Triggers are handled in the tick loop via emitTriggerRef
            return true; 
          }
          default: return true;
        }
      };

      const baseFiltered = condition.inverted 
        ? currentPicked.filter(i => !checkInstance(i)) 
        : currentPicked.filter(i => checkInstance(i));

      if (baseFiltered.length === 0) return [];

      // Post-process for "Pick Single" type conditions
      switch (condition.type) {
        case 'pickRandom': {
          const idx = Math.floor(Math.random() * baseFiltered.length);
          return [baseFiltered[idx]];
        }
        case 'pickByIndex': {
          const context = getEvaluationContext(dt, allInstances, {});
          const targetIdx = Math.floor(Number(evaluateExpression(condition.params[0], context) ?? 0));
          if (targetIdx >= 0 && targetIdx < baseFiltered.length) {
            return [baseFiltered[targetIdx]];
          }
          return [];
        }
        case 'pickNearest': {
          const context = getEvaluationContext(dt, allInstances, {});
          const tx = Number(evaluateExpression(condition.params[0], context) ?? 0);
          const ty = Number(evaluateExpression(condition.params[1], context) ?? 0);
          let nearest = baseFiltered[0];
          let minDist = Math.pow(nearest.x - tx, 2) + Math.pow(nearest.y - ty, 2);
          for (let j = 1; j < baseFiltered.length; j++) {
            const dist = Math.pow(baseFiltered[j].x - tx, 2) + Math.pow(baseFiltered[j].y - ty, 2);
            if (dist < minDist) {
              minDist = dist;
              nearest = baseFiltered[j];
            }
          }
          return [nearest];
        }
        case 'pickFarthest': {
          const context = getEvaluationContext(dt, allInstances, {});
          const tx = Number(evaluateExpression(condition.params[0], context) ?? 0);
          const ty = Number(evaluateExpression(condition.params[1], context) ?? 0);
          let farthest = baseFiltered[0];
          let maxDist = Math.pow(farthest.x - tx, 2) + Math.pow(farthest.y - ty, 2);
          for (let j = 1; j < baseFiltered.length; j++) {
            const dist = Math.pow(baseFiltered[j].x - tx, 2) + Math.pow(baseFiltered[j].y - ty, 2);
            if (dist > maxDist) {
              maxDist = dist;
              farthest = baseFiltered[j];
            }
          }
          return [farthest];
        }
        default: return baseFiltered;
      }
    };

    const processBlock = (block: EventBlock, instances: Instance[], parentPickedSets: PickedSets, dt: number, lastEventResult: boolean, isExplicitCall: boolean = false, funcParams?: any[], localVars: Record<string, any> = {}, localVarsMeta: Record<string, { blockId: string, isStatic: boolean }> = {}, depth: number = 0): { instances: Instance[], result: boolean } => {
      if (block.disabled) return { instances, result: false };
      if (block.type === 'function' && !isExplicitCall) return { instances, result: false };

      if (block.type === 'variable' && block.variable) {
        if (depth === 0) return { instances, result: true }; // Global variables handled at start
        
        const varName = block.variable.name;
        localVarsMeta[varName] = { blockId: block.id, isStatic: !!block.variable.isStatic };
        
        if (block.variable.isStatic) {
          if (!(block.id in staticVariablesRef.current)) {
            const context = getEvaluationContext(dt, instances, {}, undefined, funcParams, localVars);
            staticVariablesRef.current[block.id] = evaluateExpression(block.variable.initialValue, context);
          }
          localVars[varName] = staticVariablesRef.current[block.id];
        } else {
          const context = getEvaluationContext(dt, instances, {}, undefined, funcParams, localVars);
          localVars[varName] = evaluateExpression(block.variable.initialValue, context);
        }
        return { instances, result: true };
      }

      let currentPickedSets: PickedSets = { ...parentPickedSets };
      let allPass = !block.isOrBlock; // For AND blocks, assume pass and fail on first fail. For OR blocks, assume fail and pass on first pass.
      
      const orBlockPickedSets: PickedSets[] = [];
      const passingConditionIndices: number[] = [];

      for (let i = 0; i < block.conditions.length; i++) {
        const condition = block.conditions[i]!;
        const otid = condition.targetObjectTypeId;
        
        // OR blocks start each condition with the parent's picked set
        const conditionPickedSets: PickedSets = block.isOrBlock ? { ...parentPickedSets } : { ...currentPickedSets };

        if (!otid) {
          let result = true;
          const context = getEvaluationContext(dt, instances, conditionPickedSets, undefined, funcParams, localVars);
          switch (condition.type) {
            case 'always': result = true; break;
            case 'onStartOfLayout': result = !hasStartedRef.current; break;
            case 'else': result = !lastEventResult; break;
            case 'compareGlobalVariable': {
              const varName = condition.params[0];
              const operator = condition.params[1];
              const compareValue = evaluateExpression(condition.params[2], context);
              
              // Check local variables first, then globals
              const val = (localVars && varName in localVars) ? localVars[varName] : runtimeVariablesRef.current[varName];
              
              switch (operator) {
                case '<': result = val < compareValue; break;
                case '<=': result = val <= compareValue; break;
                case '==': result = val == compareValue; break;
                case '>=': result = val >= compareValue; break;
                case '>': result = val > compareValue; break;
                default: result = false;
              }
              break;
            }
            case 'keyDown': result = keysDownRef.current.has(condition.params[0]); break;
            case 'keyPressed': result = keysPressedRef.current.has(condition.params[0]); break;
            case 'pointerDown': result = pointerDownRef.current; break;
            case 'pointerPressed': result = pointerPressedRef.current; break;
            case 'pointerReleased': result = pointerReleasedRef.current; break;
            case 'pickAll': {
              const pickOtid = condition.params[0];
              if (pickOtid) {
                const family = project.families.find(f => f.id === pickOtid);
                if (family) {
                  conditionPickedSets[pickOtid] = instances.filter(i => family.objectTypeIds.includes(i.objectTypeId)).map(i => i.id);
                } else {
                  conditionPickedSets[pickOtid] = instances.filter(i => i.objectTypeId === pickOtid).map(i => i.id);
                }
                result = conditionPickedSets[pickOtid].length > 0;
              } else result = false;
              break;
            }
            case 'pickRandom': {
               const pickOtid = condition.params[0];
               if (pickOtid && instances.length > 0) {
                 const typeInsts = instances.filter(i => i.objectTypeId === pickOtid);
                 if (typeInsts.length > 0) {
                    const rand = typeInsts[Math.floor(Math.random() * typeInsts.length)];
                    conditionPickedSets[pickOtid] = [rand.id];
                    result = true;
                 } else result = false;
               } else result = false;
               break;
            }
          }
          if (condition.inverted) result = !result;
          
          if (block.isOrBlock) {
            if (result) {
              allPass = true;
              orBlockPickedSets.push(conditionPickedSets);
              passingConditionIndices.push(i);
            }
          } else {
            if (!result) { allPass = false; break; }
            currentPickedSets = conditionPickedSets;
          }
          continue;
        }

        const context = getEvaluationContext(dt, instances, conditionPickedSets, undefined, funcParams, localVars);

        if (condition.type === 'setPhysicsGravity') {
           if (physicsEngineRef.current) {
             const gx = Number(evaluateExpression(condition.params[0], context) ?? 0);
             const gy = Number(evaluateExpression(condition.params[1], context) ?? 1);
             physicsEngineRef.current.gravity.x = gx;
             physicsEngineRef.current.gravity.y = gy;
           }
           if (block.isOrBlock) { allPass = true; passingConditionIndices.push(i); }
           continue;
        }

        if (!conditionPickedSets[otid]) {
          const family = project.families.find(f => f.id === otid);
          if (family) {
            conditionPickedSets[otid] = instances.filter(i => family.objectTypeIds.includes(i.objectTypeId)).map(i => i.id);
          } else {
            conditionPickedSets[otid] = instances.filter(i => i.objectTypeId === otid).map(i => i.id);
          }
        }

        const pickedInstances = instances.filter(i => conditionPickedSets[otid].includes(i.id));
        const filtered = filterInstances(condition, pickedInstances, instances, dt, conditionPickedSets);
        const result = filtered.length > 0;

        if (block.isOrBlock) {
          if (result) {
            allPass = true;
            conditionPickedSets[otid] = filtered.map(i => i.id);
            orBlockPickedSets.push(conditionPickedSets);
            passingConditionIndices.push(i);
          }
        } else {
          if (!result) { allPass = false; break; }
          conditionPickedSets[otid] = filtered.map(i => i.id);
          currentPickedSets = conditionPickedSets;
        }
      }
      
      // Post-process OR block picking (Union of all passing conditions)
      if (block.isOrBlock && allPass) {
        currentPickedSets = {};
        // Start with parent's picked set for all objects involved in the OR block
        const involvedOtids = new Set<string>();
        block.conditions.forEach(c => { if (c.targetObjectTypeId) involvedOtids.add(c.targetObjectTypeId); });
        
        involvedOtids.forEach(otid => {
          const unionIds = new Set<string>();
          orBlockPickedSets.forEach(cps => {
            if (cps[otid]) cps[otid].forEach(id => unionIds.add(id));
          });
          currentPickedSets[otid] = Array.from(unionIds);
        });

        // For objects NOT involved in any condition, keep parent's picked state if it existed
        Object.keys(parentPickedSets).forEach(otid => {
          if (!currentPickedSets[otid]) currentPickedSets[otid] = parentPickedSets[otid];
        });
      }
      
      if (!allPass) return { instances, result: false };

      let nextInstances = [...instances];

      // Pre-initialize local variables defined in this block's children
      // so they are available to the block's own actions
      if (block.children) {
        block.children.forEach(child => {
          if (child.type === 'variable' && child.variable) {
            const varName = child.variable.name;
            const context = getEvaluationContext(dt, nextInstances, currentPickedSets, undefined, funcParams, localVars);
            
            localVarsMeta[varName] = { blockId: child.id, isStatic: !!child.variable.isStatic };
            
            if (child.variable.isStatic) {
              if (!(child.id in staticVariablesRef.current)) {
                staticVariablesRef.current[child.id] = evaluateExpression(child.variable.initialValue, context);
              }
              localVars[varName] = staticVariablesRef.current[child.id];
            } else {
              localVars[varName] = evaluateExpression(child.variable.initialValue, context);
            }
          }
        });
      }

      block.actions.forEach(action => {
        const otid = action.targetObjectTypeId;
        
        const context = getEvaluationContext(dt, nextInstances, currentPickedSets, undefined, funcParams, localVars);
        const evalParam = (index: number) => evaluateExpression(action.params[index], context);

        const isSystemAction = !otid || action.type === 'callFunction' || action.type === 'setReturnValue' || action.type === 'setVariable' || action.type === 'addVariable' || action.type === 'log';
        if (!isSystemAction && !otid) return;

        if (action.type === 'log') {
          const msg = String(evalParam(0));
          const type = (action.params[1] || 'info') as any;
          addLog(msg, type);
          return;
        }

        if (action.type === 'callFunction') {
          const rawParam = action.params[0];
          const evaluatedName = String(evaluateExpression(rawParam, context)).trim();
          
          // Collect parameters for the function call
          const callParams = action.params.slice(1).map(p => evaluateExpression(p, context));

          addLog(`CALL FUNCTION: "${evaluatedName}" (params: ${callParams.join(', ')})`, 'info');
          
          const allSheets = project.eventSheets;
          let foundCount = 0;
          
          allSheets.forEach(es => {
            const findAndCall = (blocks: EventBlock[]) => {
              blocks.forEach(b => {
                if (b.type === 'function' && b.functionName?.trim() === evaluatedName) {
                  addLog(`Found function "${evaluatedName}" in sheet "${es.name}", executing...`, 'info');
                  const initialPicked = b.functionPassPicking ? currentPickedSets : {};
                  const res = processBlock(b, nextInstances, initialPicked, dt, true, true, callParams, {}, {}, 0); // Reset depth for function call
                  nextInstances = res.instances;
                  foundCount++;
                }
                if (b.children.length > 0) findAndCall(b.children);
              });
            };
            findAndCall(es.events);
          });
          
          if (foundCount === 0) {
            addLog(`ERROR: Function "${evaluatedName}" not found in any event sheet!`, 'error');
          } else {
            addLog(`Function "${evaluatedName}" executed ${foundCount} time(s).`, 'info');
          }
          return;
        }

        if (action.type === 'setReturnValue') {
          const val = evaluateExpression(action.params[0], context);
          lastReturnValueRef.current = val;
          addLog(`SET RETURN VALUE: ${val}`, 'info');
          return;
        }

        let pickedIds = currentPickedSets[otid!];
        if (!pickedIds) {
          const family = project.families.find(f => f.id === otid);
          if (family) {
            pickedIds = nextInstances.filter(i => family.objectTypeIds.includes(i.objectTypeId)).map(i => i.id);
          } else {
            pickedIds = nextInstances.filter(i => i.objectTypeId === otid).map(i => i.id);
          }
        }

        if (action.type === 'destroy') {
          const count = pickedIds.length;
          const initialCount = nextInstances.length;
          nextInstances = nextInstances.filter(inst => !pickedIds.includes(inst.id));
          addLog(`ACTION: Destroy. ObjectTypeId: ${otid}. Picked: ${count}. Total before: ${initialCount}. Total after: ${nextInstances.length}. IDs: ${pickedIds.join(',')}`, 'info');
          currentPickedSets[otid!] = [];
          return;
        }

        if (action.type === 'createInstance') {
            const spawn = (instForContext?: Instance) => {
              const context = getEvaluationContext(dt, nextInstances, currentPickedSets, instForContext, funcParams, localVars);
              
              // 1. Resolve Object Type (Try raw ID first, then evaluate)
              const rawSpawnTypeId = action.params[0];
              let objectType = project.objectTypes.find(ot => ot.id === rawSpawnTypeId);
              if (!objectType) {
                const evalSpawnTypeId = String(evaluateExpression(rawSpawnTypeId, context));
                objectType = project.objectTypes.find(ot => ot.id === evalSpawnTypeId || ot.name === evalSpawnTypeId);
                if (!objectType) {
                  const family = project.families.find(f => f.id === evalSpawnTypeId || f.name === evalSpawnTypeId);
                  if (family && family.objectTypeIds.length > 0) {
                    objectType = project.objectTypes.find(ot => ot.id === family.objectTypeIds[0]);
                  }
                }
              }
              if (!objectType) return;

              // 2. Resolve Layer (Try raw ID first, then evaluate)
              const rawLayer = action.params[3];
              let targetLayerId = '';
              
              if (rawLayer && layout.layers.some(l => l.id === rawLayer)) {
                targetLayerId = rawLayer;
              } else {
                const evalLayer = evaluateExpression(rawLayer, context);
                if (typeof evalLayer === 'number') {
                  targetLayerId = layout.layers[Math.floor(evalLayer)]?.id || layout.layers[0]?.id;
                } else if (evalLayer) {
                  const layerStr = String(evalLayer);
                  const layerById = layout.layers.find(l => l.id === layerStr);
                  if (layerById) {
                    targetLayerId = layerById.id;
                  } else {
                    const layerByName = layout.layers.find(l => l.name === layerStr);
                    targetLayerId = layerByName ? layerByName.id : (layout.layers.find(l => l.visible && !l.locked)?.id || layout.layers[0]?.id);
                  }
                } else {
                  targetLayerId = layout.layers.find(l => l.visible && !l.locked)?.id || layout.layers[0]?.id;
                }
              }

              const spawnX = Number(evaluateExpression(action.params[1], context) ?? 0);
              const spawnY = Number(evaluateExpression(action.params[2], context) ?? 0);
              
              const pluginDef = PLUGIN_DEFINITIONS.find(p => p.kind === objectType.kind);
              const initialProps: Record<string, any> = {};
              
              // 1. Load plugin defaults
              pluginDef?.propertyDefinitions.forEach(p => { initialProps[p.name] = p.defaultValue; });
              
              // 2. Load ObjectType overrides
              if (objectType.properties) {
                Object.assign(initialProps, objectType.properties);
              }

              const newInstId = `rt-${Date.now()}-${Math.random()}`;
              const newInst: Instance = {
                id: newInstId,
                objectTypeId: objectType.id,
                layerId: targetLayerId,
                x: spawnX, y: spawnY,
                width: objectType.defaultWidth, height: objectType.defaultHeight,
                angle: 0, opacity: 1, visible: true, properties: initialProps,
                effects: []
              };
              
              // 3. Initialize Behaviors State
              if (!behaviorsStateRef.current[newInstId]) behaviorsStateRef.current[newInstId] = {};
              objectType.behaviors?.forEach(behavior => {
                behaviorsStateRef.current[newInstId][behavior.id] = { ...behavior.properties };
              });

              // 4. Initialize Physics Body
              const physBehavior = objectType.behaviors.find(b => b.type === 'physics' && !b.disabled);
              if (physBehavior && physicsEngineRef.current) {
                const props = { ...physBehavior.properties, ...initialProps };
                const body = Matter.Bodies.rectangle(
                  spawnX + newInst.width / 2,
                  spawnY + newInst.height / 2,
                  newInst.width,
                  newInst.height,
                  {
                    isStatic: !!props.isStatic,
                    density: Number(props.density ?? 0.001),
                    friction: Number(props.friction ?? 0.1),
                    restitution: Number(props.restitution ?? 0.2),
                    frictionAir: Number(props.frictionAir ?? 0.01),
                    inertia: props.fixedRotation ? Infinity : undefined
                  }
                );
                Matter.Body.setAngle(body, newInst.angle * (Math.PI / 180));
                Matter.World.add(physicsEngineRef.current.world, body);
                physicsBodiesRef.current.set(newInstId, body);
              }

              nextInstances.push(newInst);
              addLog(`SPAWN: Created instance of "${objectType.name}" at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)}) on layer "${targetLayerId}"`, 'info');
            };

          if (otid && currentPickedSets[otid] && currentPickedSets[otid].length > 0) {
            currentPickedSets[otid].forEach(id => {
              const inst = nextInstances.find(i => i.id === id);
              if (inst) spawn(inst);
            });
          } else spawn();
          return;
        }

        nextInstances = nextInstances.map(inst => {
          if (!pickedIds.includes(inst.id)) return inst;
          const context = getEvaluationContext(dt, nextInstances, currentPickedSets, inst, funcParams, localVars);
          const evalParam = (index: number) => evaluateExpression(action.params[index], context);

          switch (action.type) {
            case 'setPosition': return { ...inst, x: Number(evalParam(0) ?? inst.x), y: Number(evalParam(1) ?? inst.y) };
            case 'moveBy': return { ...inst, x: inst.x + Number(evalParam(0) ?? 0), y: inst.y + Number(evalParam(1) ?? 0) };
            case 'setVisible': return { ...inst, visible: !!evalParam(0) };
            case 'setInstanceVariable': {
              const varName = action.params[0];
              const val = evalParam(1);
              return { ...inst, properties: { ...inst.properties, [varName]: val } };
            }
            case 'addInstanceVariable': {
              const varName = action.params[0];
              const val = evalParam(1);
              return { ...inst, properties: { ...inst.properties, [varName]: (Number(inst.properties[varName]) || 0) + Number(val) } };
            }
            case 'subtractInstanceVariable': {
              const varName = action.params[0];
              const val = evalParam(1);
              return { ...inst, properties: { ...inst.properties, [varName]: (Number(inst.properties[varName]) || 0) - Number(val) } };
            }
            case 'setVariable': {
              const varName = action.params[0];
              const val = evaluateExpression(action.params[1], context);
              if (localVars && varName in localVars) {
                localVars[varName] = val;
                const meta = localVarsMeta[varName];
                if (meta?.isStatic) staticVariablesRef.current[meta.blockId] = val;
              } else {
                runtimeVariablesRef.current[varName] = val;
              }
              return inst;
            }
            case 'addVariable': {
              const varName = action.params[0];
              const val = evaluateExpression(action.params[1], context);
              if (localVars && varName in localVars) {
                localVars[varName] = (Number(localVars[varName]) || 0) + Number(val);
                const meta = localVarsMeta[varName];
                if (meta?.isStatic) staticVariablesRef.current[meta.blockId] = localVars[varName];
              } else {
                runtimeVariablesRef.current[varName] = (runtimeVariablesRef.current[varName] || 0) + Number(val);
              }
              return inst;
            }
            case 'subtractVariable': {
              const varName = action.params[0];
              const val = evaluateExpression(action.params[1], context);
              if (localVars && varName in localVars) {
                localVars[varName] = (Number(localVars[varName]) || 0) - Number(val);
                const meta = localVarsMeta[varName];
                if (meta?.isStatic) staticVariablesRef.current[meta.blockId] = localVars[varName];
              } else {
                runtimeVariablesRef.current[varName] = (runtimeVariablesRef.current[varName] || 0) - Number(val);
              }
              return inst;
            }
            case 'setText': return { ...inst, properties: { ...inst.properties, text: String(evalParam(0)) } };
            case 'appendText': return { ...inst, properties: { ...inst.properties, text: (inst.properties.text || '') + String(evalParam(0)) } };
            case 'setTextColor': return { ...inst, properties: { ...inst.properties, color: String(evalParam(0)) } };
            case 'setFontSize': return { ...inst, properties: { ...inst.properties, fontSize: Number(evalParam(0)) } };
            case 'applyPhysicsForce': {
              const body = physicsBodiesRef.current.get(inst.id);
              if (body) {
                const fx = Number(evalParam(0) ?? 0);
                const fy = Number(evalParam(1) ?? 0);
                Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
              }
              return inst;
            }
            case 'setPhysicsVelocity': {
              const body = physicsBodiesRef.current.get(inst.id);
              if (body) {
                const vx = Number(evalParam(0) ?? 0);
                const vy = Number(evalParam(1) ?? 0);
                Matter.Body.setVelocity(body, { x: vx, y: vy });
              }
              return inst;
            }
            case 'moveToLayer': {
              const targetLayerNameOrId = String(evalParam(0));
              const targetLayer = layout.layers.find(l => l.id === targetLayerNameOrId || l.name === targetLayerNameOrId);
              if (targetLayer) {
                return { ...inst, layerId: targetLayer.id };
              }
              return inst;
            }
            case 'moveToTop': {
              // We'll handle this by reordering in nextInstances after the map
              (inst as any)._moveToTop = true;
              return inst;
            }
            case 'moveToBottom': {
              (inst as any)._moveToBottom = true;
              return inst;
            }
            case 'findPath': {
              const tx = Number(evalParam(0) ?? 0);
              const ty = Number(evalParam(1) ?? 0);
              const cellSize = 32; // Default or from behavior props
              
              // Build grid (Optimization: this should ideally be done once per frame if solids changed)
              const layoutW = layout.width;
              const layoutH = layout.height;
              const cols = Math.ceil(layoutW / cellSize);
              const rows = Math.ceil(layoutH / cellSize);
              const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
              
              const solids = nextInstances.filter(o => {
                const ot_o = project.objectTypes.find(type => type.id === o.objectTypeId);
                return ot_o?.behaviors.some(b => b.type === 'solid' && !b.disabled);
              });

              solids.forEach(s => {
                const startX = Math.floor(s.x / cellSize);
                const startY = Math.floor(s.y / cellSize);
                const endX = Math.floor((s.x + s.width) / cellSize);
                const endY = Math.floor((s.y + s.height) / cellSize);
                for (let y = startY; y <= endY && y < rows; y++) {
                  for (let x = startX; x <= endX && x < cols; x++) {
                    if (x >= 0 && y >= 0) grid[y][x] = true;
                  }
                }
              });

              const behavior = project.objectTypes.find(ot => ot.id === inst.objectTypeId)?.behaviors.find(b => b.type === 'pathfinding');
              if (behavior) {
                const state = behaviorsStateRef.current[inst.id]?.[behavior.id];
                if (state) {
                  state.path = findPath({ x: inst.x + inst.width/2, y: inst.y + inst.height/2 }, { x: tx, y: ty }, grid, cellSize);
                }
              }
              return inst;
            }
            case 'setPathfindingMaxSpeed': {
              const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
              const behavior = ot?.behaviors.find(b => b.type === 'pathfinding');
              if (behavior) {
                if (!behaviorsStateRef.current[inst.id]) behaviorsStateRef.current[inst.id] = {};
                if (!behaviorsStateRef.current[inst.id][behavior.id]) behaviorsStateRef.current[inst.id][behavior.id] = { ...behavior.properties };
                behaviorsStateRef.current[inst.id][behavior.id].maxSpeed = Number(evalParam(0) ?? 200);
              }
              return inst;
            }
            case 'setAnim': {
              const animName = String(evalParam(0));
              const from = action.params[1];
              const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
              const anim = ot?.animations?.find(a => a.name === animName);
              if (anim) {
                return { 
                  ...inst, 
                  properties: { 
                    ...inst.properties, 
                    _animId: anim.id, 
                    _frameIdx: from === 'beginning' ? 0 : inst.properties._frameIdx,
                    _animTimer: 0,
                    _animPlaying: true,
                    _animSpeed: anim.speed
                  } 
                };
              }
              return inst;
            }
            case 'setAnimFrame': {
              return { ...inst, properties: { ...inst.properties, _frameIdx: Number(evalParam(0) ?? 0), _animTimer: 0 } };
            }
            case 'setAnimPlaying': {
              return { ...inst, properties: { ...inst.properties, _animPlaying: !!evalParam(0) } };
            }
            case 'setAnimSpeed': {
              return { ...inst, properties: { ...inst.properties, _animSpeed: Number(evalParam(0) ?? 10) } };
            }
            // --- Audio Actions ---
            case 'audioPlay': {
              const assetId = String(evalParam(0));
              const looping = !!evalParam(1);
              const volume = Number(evalParam(2) ?? 100) / 100;
              const tag = String(evalParam(3) ?? "");

              const asset = project.assets.find(a => a.id === assetId || a.name === assetId);
              if (asset && asset.data) {
                const audio = new Audio(asset.data);
                audio.loop = looping;
                audio.volume = Math.max(0, Math.min(1, volume));
                audio.play().catch(e => console.warn('Audio play failed:', e));
                
                const tagKey = tag;
                if (!playingSoundsRef.current.has(tagKey)) playingSoundsRef.current.set(tagKey, []);
                playingSoundsRef.current.get(tagKey)!.push(audio);
                
                audio.onended = () => {
                  const list = playingSoundsRef.current.get(tagKey);
                  if (list) {
                    const idx = list.indexOf(audio);
                    if (idx !== -1) list.splice(idx, 1);
                  }
                };
              }
              return inst;
            }
            case 'audioStop': {
              const tag = String(evalParam(0) ?? "");
              const list = playingSoundsRef.current.get(tag);
              if (list) {
                list.forEach(a => { a.pause(); a.src = ""; });
                playingSoundsRef.current.delete(tag);
              }
              return inst;
            }
            case 'audioStopAll': {
              playingSoundsRef.current.forEach(list => {
                list.forEach(a => { a.pause(); a.src = ""; });
              });
              playingSoundsRef.current.clear();
              return inst;
            }
            case 'audioSetVolume': {
              const tag = String(evalParam(0) ?? "");
              const volume = Number(evalParam(1) ?? 100) / 100;
              const list = playingSoundsRef.current.get(tag);
              if (list) {
                list.forEach(a => { a.volume = Math.max(0, Math.min(1, volume)); });
              }
              return inst;
            }
            case 'tweenProperty': {
              const prop = String(evalParam(0));
              const endVal = Number(evalParam(1));
              const duration = Number(evalParam(2));
              const easing = String(evalParam(3));
              const tag = String(evalParam(4) ?? "");
              
              if (!tweensRef.current.has(inst.id)) tweensRef.current.set(inst.id, []);
              const objTweens = tweensRef.current.get(inst.id)!;
              
              const startVal = (inst as any)[prop.toLowerCase()] ?? inst.properties[prop.toLowerCase()] ?? 0;
              
              objTweens.push({
                prop: prop.toLowerCase(),
                startVal,
                endVal,
                duration,
                elapsed: 0,
                easing,
                tag
              });
              return inst;
            }
            case 'tilemapSetTile': {
              const tx = Math.floor(Number(evalParam(0)));
              const ty = Math.floor(Number(evalParam(1)));
              const tileIdx = Number(evalParam(2));
              
              const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
              if (ot && ot.tilemapData) {
                if (tx >= 0 && tx < ot.tilemapData.width && ty >= 0 && ty < ot.tilemapData.height) {
                  if (ot.tilemapData.tiles[ty][tx] !== tileIdx) {
                    ot.tilemapData = { 
                      ...ot.tilemapData, 
                      tiles: ot.tilemapData.tiles.map((row, rIdx) => 
                        rIdx === ty ? row.map((t, cIdx) => cIdx === tx ? tileIdx : t) : row
                      )
                    };
                  }
                }
              }
              return inst;
            }
            default: return inst;
          }
        });
      });

      // Handle Z-order changes
      const toTop: string[] = [];
      const toBottom: string[] = [];
      nextInstances.forEach(inst => {
        if ((inst as any)._moveToTop) {
           toTop.push(inst.id);
           delete (inst as any)._moveToTop;
        }
        if ((inst as any)._moveToBottom) {
           toBottom.push(inst.id);
           delete (inst as any)._moveToBottom;
        }
      });

      if (toTop.length > 0 || toBottom.length > 0) {
         const others = nextInstances.filter(i => !toTop.includes(i.id) && !toBottom.includes(i.id));
         const topInsts = nextInstances.filter(i => toTop.includes(i.id));
         const bottomInsts = nextInstances.filter(i => toBottom.includes(i.id));
         // Order: Bottoms, Others, Tops
         nextInstances = [...bottomInsts, ...others, ...topInsts];
      }

      let currentResult = allPass;
      block.children.forEach(child => {
        // Skip variable blocks as they were already initialized above
        if (child.type === 'variable') return;
        const childRes = processBlock(child, nextInstances, currentPickedSets, dt, currentResult, isExplicitCall, funcParams, localVars, localVarsMeta, depth + 1);
        nextInstances = childRes.instances;
      });

      return { instances: nextInstances, result: allPass };
    };

    emitTriggerRef.current = (type: string, data?: any, currentInsts?: Instance[]) => {
      const blocks = triggerIndexRef.current.get(type);
      if (!blocks) return currentInsts || runtimeInstancesRef.current;

      let nextInsts = [...(currentInsts || runtimeInstancesRef.current)];

      blocks.forEach(block => {
        let initialPickedSets: PickedSets = {};
        const firstCond = block.conditions[0];
        const otid = firstCond.targetObjectTypeId;

        if (type === 'onCollision' && data) {
           if (otid) {
              const isFamily = project.families.some(f => f.id === otid);
              const family = project.families.find(f => f.id === otid);
              // Ensure instA is the one matching otid (or family)
              let instA = data.instA;
              let instB = data.instB;
              
              const matchesA = isFamily ? family?.objectTypeIds.includes(instA.objectTypeId) : instA.objectTypeId === otid;
              if (!matchesA) { [instA, instB] = [instB, instA]; }

              initialPickedSets[otid] = [instA.id];
              const otherOtid = firstCond.params[0];
              if (otherOtid) {
                 initialPickedSets[otherOtid] = [instB.id];
              }
           }
        } else if (type === 'onAnimFinished' && data) {
            if (otid) {
              const ot = project.objectTypes.find(o => o.id === otid);
              if (data.inst.objectTypeId === otid || (ot && data.inst.objectTypeId === otid)) {
                // Filter by animation name if provided in condition
                const animName = firstCond.params[0];
                if (!animName || animName === '""' || animName === data.animation) {
                   initialPickedSets[otid] = [data.inst.id];
                }
              }
            }
        } else if (type === 'onAnimFrameChanged' && data) {
            if (otid && data.inst.objectTypeId === otid) {
               initialPickedSets[otid] = [data.inst.id];
            }
        }

        const res = processBlock(block, nextInsts, initialPickedSets, 0, true);
        nextInsts = res.instances;
      });
      
      runtimeInstancesRef.current = nextInsts;
      setRuntimeInstances(nextInsts);
      return nextInsts;
    };

    const tick = () => {
      if (isPaused) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const rawDt = (now - lastTimeRef.current) / 1000;
      const dt = rawDt * timeScale;
      lastTimeRef.current = now;

      frameCountRef.current++;
      
      // Update Gamepads
      const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      gamepadsRef.current = gps.filter(Boolean) as Gamepad[];
      
      gamepadsRef.current.forEach((gp, idx) => {
        if (!lastGamepadButtonsRef.current[idx]) lastGamepadButtonsRef.current[idx] = [];
        gp.buttons.forEach((btn, bIdx) => {
          if (btn.pressed && !lastGamepadButtonsRef.current[idx][bIdx]) {
            emitTriggerRef.current('onGamepadButtonDown', { gamepad: idx, button: bIdx });
          }
          lastGamepadButtonsRef.current[idx][bIdx] = btn.pressed;
        });
      });

      if (now - lastFpsUpdateRef.current > 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current));
        setFps(currentFps);
        setFpsHistory(prev => [...prev.slice(1), currentFps]);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      let nextInstances = [...runtimeInstancesRef.current];

      // 0. Step Physics
      if (physicsEngineRef.current) {
        Matter.Engine.update(physicsEngineRef.current, dt * 1000);
        nextInstances = nextInstances.map(inst => {
          const body = physicsBodiesRef.current.get(inst.id);
          if (body && !body.isStatic) {
            return {
              ...inst,
              x: body.position.x - inst.width / 2,
              y: body.position.y - inst.height / 2,
              angle: body.angle * (180 / Math.PI)
            };
          }
          return inst;
        });
      }

      // 0.5 Update Pathfinding Grid (if needed - optimization: only on start or when solids move)
      const solids = nextInstances.filter(o => {
          const ot_o = project.objectTypes.find(type => type.id === o.objectTypeId);
          return ot_o?.behaviors.some(b => b.type === 'solid' && !b.disabled);
      });

      // 1. Process Behaviors
      nextInstances = nextInstances.map(inst => {
        const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
        if (!ot) return inst;

        // Collect all behaviors (ObjectType + Families)
        const allBehaviors = [...(ot.behaviors || [])];
        project.families.forEach(f => {
          if (f.objectTypeIds.includes(inst.objectTypeId)) {
            allBehaviors.push(...f.behaviors);
          }
        });

        if (allBehaviors.length === 0) return inst;

        let updatedInst = { ...inst };
        allBehaviors.forEach(behavior => {
          if (behavior.disabled) return;
          if (!behaviorsStateRef.current[inst.id]) behaviorsStateRef.current[inst.id] = {};
          if (!behaviorsStateRef.current[inst.id][behavior.id]) {
            behaviorsStateRef.current[inst.id][behavior.id] = { ...behavior.properties };
          }
          const state = behaviorsStateRef.current[inst.id][behavior.id];
          const props = behavior.properties;

          const behaviorImpl = BEHAVIORS[behavior.type];
          if (behaviorImpl) {
            const context: BehaviorContext = {
              dt,
              project,
              layout,
              instances: nextInstances,
              keysDown: keysDownRef.current,
              keysPressed: keysPressedRef.current,
              pointerPos: pointerPosRef.current,
              behaviorsState: state
            };
            const result = behaviorImpl.tick(updatedInst, props, context);
            updatedInst = result.updatedInstance;
            behaviorsStateRef.current[inst.id][behavior.id] = result.behaviorState;
          }
        });
        return updatedInst;
      });

      // 1.1 Process Tweens
      nextInstances = nextInstances.map(inst => {
        const objTweens = tweensRef.current.get(inst.id);
        if (!objTweens || objTweens.length === 0) return inst;

        let updatedInst = { ...inst };
        const stillActive: any[] = [];

        objTweens.forEach(t => {
          t.elapsed += dt;
          const progress = Math.min(1, t.elapsed / t.duration);
          
          let eased = progress;
          if (t.easing === 'EaseIn') eased = progress * progress;
          else if (t.easing === 'EaseOut') eased = 1 - (1 - progress) * (1 - progress);
          else if (t.easing === 'EaseInOut') eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          const val = t.startVal + (t.endVal - t.startVal) * eased;
          
          if (['x', 'y', 'width', 'height', 'angle', 'opacity'].includes(t.prop)) {
            (updatedInst as any)[t.prop] = val;
          } else {
            updatedInst.properties = { ...updatedInst.properties, [t.prop]: val };
          }

          if (progress < 1) stillActive.push(t);
        });

        tweensRef.current.set(inst.id, stillActive);
        return updatedInst;
      });

      // 1.5 Process Sprite Animations
      nextInstances = nextInstances.map(inst => {
        const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
        if (!ot || ot.kind !== 'sprite' || !ot.animations) return inst;

        const isPlaying = inst.properties._animPlaying !== false;
        if (!isPlaying) return inst;

        const animId = inst.properties._animId;
        const anim = ot.animations.find(a => a.id === animId) || ot.animations[0];
        if (!anim || anim.frames.length === 0) return inst;

        let frameIdx = inst.properties._frameIdx ?? 0;
        let timer = (inst.properties._animTimer ?? 0) + dt;
        
        const currentFrame = anim.frames[frameIdx];
        const animSpeed = inst.properties._animSpeed ?? anim.speed ?? 10;
        const frameDuration = (animSpeed > 0) ? (1 / animSpeed) * (currentFrame?.duration || 1) : Infinity;

        if (timer >= frameDuration && frameDuration !== Infinity) {
          timer -= frameDuration;
          const oldIdx = frameIdx;
          frameIdx++;
          
          if (frameIdx >= anim.frames.length) {
            if (anim.loop) {
              frameIdx = 0;
            } else {
              frameIdx = anim.frames.length - 1;
              inst.properties._animPlaying = false;
              // Trigger: Animation Finished
              emitTriggerRef.current('onAnimFinished', { inst, animation: anim.name }, nextInstances);
            }
          }
          
          if (frameIdx !== oldIdx) {
            emitTriggerRef.current('onAnimFrameChanged', { inst }, nextInstances);
          }
        }

        return { ...inst, properties: { ...inst.properties, _frameIdx: frameIdx, _animTimer: timer } };
      });

      // 1.8 Process Collision Triggers
      nextInstances.forEach(i => {
        nextInstances.forEach(o => {
          if (i.id === o.id) return;
          const isOverlapping = i.x < o.x + o.width && i.x + i.width > o.x && i.y < o.y + o.height && i.y + i.height > o.y;
          if (isOverlapping) {
             const pairId = i.id < o.id ? `${i.id}:${o.id}` : `${o.id}:${i.id}`;
             if (!prevOverlapsRef.current.has(pairId)) {
                nextInstances = emitTriggerRef.current('onCollision', { instA: i, instB: o }, nextInstances);
             }
          }
        });
      });

      // 1.9 Process Particles
      nextInstances.forEach(inst => {
        const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
        if (ot?.kind !== ObjectTypeKind.Particles) return;

        if (!particlesRef.current.has(inst.id)) particlesRef.current.set(inst.id, []);
        const particles = particlesRef.current.get(inst.id)!;

        // Update existing particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life -= dt;
          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += (inst.properties.gravity || 0) * dt;
        }

        // Emit new particles
        const rate = inst.properties.rate || 10;
        const timerKey = `_p_timer_${inst.id}`;
        if (!(inst as any)[timerKey]) (inst as any)[timerKey] = 0;
        (inst as any)[timerKey] += dt;
        
        const spawnInterval = 1 / rate;
        while ((inst as any)[timerKey] >= spawnInterval) {
          (inst as any)[timerKey] -= spawnInterval;
          const angle = (inst.angle + (Math.random() - 0.5) * (inst.properties.spread || 0)) * (Math.PI / 180);
          const speed = inst.properties.speed || 100;
          particles.push({
            x: inst.x + inst.width / 2,
            y: inst.y + inst.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: inst.properties.lifeTime || 2,
            maxLife: inst.properties.lifeTime || 2
          });
        }
      });

      if (!hasStartedRef.current) {
        nextInstances = emitTriggerRef.current('onStartOfLayout', undefined, nextInstances);
        hasStartedRef.current = true;
        addLog(`Layout started. Instances: ${nextInstances.length}`, 'info');
      }

      // 2. Process Event Sheet
      let lastRes = true;
      eventSheet.events.forEach(block => {
        const firstCond = block.conditions[0];
        const triggerTypes = ['onStartOfLayout', 'keyPressed', 'pointerPressed', 'pointerReleased', 'pointerPressedOnObject', 'onCollision', 'onAnimFinished', 'onAnimFrameChanged'];
        if (firstCond && triggerTypes.includes(firstCond.type)) return;

        const blockRes = processBlock(block, nextInstances, {}, dt, lastRes, false, undefined, {}, {}, 0);
        nextInstances = blockRes.instances;
        lastRes = blockRes.result;
      });

      // Layout start handled above via trigger

      runtimeInstancesRef.current = nextInstances;
      setRuntimeInstances(nextInstances);

      // Update collision state for next frame
      const currentOverlaps = new Set<string>();
      nextInstances.forEach(i => {
        nextInstances.forEach(o => {
          if (i.id === o.id) return;
          if (i.x < o.x + o.width && i.x + i.width > o.x && i.y < o.y + o.height && i.y + i.height > o.y) {
            const pairId = i.id < o.id ? `${i.id}:${o.id}` : `${o.id}:${i.id}`;
            currentOverlaps.add(pairId);
          }
        });
      });
      prevOverlapsRef.current = currentOverlaps;

      keysPressedRef.current.clear();
      pointerPressedRef.current = false;
      pointerReleasedRef.current = false;

      // Sync with Editor (Debugger) - throttled to 10 fps for performance
      if (frameCountRef.current % 6 === 0) {
        useEditorStore.getState().setRuntimeState({
          instances: nextInstances,
          variables: runtimeVariablesRef.current,
          fps: Math.round(1 / rawDt)
        });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animationFrameId);
      useEditorStore.getState().setRuntimeState(null);
      
      // Stop all audio
      playingSoundsRef.current.forEach(list => {
        list.forEach(a => { a.pause(); a.src = ""; });
      });
      playingSoundsRef.current.clear();
    };
  }, [layout, eventSheet, isPaused, timeScale]);

  const restartGame = () => {
    const initial = layout.instances.map(inst => {
      const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
      const ivs: Record<string, any> = {};
      ot?.instanceVariables.forEach(v => { ivs[v.name] = v.initialValue; });
      return { ...inst, properties: { ...ivs, ...inst.properties } };
    });
    runtimeInstancesRef.current = initial;
    setRuntimeInstances(initial);
    hasStartedRef.current = false;
    lastTimeRef.current = performance.now();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

    const vw = project.settings?.viewportWidth || 854;
    const vh = project.settings?.viewportHeight || 480;

    // 3. Render Body Calculations (More robust than useEffect)
    const scrollToInst = runtimeInstances.find(inst => {
      const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
      return ot?.behaviors?.some(b => b.type === 'scroll-to' && !b.disabled);
    });

    const currentCameraPos = scrollToInst ? {
      x: scrollToInst.x + scrollToInst.width / 2,
      y: scrollToInst.y + scrollToInst.height / 2
    } : {
      x: vw / 2,
      y: vh / 2
    };

    const cameraTransform = `translate(${vw/2 - currentCameraPos.x}, ${vh/2 - currentCameraPos.y})`;

    React.useEffect(() => {
      containerRef.current?.focus();
    }, []);

    return (
      <div ref={containerRef} tabIndex={0} className="runtime-preview" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#0a0a0a', zIndex: 1000, display: 'flex', flexDirection: 'column',
        fontFamily: 'Inter, sans-serif', color: '#fff', overflow: 'hidden',
        outline: 'none'
      }}>
        {/* Runtime Toolbar */}
        <div style={{
          height: '48px', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333',
          display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: 'space-between',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', 
              backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginRight: '8px'
            }}>
              <div style={{ 
                width: '8px', height: '8px', borderRadius: '50%', 
                backgroundColor: isPaused ? '#f1c40f' : '#4caf50'
              }} />
              <span style={{ fontSize: '13px', color: '#eee', fontWeight: 'bold' }}>{layout?.name || 'Preview'}</span>
            </div>

            {showStats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#0f0', borderRight: '1px solid #333', paddingRight: '16px', marginRight: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#555' }}>FPS:</span>
                  <span style={{ color: fps > 50 ? '#0f0' : fps > 30 ? '#ff0' : '#f00' }}>{fps}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#555' }}>INST:</span>
                  <span style={{ color: '#fff' }}>{runtimeInstances.length}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#555' }}>SPEED:</span>
                  <span style={{ color: '#0af' }}>{timeScale.toFixed(2)}x</span>
                </div>
              </div>
            )}
            
            <ToolbarButton onClick={() => setIsPaused(!isPaused)} active={isPaused} title={isPaused ? "Resume" : "Pause"}>
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </ToolbarButton>
            <ToolbarButton onClick={restartGame} title="Restart"><RotateCcw size={16} /></ToolbarButton>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#333' }} />
            <ToolbarButton onClick={() => setShowStats(!showStats)} active={showStats} title="Performance Stats"><BarChart2 size={16} /></ToolbarButton>
            <ToolbarButton onClick={() => setShowGrid(!showGrid)} active={showGrid} title="Toggle Grid"><Grid size={16} /></ToolbarButton>
            <ToolbarButton onClick={() => setShowLogs(!showLogs)} active={showLogs} title="Console Logs"><Terminal size={16} /></ToolbarButton>
            <ToolbarButton onClick={() => setDebugDraw(!debugDraw)} active={debugDraw} title="Debug Draw (Hitboxes)"><Bug size={16} /></ToolbarButton>
            <ToolbarButton onClick={() => setShowSettings(!showSettings)} active={showSettings} title="Settings"><Settings size={16} /></ToolbarButton>
          </div>
  
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginRight: '8px' }}>{vw} × {vh}</div>
            <ToolbarButton onClick={toggleFullscreen} title="Fullscreen"><Maximize2 size={16} /></ToolbarButton>
            <button onClick={onStop} style={{ backgroundColor: '#e81123', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold' }}>
              <X size={14} /> Close
            </button>
          </div>
        </div>
  
        <div style={{ 
          flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          backgroundColor: '#050505', overflow: 'hidden', padding: '20px'
        }}>
          {/* Aspect-ratio constrained game container - Corrected Letterboxing */}
          <div style={{
            aspectRatio: `${vw} / ${vh}`,
            width: scalingMode === 'stretch' ? '100%' : '100%',
            height: scalingMode === 'stretch' ? '100%' : '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000', 
            boxShadow: '0 0 100px rgba(0,0,0,0.8)',
            overflow: clipToViewport ? 'hidden' : 'visible',
            position: 'relative',
            transform: `scale(${previewZoom})`,
            transition: 'transform 0.1s ease-out'
          }}>
            <svg 
              ref={svgRef} 
              style={{ width: '100%', height: '100%', display: 'block', overflow: 'hidden' }}
              viewBox={`0 0 ${vw} ${vh}`}
              preserveAspectRatio={scalingMode === 'stretch' ? 'none' : "xMidYMid meet"}
            >
              <defs>
                <clipPath id="viewport-clip">
                  <rect width={vw} height={vh} />
                </clipPath>
                <mask id="layout-mask">
                  <rect width={layout?.width || 0} height={layout?.height || 0} fill="white" />
                </mask>
                <pattern id="runtime-grid-major" width={editorState.gridSizeW * 4} height={editorState.gridSizeH * 4} patternUnits="userSpaceOnUse" patternTransform={`translate(${editorState.gridOffsetX}, ${editorState.gridOffsetY})`}>
                  <path 
                    d={`M ${editorState.gridSizeW} 0 L ${editorState.gridSizeW} ${editorState.gridSizeH * 4} M ${editorState.gridSizeW * 2} 0 L ${editorState.gridSizeW * 2} ${editorState.gridSizeH * 4} M ${editorState.gridSizeW * 3} 0 L ${editorState.gridSizeW * 3} ${editorState.gridSizeH * 4} M 0 ${editorState.gridSizeH} L ${editorState.gridSizeW * 4} ${editorState.gridSizeH} M 0 ${editorState.gridSizeH * 2} L ${editorState.gridSizeW * 4} ${editorState.gridSizeH * 2} M 0 ${editorState.gridSizeH * 3} L ${editorState.gridSizeW * 4} ${editorState.gridSizeH * 3}`} 
                    fill="none" stroke={editorState.gridColor} strokeWidth="1" opacity={editorState.gridOpacity * 0.4}
                  />
                  <path 
                    d={`M ${editorState.gridSizeW * 4} 0 L 0 0 0 ${editorState.gridSizeH * 4}`} 
                    fill="none" stroke={editorState.gridColor} strokeWidth="1.5" opacity={editorState.gridOpacity}
                  />
                </pattern>
              </defs>

              <g clipPath={clipToViewport ? "url(#viewport-clip)" : undefined}>
                <g transform={cameraTransform}>
                  {layout && (
                    <g mask="url(#layout-mask)">
                      <rect width={layout.width} height={layout.height} fill="#1e1e1e" />
                      {showGrid && <rect width={layout.width} height={layout.height} fill="url(#runtime-grid-major)" />}
      
                    {layout.layers.map(layer => {
                      if (!layer.visible) return null;
                      const layerInstances = runtimeInstances.filter(inst => inst.layerId === layer.id);
                      return (
                        <g key={layer.id} opacity={layer.opacity ?? 1} filter={getEffectsFilter(layer.effects)}>
                          {layerInstances.map(inst => {
                            const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
                            const kind = ot?.kind || 'sprite';
                            
                            const renderContent = () => {
                              switch (kind) {
                                case 'text': {
                                  const textValue = inst.properties.text || ot?.properties.text || 'Text';
                                  const color = inst.properties.color || ot?.properties.color || '#ffffff';
                                  const fontSize = (inst.properties.fontSize || ot?.properties.fontSize || 12);
                                  const fontFace = inst.properties.fontFace || ot?.properties.fontFace || 'Arial';
                                  const hAlign = inst.properties.horizontalAlign || ot?.properties.horizontalAlign || 'left';
                                  const vAlign = inst.properties.verticalAlign || ot?.properties.verticalAlign || 'top';

                                  let textAnchor: any = 'start';
                                  let tx = 2;
                                  if (hAlign === 'center') { textAnchor = 'middle'; tx = inst.width / 2; }
                                  else if (hAlign === 'right') { textAnchor = 'end'; tx = inst.width - 2; }

                                  let domBaseline: any = 'hanging';
                                  let ty = 2;
                                  if (vAlign === 'center') { domBaseline = 'central'; ty = inst.height / 2; }
                                  else if (vAlign === 'bottom') { domBaseline = 'auto'; ty = inst.height - 2; }

                                  return (
                                    <text 
                                      x={tx} y={ty} 
                                      fontSize={fontSize} 
                                      fill={color} 
                                      fontFamily={fontFace}
                                      textAnchor={textAnchor}
                                      dominantBaseline={domBaseline}
                                      pointerEvents="none"
                                      style={{ userSelect: 'none' }}
                                    >
                                      {textValue}
                                    </text>
                                  );
                                }
                                case 'tiled-background': {
                                  const tileW = inst.properties.tileWidth || 32;
                                  const tileH = inst.properties.tileHeight || 32;
                                  const bgColor = inst.properties.color || '#2d2d2d';
                                  return (
                                    <g>
                                      <defs>
                                        <pattern id={`rt-tiled-${inst.id}`} width={tileW} height={tileH} patternUnits="userSpaceOnUse">
                                          <rect width={tileW} height={tileH} fill={bgColor} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                                          <path d={`M 0 ${tileH/2} L ${tileW} ${tileH/2} M ${tileW/2} 0 L ${tileW/2} ${tileH}`} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" opacity="0.3" />
                                        </pattern>
                                      </defs>
                                      <rect width={inst.width} height={inst.height} fill={`url(#rt-tiled-${inst.id})`} stroke={debugDraw ? "#f0f" : "none"} strokeWidth={1} />
                                    </g>
                                  );
                                }
                                case 'tilemap': {
                                  const tileW = inst.properties.tileWidth || 32;
                                  const tileH = inst.properties.tileHeight || 32;
                                  const data = ot?.tilemapData;

                                  if (!data) return <rect width={inst.width} height={inst.height} fill="rgba(0,0,255,0.1)" stroke="#00f" strokeDasharray="2,2" />;

                                  return (
                                    <g>
                                      {data.tiles.map((row, y) => row.map((tileIdx, x) => {
                                        if (tileIdx === -1) return null;
                                        return (
                                          <rect 
                                            key={`${x}-${y}`}
                                            x={x * tileW} y={y * tileH}
                                            width={tileW} height={tileH}
                                            fill={tileIdx === 0 ? "#333" : (tileIdx % 2 === 0 ? "#555" : "#777")}
                                            stroke="rgba(255,255,255,0.05)"
                                          />
                                        );
                                      }))}
                                    </g>
                                  );
                                }
                                case 'sprite':
                                default: {
                                  const animId = inst.properties._animId;
                                  const frameIdx = inst.properties._frameIdx || 0;
                                  const anim = ot?.animations?.find(a => a.id === animId) || ot?.animations?.[0];
                                  const currentFrame = anim?.frames[frameIdx] || anim?.frames[0];
                                  const assetId = currentFrame?.assetId;

                                  if (assetId) {
                                    return (
                                      <image 
                                        width={inst.width} height={inst.height} 
                                        href={assetId} 
                                        preserveAspectRatio="none"
                                        style={{ imageRendering: 'pixelated', opacity: inst.opacity ?? 1 }}
                                      />
                                    );
                                  }

                                  const spriteColor = inst.properties.color || '#5c5c5c';
                                  return (
                                    <rect 
                                      width={inst.width} height={inst.height} 
                                      fill={spriteColor} 
                                      stroke={debugDraw ? "#f0f" : "#777"}
                                      strokeWidth={debugDraw ? 2 : 1}
                                    />
                                  );
                                }
                              }
                            };

                            return (
                              <g 
                                key={inst.id} 
                                transform={`translate(${inst.x}, ${inst.y}) rotate(${inst.angle || 0}, ${inst.width/2}, ${inst.height/2})`}
                                filter={getEffectsFilter([...(ot?.effects || []), ...(inst.effects || [])])}
                              >
                                {renderContent()}
                                {debugDraw && (
                                  <g>
                                    <rect width={inst.width} height={inst.height} fill="none" stroke="#f0f" strokeWidth="1" />
                                    <text x={inst.width/2} y={-5} fontSize="8" fill="#f0f" textAnchor="middle" pointerEvents="none">{inst.id.split('-')[0]}</text>
                                  </g>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>
              {/* Particles Layer */}
              {runtimeInstances.filter(i => {
                const ot = project.objectTypes.find(t => t.id === i.objectTypeId);
                return ot?.kind === ObjectTypeKind.Particles;
              }).map(inst => {
                const particles = particlesRef.current.get(inst.id) || [];
                const color = inst.properties.color || '#ff9900';
                const startSize = inst.properties.startSize ?? 4;
                const endSize = inst.properties.endSize ?? 0;

                return (
                  <g key={`p-container-${inst.id}`}>
                    {particles.map((p, idx) => {
                      const ratio = p.life / p.maxLife;
                      const size = endSize + (startSize - endSize) * ratio;
                      return (
                        <circle 
                          key={`p-${inst.id}-${idx}`}
                          cx={p.x} cy={p.y}
                          r={size / 2}
                          fill={color}
                          opacity={ratio}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>

              {debugDraw && (
                <rect 
                  width={vw} height={vh} 
                  fill="none" stroke="#0099ff" strokeWidth={2} strokeDasharray="10 5" 
                  pointerEvents="none"
                  transform={`translate(${currentCameraPos.x - vw/2}, ${currentCameraPos.y - vh/2})`}
                />
              )}
            </svg>
          </div>

        {/* Console Log Panel */}
        {showLogs && (
          <div style={{
            position: 'absolute', bottom: '20px', right: '20px', width: '350px', height: '250px',
            backgroundColor: '#111', borderRadius: '10px', border: '1px solid #333',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            zIndex: 100
          }}>
            <div style={{ padding: '8px 12px', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Console</span>
              <button onClick={() => setLogs([])} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '10px' }}>Clear</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid #222', paddingBottom: '4px', color: log.type === 'error' ? '#f44' : log.type === 'warn' ? '#ff0' : '#aaa' }}>
                  <span style={{ color: '#555', marginRight: '8px' }}>[{log.time}]</span>
                  {log.msg}
                </div>
              ))}
              {logs.length === 0 && <div style={{ color: '#444', textAlign: 'center', marginTop: '40px' }}>No logs yet.</div>}
            </div>
          </div>
        )}

        {/* Floating Settings Panel */}
        {showSettings && (
          <div style={{
            position: 'absolute', top: '10px', right: '10px', width: '240px',
            backgroundColor: '#1e1e1e', borderRadius: '10px', border: '1px solid #333',
            padding: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', zIndex: 100,
            display: 'flex', flexDirection: 'column', gap: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Runtime Settings</span>
              <X size={14} style={{ cursor: 'pointer' }} onClick={() => setShowSettings(false)} />
            </div>

            <div>
              <Label>Scaling Mode</Label>
              <Select value={scalingMode} onChange={(e) => setScalingMode(e.target.value as ScalingMode)}>
                <option value="letterbox">Letterbox (Fit)</option>
                <option value="stretch">Stretch to Fill</option>
                <option value="integer">Integer Scale</option>
              </Select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Label>Game Speed (Time Scale)</Label>
                <span style={{ fontSize: '11px', color: '#0af' }}>{timeScale.toFixed(2)}x</span>
              </div>
              <input 
                type="range" min="0" max="2" step="0.1" value={timeScale} 
                onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#0af', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => setTimeScale(1.0)} style={smallButtonStyle}>Reset (1.0x)</button>
                <button onClick={() => setTimeScale(0.5)} style={smallButtonStyle}>Slow (0.5x)</button>
                <button onClick={() => setTimeScale(0)} style={smallButtonStyle}>Freeze</button>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Label>Preview Zoom</Label>
                <span style={{ fontSize: '11px', color: '#0af' }}>{(previewZoom * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.1" max="2" step="0.1" value={previewZoom} 
                onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#0af', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => setPreviewZoom(1.0)} style={smallButtonStyle}>100%</button>
                <button onClick={() => setPreviewZoom(1.5)} style={smallButtonStyle}>150%</button>
                <button onClick={() => setPreviewZoom(2.0)} style={smallButtonStyle}>200%</button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <input 
                type="checkbox" id="clip-toggle" checked={clipToViewport} 
                onChange={(e) => setClipToViewport(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="clip-toggle" style={{ fontSize: '12px', cursor: 'pointer', color: '#ccc' }}>Clip to Viewport</label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ToolbarButton: React.FC<{ children: React.ReactNode, onClick: () => void, active?: boolean, title?: string }> = ({ children, onClick, active, title }) => (
  <button 
    onClick={onClick} title={title}
    style={{
      backgroundColor: active ? 'rgba(0, 122, 204, 0.3)' : 'transparent',
      color: active ? '#00b3ff' : '#ccc',
      border: 'none', width: '32px', height: '32px', borderRadius: '6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all 0.1s', outline: 'none'
    }}
    onMouseOver={(e) => !active && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
    onMouseOut={(e) => !active && (e.currentTarget.style.backgroundColor = 'transparent')}
  >
    {children}
  </button>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
    {children}
  </div>
);

const Select: React.FC<{ value: string, onChange: (e: any) => void, children: React.ReactNode }> = ({ value, onChange, children }) => (
  <select value={value} onChange={onChange} style={{
    width: '100%', backgroundColor: '#2d2d2d', color: '#eee', border: '1px solid #444',
    padding: '6px 8px', borderRadius: '4px', fontSize: '12px', outline: 'none'
  }}>
    {children}
  </select>
);

const smallButtonStyle: React.CSSProperties = {
  flex: 1, backgroundColor: '#333', color: '#ccc', border: 'none', padding: '6px',
  borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600
};

