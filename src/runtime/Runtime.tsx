import React from 'react';
import { Project, Instance, EventBlock } from '../model/project';

interface RuntimeProps {
  project: Project;
  layoutId: string | null;
  onStop: () => void;
}

/**
 * A minimal runtime engine that renders and executes the game layout.
 */
export const Runtime: React.FC<RuntimeProps> = ({ project, layoutId, onStop }) => {
  const layout = project.layouts.find(l => l.id === layoutId) || project.layouts[0];
  const eventSheet = project.eventSheets.find(es => es.id === layout?.eventSheetId) || project.eventSheets[0];

  const [runtimeInstances, setRuntimeInstances] = React.useState<Instance[]>(() => 
    layout ? JSON.parse(JSON.stringify(layout.instances)) : []
  );

  const lastTimeRef = React.useRef<number>(performance.now());
  const keysDownRef = React.useRef<Set<string>>(new Set());
  const keysPressedRef = React.useRef<Set<string>>(new Set());
  
  const pointerPosRef = React.useRef({ x: 0, y: 0 });
  const pointerDownRef = React.useRef(false);
  const pointerPressedRef = React.useRef(false);
  const pointerReleasedRef = React.useRef(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

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
      pointerPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    const onPointerDown = () => {
      pointerDownRef.current = true;
      pointerPressedRef.current = true;
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
  }, []);

  React.useEffect(() => {
    if (!layout || !eventSheet) return;

    let animationFrameId: number;

    type PickedSets = Record<string, string[]>; // objectTypeId -> instanceIds

    const evaluateExpression = (expr: any, context: Record<string, any>): any => {
      if (typeof expr !== 'string') return expr;
      
      const trimmed = expr.trim();
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      if (!isNaN(Number(trimmed))) return Number(trimmed);
      
      // Simple variable lookup
      if (trimmed in context) return context[trimmed];

      // Support simple binary expressions: token op token
      const match = trimmed.match(/^([a-zA-Z0-9\._]+)\s*([\+\-\*\/])\s*([a-zA-Z0-9\._]+)$/);
      if (match) {
        const [_, left, op, right] = match;
        const getVal = (token: string) => {
          if (token in context) return context[token];
          const n = Number(token);
          return isNaN(n) ? 0 : n;
        };
        const v1 = getVal(left);
        const v2 = getVal(right);
        switch (op) {
          case '+': return v1 + v2;
          case '-': return v1 - v2;
          case '*': return v1 * v2;
          case '/': return v1 !== 0 ? v1 / v2 : 0;
        }
      }
      return expr;
    };

    const filterInstances = (condition: any, currentPicked: Instance[], allInstances: Instance[]): Instance[] => {
      const px = pointerPosRef.current.x;
      const py = pointerPosRef.current.y;

      const checkInstance = (i: Instance): boolean => {
        const isUnderPointer = (): boolean => {
          if (!i.visible) return false;
          return px >= i.x && px <= i.x + i.width &&
                 py >= i.y && py <= i.y + i.height;
        };

        switch (condition.type) {
          case 'always':
            return true;
          case 'isVisible':
            return i.visible;
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
          case 'pointerOverObject':
            return isUnderPointer();
          case 'pointerPressedOnObject':
            return pointerPressedRef.current && isUnderPointer();
          case 'pointerReleasedOnObject':
            return pointerReleasedRef.current && isUnderPointer();
          case 'isOverlapping': {
            const otherTypeId = condition.params[0];
            if (!otherTypeId) return false;
            const others = allInstances.filter(o => o.objectTypeId === otherTypeId);
            return others.some(o => {
              return i.x < o.x + o.width &&
                     i.x + i.width > o.x &&
                     i.y < o.y + o.height &&
                     i.y + i.height > o.y;
            });
          }
          default:
            return true;
        }
      };

      return condition.inverted 
        ? currentPicked.filter(i => !checkInstance(i)) 
        : currentPicked.filter(i => checkInstance(i));
    };

    const processBlock = (block: EventBlock, instances: Instance[], parentPickedSets: PickedSets, dt: number): Instance[] => {
      if (block.disabled) return instances;

      let currentPickedSets: PickedSets = { ...parentPickedSets };
      let allPass = true;

      // Evaluate conditions and filter picking
      for (const condition of block.conditions) {
        const otid = condition.targetObjectTypeId;
        
        if (!otid) {
          // System/Global conditions
          let result = true;
          switch (condition.type) {
            case 'always':
              result = true;
              break;
            case 'keyDown':
              result = keysDownRef.current.has(condition.params[0]);
              break;
            case 'keyPressed':
              result = keysPressedRef.current.has(condition.params[0]);
              break;
            case 'pointerDown':
              result = pointerDownRef.current;
              break;
            case 'pointerPressed':
              result = pointerPressedRef.current;
              break;
            case 'pointerReleased':
              result = pointerReleasedRef.current;
              break;
          }
          if (condition.inverted) result = !result;
          if (!result) { allPass = false; break; }
          continue;
        }

        if (!currentPickedSets[otid]) {
          currentPickedSets[otid] = instances
            .filter(i => i.objectTypeId === otid)
            .map(i => i.id);
        }

        const pickedInstances = instances.filter(i => currentPickedSets[otid].includes(i.id));
        const filtered = filterInstances(condition, pickedInstances, instances);

        if (filtered.length === 0) {
          allPass = false;
          break;
        }

        currentPickedSets[otid] = filtered.map(i => i.id);
      }
      
      if (!allPass) return instances;

      let nextInstances = [...instances];

      // Execute actions only on PICKED instances
      block.actions.forEach(action => {
        const otid = action.targetObjectTypeId;
        if (!otid) return;

        let pickedIds = currentPickedSets[otid];
        if (!pickedIds) {
          pickedIds = nextInstances.filter(i => i.objectTypeId === otid).map(i => i.id);
        }

        if (action.type === 'destroy') {
          nextInstances = nextInstances.filter(inst => !pickedIds.includes(inst.id));
          currentPickedSets[otid] = [];
          return;
        }

        if (action.type === 'createInstance') {
          const spawnTypeId = action.params[0];
          const objectType = project.objectTypes.find(ot => ot.id === spawnTypeId);
          if (!objectType) return;

          const targetLayerId = action.params[3] || layout.layers.find(l => l.visible && !l.locked)?.id || layout.layers[0]?.id;

          const spawn = (ctx: Record<string, any>) => {
            const spawnX = Number(evaluateExpression(action.params[1], ctx) ?? 0);
            const spawnY = Number(evaluateExpression(action.params[2], ctx) ?? 0);

            const newInst: Instance = {
              id: `rt-${Date.now()}-${Math.random()}`,
              objectTypeId: spawnTypeId,
              layerId: targetLayerId,
              x: spawnX,
              y: spawnY,
              width: objectType.defaultWidth,
              height: objectType.defaultHeight,
              angle: 0,
              opacity: 1,
              visible: true,
              properties: {}
            };
            nextInstances.push(newInst);
          };

          const globalContext = {
            dt: dt,
            pointerX: pointerPosRef.current.x,
            pointerY: pointerPosRef.current.y
          };

          if (otid && currentPickedSets[otid] && currentPickedSets[otid].length > 0) {
            // Spawn relative to each picked instance
            currentPickedSets[otid].forEach(id => {
              const inst = nextInstances.find(i => i.id === id);
              if (inst) {
                spawn({ ...globalContext, x: inst.x, y: inst.y, width: inst.width, height: inst.height, rotation: inst.angle });
              }
            });
          } else {
            // Global spawn
            spawn(globalContext);
          }
          return;
        }

        nextInstances = nextInstances.map(inst => {
          if (!pickedIds.includes(inst.id)) return inst;

          const context = {
            x: inst.x,
            y: inst.y,
            width: inst.width,
            height: inst.height,
            rotation: inst.angle,
            dt: dt,
            pointerX: pointerPosRef.current.x,
            pointerY: pointerPosRef.current.y
          };

          const evalParam = (index: number) => evaluateExpression(action.params[index], context);

          switch (action.type) {
            case 'setPosition':
              return { 
                ...inst, 
                x: Number(evalParam(0) ?? inst.x), 
                y: Number(evalParam(1) ?? inst.y) 
              };
            case 'moveBy':
              return { 
                ...inst, 
                x: inst.x + Number(evalParam(0) ?? 0), 
                y: inst.y + Number(evalParam(1) ?? 0) 
              };
            case 'setVisible':
              return { ...inst, visible: !!evalParam(0) };
            default:
              return inst;
          }
        });
      });

      // Recurse into children inheriting the CURRENT picking state
      block.children.forEach(child => {
        nextInstances = processBlock(child, nextInstances, currentPickedSets, dt);
      });

      return nextInstances;
    };

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setRuntimeInstances(prev => {
        let nextInstances = [...prev];
        eventSheet.events.forEach(block => {
          nextInstances = processBlock(block, nextInstances, {}, dt);
        });
        return nextInstances;
      });

      // Clear frame-only inputs
      keysPressedRef.current.clear();
      pointerPressedRef.current = false;
      pointerReleasedRef.current = false;

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [layout, eventSheet]);

  if (!layout) {
    return (
      <div style={{ color: '#fff', padding: '20px', backgroundColor: '#000', height: '100%' }}>
        No layout to preview.
        <button onClick={onStop}>Back to Editor</button>
      </div>
    );
  }

  return (
    <div className="runtime-preview" style={{
      position: 'absolute',
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      backgroundColor: '#000',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      {/* Runtime Toolbar */}
      <div style={{
        height: '40px',
        backgroundColor: '#252526',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        justifyContent: 'space-between',
        color: '#ccc',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4caf50', animation: 'pulse 2s infinite' }}></div>
          <span>Previewing: {layout.name} (Running)</span>
        </div>
        <button 
          onClick={onStop}
          style={{
            backgroundColor: '#c42b1c',
            color: '#fff',
            border: 'none',
            padding: '4px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
        >
          Stop Preview
        </button>
      </div>

      {/* Game Viewport */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        overflow: 'hidden',
        padding: '20px',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{
          boxShadow: '0 0 50px rgba(0,0,0,0.8)',
          backgroundColor: '#111',
          lineHeight: 0,
          width: project.settings.viewportWidth,
          height: project.settings.viewportHeight,
          overflow: 'hidden',
          position: 'relative'
        }}>
          <svg 
            ref={svgRef}
            width={project.settings.viewportWidth} 
            height={project.settings.viewportHeight} 
            viewBox={`0 0 ${project.settings.viewportWidth} ${project.settings.viewportHeight}`}
            style={{ display: 'block' }}
          >
            <style>{`
              @keyframes pulse {
                0% { opacity: 0.5; }
                50% { opacity: 1; }
                100% { opacity: 0.5; }
              }
            `}</style>
            
            {/* Background for the layout */}
            <rect width={layout.width} height={layout.height} fill="#1e1e1e" />

            {/* We render layers in order */}
            {layout.layers.map(layer => {
              if (!layer.visible) return null;
              
              const layerInstances = runtimeInstances.filter(inst => inst.layerId === layer.id);

              return (
                <g key={layer.id} opacity={layer.opacity}>
                  {layerInstances.map(inst => (
                    <g 
                      key={inst.id} 
                      transform={`translate(${inst.x}, ${inst.y}) rotate(${inst.angle}, ${inst.width/2}, ${inst.height/2})`}
                    >
                      <rect 
                        width={inst.width} 
                        height={inst.height} 
                        fill="#4a4a4a" 
                        style={{ display: inst.visible ? 'block' : 'none' }}
                      />
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
