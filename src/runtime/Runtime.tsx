import React from 'react';
import { Project, Instance, EventBlock } from '../model/project';
import Matter from 'matter-js';
import { useEditorStore } from '../store/useEditorStore';
import { Play, Pause, RotateCcw, BarChart2, Maximize2, X, Settings, Bug, Clock, Monitor, Terminal, Grid } from 'lucide-react';
import { evaluateExpression, EvaluationContext } from './expressionEvaluator';
import { PLUGIN_DEFINITIONS } from '../model/definitions';

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
      ot?.instanceVariables.forEach(v => { ivs[v.name] = v.initialValue; });
      
      // Initialize Animation State
      const defaultAnim = ot?.animations?.[0];
      return { 
        ...inst, 
        properties: { 
          ...ivs, 
          ...inst.properties,
          _animId: defaultAnim?.id || '',
          _frameIdx: 0,
          _animTimer: 0
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
      const physBehavior = ot?.behaviors.find(b => b.type === 'physics' && !b.disabled);
      
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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const behaviorsStateRef = React.useRef<Record<string, Record<string, any>>>({});
  const lastReturnValueRef = React.useRef<any>(0);
  const staticVariablesRef = React.useRef<Record<string, any>>({});

  // Pathfinding Refs
  const pathfindingGridRef = React.useRef<{ width: number, height: number, data: boolean[][] } | null>(null);

  // Physics Engine Refs
  const physicsEngineRef = React.useRef<Matter.Engine | null>(null);
  const physicsBodiesRef = React.useRef<Map<string, Matter.Body>>(new Map());

  React.useEffect(() => {
    addLog(`Runtime initialized for layout: ${layout?.name}`, 'info');
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!keysDownRef.current.has(e.code)) {
        keysPressedRef.current.add(e.code);
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
        pointerPosRef.current = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
      }
    };
    const onPointerUp = () => {
      pointerDownRef.current = false;
      pointerReleasedRef.current = true;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [project.settings.viewportWidth, project.settings.viewportHeight]);

  React.useEffect(() => {
    if (!layout || !eventSheet) return;

    let animationFrameId: number;

    const getEvaluationContext = (dt: number, instances: Instance[], currentInstance?: Instance, funcParams?: any[], localVars?: Record<string, any>): EvaluationContext => {
      const objects: Record<string, any> = {};
      // 1. Object Types
      project.objectTypes.forEach(ot => {
        const insts = instances.filter(i => i.objectTypeId === ot.id);
        if (insts.length > 0) {
          // If we have a current instance of this type, use it, otherwise use the first one
          const target = (currentInstance && currentInstance.objectTypeId === ot.id) ? currentInstance : insts[0];
          objects[ot.name] = {
            ...target,
            instanceVariables: target.properties
          };
        }
      });

      // 2. Families
      project.families.forEach(f => {
        const insts = instances.filter(i => f.objectTypeIds.includes(i.objectTypeId));
        if (insts.length > 0) {
          // If current instance belongs to this family, use it, otherwise use the first one
          const target = (currentInstance && f.objectTypeIds.includes(currentInstance.objectTypeId)) ? currentInstance : insts[0];
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

    const filterInstances = (condition: any, currentPicked: Instance[], allInstances: Instance[], dt: number): Instance[] => {
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
            const context = getEvaluationContext(dt, [i], i);
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
            const context = getEvaluationContext(dt, [i], i);
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
            const targetId = String(evaluateExpression(condition.params[0], getEvaluationContext(dt, [i], i)));
            return i.id === targetId;
          }
          case 'physicsIsStatic': {
            const body = physicsBodiesRef.current.get(i.id);
            return body ? body.isStatic : false;
          }
          case 'pickByIndex': {
            return true; // Logic handled in bulk
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
          const context = getEvaluationContext(dt, allInstances);
          const targetIdx = Math.floor(Number(evaluateExpression(condition.params[0], context) ?? 0));
          if (targetIdx >= 0 && targetIdx < baseFiltered.length) {
            return [baseFiltered[targetIdx]];
          }
          return [];
        }
        case 'pickNearest': {
          const context = getEvaluationContext(dt, allInstances);
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
          const context = getEvaluationContext(dt, allInstances);
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
            const context = getEvaluationContext(dt, instances, undefined, funcParams, localVars);
            staticVariablesRef.current[block.id] = evaluateExpression(block.variable.initialValue, context);
          }
          localVars[varName] = staticVariablesRef.current[block.id];
        } else {
          const context = getEvaluationContext(dt, instances, undefined, funcParams, localVars);
          localVars[varName] = evaluateExpression(block.variable.initialValue, context);
        }
        return { instances, result: true };
      }

      let currentPickedSets: PickedSets = { ...parentPickedSets };
      let allPass = true;

      for (const condition of block.conditions) {
        const otid = condition.targetObjectTypeId;
        if (!otid) {
          let result = true;
          const context = getEvaluationContext(dt, instances, undefined, funcParams, localVars);
          switch (condition.type) {
            case 'always': result = true; break;
            case 'onStartOfLayout': result = !hasStartedRef.current; break;
            case 'else': result = !lastEventResult; break;
            case 'compareGlobalVariable': {
              const varName = condition.params[0];
              const operator = condition.params[1];
              const compareValue = evaluateExpression(condition.params[2], context);
              const val = runtimeVariablesRef.current[varName];
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
                  currentPickedSets[pickOtid] = instances.filter(i => family.objectTypeIds.includes(i.objectTypeId)).map(i => i.id);
                } else {
                  currentPickedSets[pickOtid] = instances.filter(i => i.objectTypeId === pickOtid).map(i => i.id);
                }
                result = currentPickedSets[pickOtid].length > 0;
              } else result = false;
              break;
            }
            case 'pickRandom': {
               // System variant of pick random (e.g. System -> Pick random Sprite)
               const pickOtid = condition.params[0];
               if (pickOtid && instances.length > 0) {
                 const typeInsts = instances.filter(i => i.objectTypeId === pickOtid);
                 if (typeInsts.length > 0) {
                    const rand = typeInsts[Math.floor(Math.random() * typeInsts.length)];
                    currentPickedSets[pickOtid] = [rand.id];
                    result = true;
                 } else result = false;
               } else result = false;
               break;
            }
          }
          if (condition.inverted) result = !result;
          if (!result) { allPass = false; break; }
          continue;
        }

        const context = getEvaluationContext(dt, instances, undefined, funcParams, localVars);

        if (condition.type === 'setPhysicsGravity') {
           if (physicsEngineRef.current) {
             const gx = Number(evaluateExpression(condition.params[0], context) ?? 0);
             const gy = Number(evaluateExpression(condition.params[1], context) ?? 1);
             physicsEngineRef.current.gravity.x = gx;
             physicsEngineRef.current.gravity.y = gy;
           }
           continue;
        }

        if (!currentPickedSets[otid]) {
          const family = project.families.find(f => f.id === otid);
          if (family) {
            currentPickedSets[otid] = instances.filter(i => family.objectTypeIds.includes(i.objectTypeId)).map(i => i.id);
          } else {
            currentPickedSets[otid] = instances.filter(i => i.objectTypeId === otid).map(i => i.id);
          }
        }

        const pickedInstances = instances.filter(i => currentPickedSets[otid].includes(i.id));
        const filtered = filterInstances(condition, pickedInstances, instances, dt);

        if (filtered.length === 0) {
          allPass = false;
          break;
        }
        currentPickedSets[otid] = filtered.map(i => i.id);
      }
      
      if (!allPass) return { instances, result: false };

      let nextInstances = [...instances];

      // Pre-initialize local variables defined in this block's children
      // so they are available to the block's own actions
      if (block.children) {
        block.children.forEach(child => {
          if (child.type === 'variable' && child.variable) {
            const varName = child.variable.name;
            const context = getEvaluationContext(dt, nextInstances, undefined, funcParams, localVars);
            
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
        
        const context = getEvaluationContext(dt, nextInstances, undefined, funcParams, localVars);
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
              const context = getEvaluationContext(dt, nextInstances, instForContext, funcParams, localVars);
              
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
                angle: 0, opacity: 1, visible: true, properties: initialProps
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
          const context = getEvaluationContext(dt, nextInstances, inst, funcParams, localVars);
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
            case 'setPathfindingAcceleration': {
              const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
              const behavior = ot?.behaviors.find(b => b.type === 'pathfinding');
              if (behavior) {
                if (!behaviorsStateRef.current[inst.id]) behaviorsStateRef.current[inst.id] = {};
                if (!behaviorsStateRef.current[inst.id][behavior.id]) behaviorsStateRef.current[inst.id][behavior.id] = { ...behavior.properties };
                behaviorsStateRef.current[inst.id][behavior.id].acceleration = Number(evalParam(0) ?? 600);
              }
              return inst;
            }
            default: return inst;
          }
        });
      });

      let currentResult = allPass;
      block.children.forEach(child => {
        // Skip variable blocks as they were already initialized above
        if (child.type === 'variable') return;
        const childRes = processBlock(child, nextInstances, currentPickedSets, dt, currentResult, isExplicitCall, funcParams, localVars, localVarsMeta, depth + 1);
        nextInstances = childRes.instances;
      });

      return { instances: nextInstances, result: allPass };
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
        if (!ot || !ot.behaviors) return inst;

        let updatedInst = { ...inst };
        ot.behaviors.forEach(behavior => {
          if (behavior.disabled) return;
          if (!behaviorsStateRef.current[inst.id]) behaviorsStateRef.current[inst.id] = {};
          if (!behaviorsStateRef.current[inst.id][behavior.id]) {
          behaviorsStateRef.current[inst.id][behavior.id] = { ...behavior.properties };
          }
          const state = behaviorsStateRef.current[inst.id][behavior.id];
          const props = behavior.properties;

          switch (behavior.type) {
            case 'bullet': {
              const speed = Number(state.speed ?? props.speed ?? 400);
              const angleRad = updatedInst.angle * (Math.PI / 180);
              updatedInst.x += Math.cos(angleRad) * speed * dt;
              updatedInst.y += Math.sin(angleRad) * speed * dt;
              break;
            }
            case 'eight-direction': {
              const maxSpeed = Number(state.maxSpeed ?? props.maxSpeed ?? 200);
              let dx = 0, dy = 0;
              if (keysDownRef.current.has('ArrowLeft')) dx -= 1;
              if (keysDownRef.current.has('ArrowRight')) dx += 1;
              if (keysDownRef.current.has('ArrowUp')) dy -= 1;
              if (keysDownRef.current.has('ArrowDown')) dy += 1;
              if (dx !== 0 || dy !== 0) {
                const mag = Math.sqrt(dx * dx + dy * dy);
                updatedInst.x += (dx / mag) * maxSpeed * dt;
                updatedInst.y += (dy / mag) * maxSpeed * dt;
                if (props.directions === '8-way') updatedInst.angle = Math.atan2(dy, dx) * (180 / Math.PI);
              }
              break;
            }
            case 'platform': {
              const maxSpeed = Number(state.maxSpeed ?? props.maxSpeed ?? 330);
              const acceleration = Number(state.acceleration ?? props.acceleration ?? 1500);
              const deceleration = Number(state.deceleration ?? props.deceleration ?? 1500);
              const gravity = Number(state.gravity ?? props.gravity ?? 1500);
              const jumpStrength = Number(state.jumpStrength ?? props.jumpStrength ?? 650);

              if (state.vx === undefined) { 
                state.vx = 0; 
                state.vy = 0; 
                state.onFloor = false; 
              }

              // 1. Horizontal Movement
              let targetVx = 0;
              if (keysDownRef.current.has('ArrowLeft')) targetVx -= 1;
              if (keysDownRef.current.has('ArrowRight')) targetVx += 1;
              targetVx *= maxSpeed;

              if (targetVx !== 0) {
                // Accelerate
                if (state.vx < targetVx) state.vx = Math.min(targetVx, state.vx + acceleration * dt);
                else if (state.vx > targetVx) state.vx = Math.max(targetVx, state.vx - acceleration * dt);
              } else {
                // Decelerate
                if (state.vx > 0) state.vx = Math.max(0, state.vx - deceleration * dt);
                else if (state.vx < 0) state.vx = Math.min(0, state.vx + deceleration * dt);
              }

              // 2. Vertical Movement (Gravity & Jump)
              state.vy += gravity * dt;
              if (keysPressedRef.current.has('ArrowUp') && state.onFloor) {
                state.vy = -jumpStrength;
                state.onFloor = false;
              }

              // 3. Collision Resolution
              const solids = nextInstances.filter(o => {
                if (o.id === inst.id) return false;
                const ot_o = project.objectTypes.find(type => type.id === o.objectTypeId);
                return ot_o?.behaviors.some(b => b.type === 'solid' && !b.disabled);
              });

              const checkCollision = (tx: number, ty: number) => {
                return solids.some(s => {
                  return tx < s.x + s.width && 
                         tx + updatedInst.width > s.x && 
                         ty < s.y + s.height && 
                         ty + updatedInst.height > s.y;
                });
              };

              // X Pass
              let newX = updatedInst.x + state.vx * dt;
              if (checkCollision(newX, updatedInst.y)) {
                // Binary search or simple step back to find edge
                const step = state.vx > 0 ? 1 : -1;
                while (checkCollision(updatedInst.x + step, updatedInst.y) === false && Math.abs(updatedInst.x - newX) > 1) {
                  updatedInst.x += step;
                }
                state.vx = 0;
                newX = updatedInst.x;
              } else {
                updatedInst.x = newX;
              }

              // Y Pass
              let newY = updatedInst.y + state.vy * dt;
              let onFloor = false;
              if (checkCollision(updatedInst.x, newY)) {
                if (state.vy > 0) {
                  // Hit floor
                  const step = 1;
                  while (checkCollision(updatedInst.x, updatedInst.y + step) === false && updatedInst.y < newY) {
                    updatedInst.y += step;
                  }
                  onFloor = true;
                } else if (state.vy < 0) {
                  // Hit ceiling
                  const step = -1;
                  while (checkCollision(updatedInst.x, updatedInst.y + step) === false && updatedInst.y > newY) {
                    updatedInst.y += step;
                  }
                }
                state.vy = 0;
              } else {
                updatedInst.y = newY;
              }

              state.onFloor = onFloor;
              break;
            }
            case 'pathfinding': {
              const maxSpeed = Number(state.maxSpeed ?? props.maxSpeed ?? 200);
              const cellSize = Number(props.cellSide ?? 32);
              
              if (state.path === undefined) {
                state.path = [];
                state.targetX = updatedInst.x;
                state.targetY = updatedInst.y;
              }

              // Logic to calculate path if target changes (usually triggered by action)
              // For now, let's assume we follow the path waypoints
              if (state.path && state.path.length > 0) {
                const waypoint = state.path[0];
                const dx = waypoint.x - (updatedInst.x + updatedInst.width / 2);
                const dy = waypoint.y - (updatedInst.y + updatedInst.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 5) {
                  state.path.shift();
                } else {
                  const moveDist = Math.min(dist, maxSpeed * dt);
                  updatedInst.x += (dx / dist) * moveDist;
                  updatedInst.y += (dy / dist) * moveDist;
                  
                  if (props.rotateSpeed > 0) {
                    const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);
                    // Simple angle lerp could be added here
                    updatedInst.angle = targetAngle;
                  }
                }
              }
              break;
            }
          }
        });
        return updatedInst;
      });

      // 1.5 Process Sprite Animations
      nextInstances = nextInstances.map(inst => {
        const ot = project.objectTypes.find(o => o.id === inst.objectTypeId);
        if (!ot || ot.kind !== 'sprite' || !ot.animations) return inst;

        const animId = inst.properties._animId;
        const anim = ot.animations.find(a => a.id === animId) || ot.animations[0];
        if (!anim || anim.frames.length <= 1 || anim.speed === 0) return inst;

        let frameIdx = inst.properties._frameIdx ?? 0;
        let timer = (inst.properties._animTimer ?? 0) + dt;
        const frameDuration = 1 / anim.speed;

        if (timer >= frameDuration) {
          timer -= frameDuration;
          frameIdx++;
          if (frameIdx >= anim.frames.length) {
            frameIdx = anim.loop ? 0 : anim.frames.length - 1;
          }
        }

        return { ...inst, properties: { ...inst.properties, _frameIdx: frameIdx, _animTimer: timer } };
      });

      // 2. Process Event Sheet
      let lastRes = true;
      eventSheet.events.forEach(block => {
        const blockRes = processBlock(block, nextInstances, {}, dt, lastRes, false, undefined, {}, {}, 0);
        nextInstances = blockRes.instances;
        lastRes = blockRes.result;
      });

      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        addLog(`First frame processed. Final instances: ${nextInstances.length}`, 'info');
      }

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

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
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
                        <g key={layer.id} opacity={layer.opacity ?? 1}>
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
                              <g key={inst.id} transform={`translate(${inst.x}, ${inst.y}) rotate(${inst.angle || 0}, ${inst.width/2}, ${inst.height/2})`}>
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

