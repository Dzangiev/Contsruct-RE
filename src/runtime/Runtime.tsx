import React from 'react';
import { Project, Instance, EventBlock } from '../model/project';
import { useEditorStore } from '../store/useEditorStore';
import { Play, Pause, RotateCcw, BarChart2, Maximize2, X, Settings, Bug, Clock, Monitor, Terminal, Grid } from 'lucide-react';

interface RuntimeProps {
  project: Project;
  layoutId: string | null;
  onStop: () => void;
}

type ScalingMode = 'letterbox' | 'fit' | 'stretch' | 'integer';

/**
 * A professional runtime engine that renders and executes the game layout with advanced controls.
 */
export const Runtime: React.FC<RuntimeProps> = ({ project, layoutId, onStop }) => {
  const { editorState } = useEditorStore();
  const layout = project.layouts.find(l => l.id === layoutId) || project.layouts[0];
  const eventSheet = project.eventSheets.find(es => es.id === layout?.eventSheetId) || project.eventSheets[0];

  const [runtimeInstances, setRuntimeInstances] = React.useState<Instance[]>(() => 
    layout ? JSON.parse(JSON.stringify(layout.instances)) : []
  );

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

  const addLog = (msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [{ msg, time: new Date().toLocaleTimeString(), type }, ...prev].slice(0, 50));
  };

  const frameCountRef = React.useRef(0);
  const lastFpsUpdateRef = React.useRef(performance.now());
  const lastTimeRef = React.useRef<number>(performance.now());
  
  const keysDownRef = React.useRef<Set<string>>(new Set());
  const keysPressedRef = React.useRef<Set<string>>(new Set());
  
  const pointerPosRef = React.useRef({ x: 0, y: 0 });
  const pointerDownRef = React.useRef(false);
  const pointerPressedRef = React.useRef(false);
  const pointerReleasedRef = React.useRef(false);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const behaviorsStateRef = React.useRef<Record<string, Record<string, any>>>({});

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
  }, [project.settings.viewportWidth, project.settings.viewportHeight]);

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
      
      if (trimmed in context) return context[trimmed];

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
          default: return true;
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

      for (const condition of block.conditions) {
        const otid = condition.targetObjectTypeId;
        if (!otid) {
          let result = true;
          switch (condition.type) {
            case 'always': result = true; break;
            case 'keyDown': result = keysDownRef.current.has(condition.params[0]); break;
            case 'keyPressed': result = keysPressedRef.current.has(condition.params[0]); break;
            case 'pointerDown': result = pointerDownRef.current; break;
            case 'pointerPressed': result = pointerPressedRef.current; break;
            case 'pointerReleased': result = pointerReleasedRef.current; break;
          }
          if (condition.inverted) result = !result;
          if (!result) { allPass = false; break; }
          continue;
        }

        if (!currentPickedSets[otid]) {
          currentPickedSets[otid] = instances.filter(i => i.objectTypeId === otid).map(i => i.id);
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

      block.actions.forEach(action => {
        const otid = action.targetObjectTypeId;
        if (!otid) return;

        let pickedIds = currentPickedSets[otid];
        if (!pickedIds) pickedIds = nextInstances.filter(i => i.objectTypeId === otid).map(i => i.id);

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
              x: spawnX, y: spawnY,
              width: objectType.defaultWidth, height: objectType.defaultHeight,
              angle: 0, opacity: 1, visible: true, properties: {}
            };
            nextInstances.push(newInst);
          };

          const globalContext = { dt, pointerX: pointerPosRef.current.x, pointerY: pointerPosRef.current.y };
          if (otid && currentPickedSets[otid] && currentPickedSets[otid].length > 0) {
            currentPickedSets[otid].forEach(id => {
              const inst = nextInstances.find(i => i.id === id);
              if (inst) spawn({ ...globalContext, x: inst.x, y: inst.y, width: inst.width, height: inst.height, rotation: inst.angle });
            });
          } else spawn(globalContext);
          return;
        }

        nextInstances = nextInstances.map(inst => {
          if (!pickedIds.includes(inst.id)) return inst;
          const context = {
            x: inst.x, y: inst.y, width: inst.width, height: inst.height, rotation: inst.angle,
            dt, pointerX: pointerPosRef.current.x, pointerY: pointerPosRef.current.y
          };
          const evalParam = (index: number) => evaluateExpression(action.params[index], context);

          switch (action.type) {
            case 'setPosition': return { ...inst, x: Number(evalParam(0) ?? inst.x), y: Number(evalParam(1) ?? inst.y) };
            case 'moveBy': return { ...inst, x: inst.x + Number(evalParam(0) ?? 0), y: inst.y + Number(evalParam(1) ?? 0) };
            case 'setVisible': return { ...inst, visible: !!evalParam(0) };
            default: return inst;
          }
        });
      });

      block.children.forEach(child => {
        nextInstances = processBlock(child, nextInstances, currentPickedSets, dt);
      });

      return nextInstances;
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

      setRuntimeInstances(prev => {
        let nextInstances = [...prev];
        
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
                const speed = Number(props.speed ?? 400);
                const angleRad = updatedInst.angle * (Math.PI / 180);
                updatedInst.x += Math.cos(angleRad) * speed * dt;
                updatedInst.y += Math.sin(angleRad) * speed * dt;
                break;
              }
              case 'eight-direction': {
                const maxSpeed = Number(props.maxSpeed ?? 200);
                let dx = 0;
                let dy = 0;
                if (keysDownRef.current.has('ArrowLeft')) dx -= 1;
                if (keysDownRef.current.has('ArrowRight')) dx += 1;
                if (keysDownRef.current.has('ArrowUp')) dy -= 1;
                if (keysDownRef.current.has('ArrowDown')) dy += 1;

                if (dx !== 0 || dy !== 0) {
                  const mag = Math.sqrt(dx * dx + dy * dy);
                  updatedInst.x += (dx / mag) * maxSpeed * dt;
                  updatedInst.y += (dy / mag) * maxSpeed * dt;
                  
                  if (props.directions === '8-way') {
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    updatedInst.angle = angle;
                  }
                }
                break;
              }
              case 'platform': {
                const maxSpeed = Number(props.maxSpeed ?? 330);
                const gravity = Number(props.gravity ?? 1500);
                const jumpStrength = Number(props.jumpStrength ?? 650);
                
                if (state.vx === undefined) { state.vx = 0; state.vy = 0; state.onFloor = false; }

                // Horizontal movement
                let moveDir = 0;
                if (keysDownRef.current.has('ArrowLeft')) moveDir -= 1;
                if (keysDownRef.current.has('ArrowRight')) moveDir += 1;
                
                state.vx = moveDir * maxSpeed;

                // Gravity
                state.vy += gravity * dt;

                // Jump
                if (keysPressedRef.current.has('ArrowUp') && state.onFloor) {
                  state.vy = -jumpStrength;
                  state.onFloor = false;
                }

                // Apply velocities
                let nextX = updatedInst.x + state.vx * dt;
                let nextY = updatedInst.y + state.vy * dt;

                // Simple Solid Collision (very basic)
                const solids = nextInstances.filter(o => {
                  const ot_o = project.objectTypes.find(type => type.id === o.objectTypeId);
                  return ot_o?.behaviors.some(b => b.type === 'solid' && !b.disabled);
                });

                let onFloor = false;
                solids.forEach(s => {
                  // Check Y collision
                  if (nextX < s.x + s.width && nextX + updatedInst.width > s.x) {
                    if (updatedInst.y + updatedInst.height <= s.y && nextY + updatedInst.height > s.y) {
                      nextY = s.y - updatedInst.height;
                      state.vy = 0;
                      onFloor = true;
                    }
                  }
                });

                updatedInst.x = nextX;
                updatedInst.y = nextY;
                state.onFloor = onFloor;
                break;
              }
              case 'scroll-to': {
                // Handled in rendering/camera phase
                break;
              }
            }
          });

          return updatedInst;
        });

        // 2. Process Event Sheet
        eventSheet.events.forEach(block => {
          nextInstances = processBlock(block, nextInstances, {}, dt);
        });
        
        return nextInstances;
      });

      keysPressedRef.current.clear();
      pointerPressedRef.current = false;
      pointerReleasedRef.current = false;

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [layout, eventSheet, isPaused, timeScale]);

  const restartGame = () => {
    setRuntimeInstances(JSON.parse(JSON.stringify(layout.instances)));
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

    return (
      <div ref={containerRef} className="runtime-preview" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#0a0a0a', zIndex: 1000, display: 'flex', flexDirection: 'column',
        fontFamily: 'Inter, sans-serif', color: '#fff', overflow: 'hidden'
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
                <pattern id="runtime-grid" width={editorState.gridSize} height={editorState.gridSize} patternUnits="userSpaceOnUse">
                  <path d={`M ${editorState.gridSize} 0 L 0 0 0 ${editorState.gridSize}`} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
                </pattern>
              </defs>

              <g clipPath={clipToViewport ? "url(#viewport-clip)" : undefined}>
                <g transform={cameraTransform}>
                  {layout && (
                    <g mask="url(#layout-mask)">
                      <rect width={layout.width} height={layout.height} fill="#1e1e1e" />
                      {showGrid && <rect width={layout.width} height={layout.height} fill="url(#runtime-grid)" />}
      
                    {layout.layers.map(layer => {
                      if (!layer.visible) return null;
                      const layerInstances = runtimeInstances.filter(inst => inst.layerId === layer.id);
                      return (
                        <g key={layer.id} opacity={layer.opacity ?? 1}>
                          {layerInstances.map(inst => (
                            <g key={inst.id} transform={`translate(${inst.x}, ${inst.y}) rotate(${inst.angle || 0}, ${inst.width/2}, ${inst.height/2})`}>
                              <rect 
                                width={inst.width} height={inst.height} 
                                fill="#5c5c5c" 
                                stroke={debugDraw ? "#f0f" : "#777"}
                                strokeWidth={debugDraw ? 2 : 1}
                                style={{ display: inst.visible !== false ? 'block' : 'none' }} 
                              />
                              {debugDraw && (
                                <text x={inst.width/2} y={-5} fontSize="8" fill="#f0f" textAnchor="middle" pointerEvents="none">{inst.id.split('-')[0]}</text>
                              )}
                            </g>
                          ))}
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

