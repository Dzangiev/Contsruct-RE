import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { generateId } from '../../utils/id';

export const Viewport: React.FC = () => {
  const { 
    project, 
    editorState,
    setSelectedInstances,
    updateInstance,
    addInstance,
    removeInstance,
    setTool,
    setView
  } = useEditorStore();
  
  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const activeLayer = activeLayout?.layers.find(layer => layer.id === editorState.activeLayerId);
  
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = React.useState<{ x: number, y: number } | null>(null);
  const [initialPositions, setInitialPositions] = React.useState<Map<string, { x: number, y: number }>>(new Map());
  const [panStart, setPanStart] = React.useState<{ x: number, y: number, panX: number, panY: number } | null>(null);
  const [marqueeStart, setMarqueeStart] = React.useState<{ x: number, y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = React.useState<{ x: number, y: number } | null>(null);
  const [isSpaceDown, setIsSpaceDown] = React.useState(false);

  const { zoom, panX, panY, selectedInstanceIds, tool } = editorState;

  // Grid settings
  const gridSize = 32;
  const snapToGrid = true;

  // Global key handlers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTool('select');
      }
      if (e.code === 'Space') {
        setIsSpaceDown(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          if (activeLayout && selectedInstanceIds.length > 0) {
            selectedInstanceIds.forEach(id => {
              removeInstance(activeLayout.id, id);
            });
            setSelectedInstances([]);
          }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setTool, activeLayout, selectedInstanceIds, removeInstance, setSelectedInstances]);

  // Zooming Fix: Non-passive wheel listener to prevent browser zoom
  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheelGlobal = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.1 : 0.9;
        const newZoom = Math.min(Math.max(zoom * factor, 0.1), 10);

        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom);
        const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom);

        setView(newZoom, newPanX, newPanY);
      } else {
        // Simple panning with wheel
        setView(zoom, panX - e.deltaX, panY - e.deltaY);
      }
    };

    el.addEventListener('wheel', handleWheelGlobal, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelGlobal);
  }, [zoom, panX, panY, setView]);

  // Instance Dragging
  React.useEffect(() => {
    if (!dragStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;

      initialPositions.forEach((pos, id) => {
        if (activeLayout) {
          let newX = pos.x + dx;
          let newY = pos.y + dy;

          if (snapToGrid) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
          }

          updateInstance(activeLayout.id, id, {
            x: Math.round(newX),
            y: Math.round(newY)
          });
        }
      });
    };

    const handleMouseUp = () => {
      setDragStart(null);
      setInitialPositions(new Map());
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, initialPositions, zoom, activeLayout, updateInstance, gridSize, snapToGrid]);

  // Panning
  React.useEffect(() => {
    if (!panStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setView(zoom, panStart.panX + dx, panStart.panY + dy);
    };

    const handleMouseUp = () => {
      setPanStart(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panStart, zoom, setView]);

  // Marquee Selection
  React.useEffect(() => {
    if (!marqueeStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - panX) / zoom;
      const y = (e.clientY - rect.top - panY) / zoom;
      setMarqueeEnd({ x, y });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (marqueeEnd && activeLayout) {
        const x1 = Math.min(marqueeStart.x, marqueeEnd.x);
        const y1 = Math.min(marqueeStart.y, marqueeEnd.y);
        const x2 = Math.max(marqueeStart.x, marqueeEnd.x);
        const y2 = Math.max(marqueeStart.y, marqueeEnd.y);

        const newlySelected = activeLayout.instances
          .filter(inst => {
            const ix1 = inst.x;
            const iy1 = inst.y;
            const ix2 = inst.x + inst.width;
            const iy2 = inst.y + inst.height;
            return ix1 < x2 && ix2 > x1 && iy1 < y2 && iy2 > y1;
          })
          .map(inst => inst.id);

        if (e.shiftKey) {
          const combined = Array.from(new Set([...selectedInstanceIds, ...newlySelected]));
          setSelectedInstances(combined);
        } else {
          setSelectedInstances(newlySelected);
        }
      }
      setMarqueeStart(null);
      setMarqueeEnd(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [marqueeStart, marqueeEnd, activeLayout, panX, panY, zoom, selectedInstanceIds, setSelectedInstances]);

  // Resizing and Rotation logic
  const [resizing, setResizing] = React.useState<{ 
    id: string, 
    handle: string, 
    startX: number, 
    startY: number, 
    initialX: number, 
    initialY: number, 
    initialW: number, 
    initialH: number,
    initialAngle: number,
    stationaryPoint: { x: number, y: number } // World coordinates of the opposite corner
  } | null>(null);

  React.useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { id, handle, initialAngle, stationaryPoint, initialW, initialH, initialX, initialY } = resizing;
      if (!activeLayout) return;

      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = (e.clientX - rect.left - panX) / zoom;
      const mouseY = (e.clientY - rect.top - panY) / zoom;

      const inst = activeLayout.instances.find(i => i.id === id);
      if (!inst) return;

      if (handle === 'rotate') {
        const centerX = inst.x + inst.width / 2;
        const centerY = inst.y + inst.height / 2;
        let angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
        angle = (angle + 90) % 360;
        if (angle < 0) angle += 360;
        if (e.shiftKey) angle = Math.round(angle / 15) * 15;
        updateInstance(activeLayout.id, id, { angle: Math.round(angle) });
        return;
      }

      // Resizing logic with stationary point
      const rad = initialAngle * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Mouse position relative to stationary point
      const dx = mouseX - stationaryPoint.x;
      const dy = mouseY - stationaryPoint.y;

      // Project mouse delta onto object axes
      let localW = dx * cos + dy * sin;
      let localH = -dx * sin + dy * cos;

      // Flip signs based on which handle we are dragging
      if (handle.includes('l')) localW = -localW;
      if (handle.includes('t')) localH = -localH;

      let newW = initialW;
      let newH = initialH;

      if (handle.includes('l') || handle.includes('r')) newW = Math.max(1, localW);
      if (handle.includes('t') || handle.includes('b')) newH = Math.max(1, localH);

      if (snapToGrid) {
        newW = Math.round(newW / gridSize) * gridSize;
        newH = Math.round(newH / gridSize) * gridSize;
      }

      // Calculate new top-left based on stationary point
      let newX = inst.x;
      let newY = inst.y;

      if (handle === 'br' || handle === 'r' || handle === 'b') {
        // Stationary point is on the left/top side (like tl, l, t)
        // For 'br', stationary is 'tl'
        // For 'r', stationary is center of left side
        // For 'b', stationary is center of top side
        newX = stationaryPoint.x + (handle === 'b' ? -newH * sin : 0);
        newY = stationaryPoint.y + (handle === 'b' ? newH * cos : 0);
      } else if (handle === 'tl' || handle === 'l' || handle === 't') {
        // Stationary point is on the right/bottom side
        newX = stationaryPoint.x - newW * cos + (handle === 'l' ? 0 : newH * sin);
        newY = stationaryPoint.y - newW * sin - (handle === 'l' ? 0 : newH * cos);
      } else if (handle === 'tr') {
        // Stationary point is 'bl'
        newX = stationaryPoint.x - newH * sin;
        newY = stationaryPoint.y + newH * cos;
      } else if (handle === 'bl') {
        // Stationary point is 'tr'
        newX = stationaryPoint.x - newW * cos;
        newY = stationaryPoint.y - newW * sin;
      }

      // Re-verify the side handles logic
      if (handle === 'r') {
        newX = stationaryPoint.x + (initialH / 2) * sin;
        newY = stationaryPoint.y - (initialH / 2) * cos;
      } else if (handle === 'l') {
        newX = stationaryPoint.x - newW * cos + (initialH / 2) * sin;
        newY = stationaryPoint.y - newW * sin - (initialH / 2) * cos;
      } else if (handle === 'b') {
        newX = stationaryPoint.x - (initialW / 2) * cos;
        newY = stationaryPoint.y - (initialW / 2) * sin;
      } else if (handle === 't') {
        newX = stationaryPoint.x - (initialW / 2) * cos + newH * sin;
        newY = stationaryPoint.y - (initialW / 2) * sin - newH * cos;
      }
      
      // Final Corner logic override for clarity
      if (handle === 'br') {
        newX = stationaryPoint.x;
        newY = stationaryPoint.y;
      } else if (handle === 'tl') {
        newX = stationaryPoint.x - newW * cos + newH * sin;
        newY = stationaryPoint.y - newW * sin - newH * cos;
      } else if (handle === 'tr') {
        newX = stationaryPoint.x + newH * sin;
        newY = stationaryPoint.y - newH * cos;
      } else if (handle === 'bl') {
        newX = stationaryPoint.x - newW * cos;
        newY = stationaryPoint.y - newW * sin;
      }

      updateInstance(activeLayout.id, id, {
        width: Math.round(newW),
        height: Math.round(newH),
        x: Math.round(newX),
        y: Math.round(newY)
      });
    };

    const handleMouseUp = () => setResizing(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, zoom, activeLayout, updateInstance, panX, panY, gridSize, snapToGrid]);

  if (!activeLayout) {
    return (
      <div style={{ flex: 1, backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        No Active Layout
      </div>
    );
  }

  const { width, height, layers, instances } = activeLayout;

  const handleMouseDown = (e: React.MouseEvent) => {
    const isMiddleButton = e.button === 1;
    const isPanTool = tool === 'pan' || isSpaceDown || isMiddleButton;

    if (isPanTool) {
      setPanStart({ x: e.clientX, y: e.clientY, panX, panY });
      return;
    }

    if (tool === 'select') {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - panX) / zoom;
      const y = (e.clientY - rect.top - panY) / zoom;
      setMarqueeStart({ x, y });
      setMarqueeEnd({ x, y });
      if (!e.shiftKey) setSelectedInstances([]);
    }
  };

  const handleInstanceMouseDown = (e: React.MouseEvent, instanceId: string) => {
    if (tool !== 'select' || isSpaceDown || e.button === 1) return;
    e.stopPropagation();

    let currentSelection = [...selectedInstanceIds];
    if (e.shiftKey) {
      if (currentSelection.includes(instanceId)) {
        currentSelection = currentSelection.filter(id => id !== instanceId);
      } else {
        currentSelection.push(instanceId);
      }
    } else {
      if (!currentSelection.includes(instanceId)) currentSelection = [instanceId];
    }
    
    setSelectedInstances(currentSelection);

    if (currentSelection.includes(instanceId)) {
      setDragStart({ x: e.clientX, y: e.clientY });
      const positions = new Map<string, { x: number, y: number }>();
      currentSelection.forEach(id => {
        const inst = instances.find(i => i.id === id);
        if (inst) positions.set(id, { x: inst.x, y: inst.y });
      });
      setInitialPositions(positions);
    }
  };

  const handleHandleMouseDown = (e: React.MouseEvent, instanceId: string, handle: string) => {
    e.stopPropagation();
    const inst = activeLayout?.instances.find(i => i.id === instanceId);
    if (!inst) return;

    const rad = inst.angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let stationaryPoint = { x: inst.x, y: inst.y };
    
    if (handle === 'tl') {
      stationaryPoint = { 
        x: inst.x + inst.width * cos - inst.height * sin, 
        y: inst.y + inst.width * sin + inst.height * cos 
      };
    } else if (handle === 'tr') {
      stationaryPoint = { 
        x: inst.x - inst.height * sin, 
        y: inst.y + inst.height * cos 
      };
    } else if (handle === 'bl') {
      stationaryPoint = { 
        x: inst.x + inst.width * cos, 
        y: inst.y + inst.width * sin 
      };
    } else if (handle === 'br') {
      stationaryPoint = { x: inst.x, y: inst.y };
    } else if (handle === 't') {
      stationaryPoint = { 
        x: inst.x + inst.width / 2 * cos - inst.height * sin, 
        y: inst.y + inst.width / 2 * sin + inst.height * cos 
      };
    } else if (handle === 'b') {
      stationaryPoint = { 
        x: inst.x + inst.width / 2 * cos, 
        y: inst.y + inst.width / 2 * sin 
      };
    } else if (handle === 'l') {
      stationaryPoint = { 
        x: inst.x + inst.width * cos - inst.height / 2 * sin, 
        y: inst.y + inst.width * sin + inst.height / 2 * cos 
      };
    } else if (handle === 'r') {
      stationaryPoint = { 
        x: inst.x - inst.height / 2 * sin, 
        y: inst.y + inst.height / 2 * cos 
      };
    }

    setResizing({
      id: instanceId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: inst.x,
      initialY: inst.y,
      initialW: inst.width,
      initialH: inst.height,
      initialAngle: inst.angle,
      stationaryPoint
    });
  };

  const handleViewportClick = (e: React.MouseEvent) => {
    if (tool !== 'place' || !editorState.placementObjectTypeId || !activeLayer) return;
    if (!activeLayer.visible || activeLayer.locked) return;

    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let x = (e.clientX - rect.left - panX) / zoom;
    let y = (e.clientY - rect.top - panY) / zoom;

    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    const newId = generateId();
    addInstance(activeLayout.id, editorState.placementObjectTypeId, activeLayer.id, Math.round(x), Math.round(y), newId);
    setSelectedInstances([newId]);
    setTool('select');
  };

  return (
    <div 
      className="viewport" 
      ref={viewportRef}
      style={{
        flex: 1,
        backgroundColor: '#1a1a1a',
        position: 'relative',
        overflow: 'hidden',
        cursor: (tool === 'pan' || isSpaceDown) ? 'grab' : (dragStart || resizing) ? 'grabbing' : 'default',
        outline: 'none'
      }}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onClick={handleViewportClick}
    >
      <svg width="100%" height="100%" style={{ display: 'block' }}>
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          <rect x={0} y={0} width={width} height={height} fill="#2a2a2a" />

          <defs>
            <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#333" strokeWidth={1 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }}/>
            </pattern>
            <pattern id="grid-large" width={gridSize * 4} height={gridSize * 4} patternUnits="userSpaceOnUse">
              <rect width={gridSize * 4} height={gridSize * 4} fill="url(#grid)" />
              <path d={`M ${gridSize * 4} 0 L 0 0 0 ${gridSize * 4}`} fill="none" stroke="#444" strokeWidth={2 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }}/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid-large)" pointerEvents="none" />

          {layers.map(layer => {
            if (!layer.visible) return null;
            return (
              <g key={layer.id} opacity={layer.opacity} style={{ pointerEvents: layer.locked ? 'none' : 'auto' }}>
                {instances.filter(inst => inst.layerId === layer.id).map(inst => {
                  const isSelected = selectedInstanceIds.includes(inst.id);
                  const objectType = project.objectTypes.find(ot => ot.id === inst.objectTypeId);
                  return (
                    <g 
                      key={inst.id} 
                      transform={`translate(${inst.x}, ${inst.y}) rotate(${inst.angle})`}
                      onMouseDown={(e) => handleInstanceMouseDown(e, inst.id)}
                      style={{ cursor: dragStart ? 'grabbing' : 'pointer' }}
                    >
                      <rect 
                        width={inst.width} height={inst.height} fill="#4a4a4a"
                        stroke={isSelected ? "#0099ff" : "#555"}
                        strokeWidth={isSelected ? 2 / zoom : 1 / zoom}
                        style={{ vectorEffect: 'non-scaling-stroke', opacity: inst.visible ? 1 : 0.3 }}
                      />
                      <text 
                        x={inst.width/2} y={inst.height/2} fontSize={Math.max(10 / zoom, 2)} fill="#aaa"
                        textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ userSelect: 'none' }}
                      >
                        {objectType?.name || 'Instance'}
                      </text>
                      {isSelected && <rect width={inst.width} height={inst.height} fill="rgba(0, 153, 255, 0.1)" pointerEvents="none" />}
                      
                      {isSelected && selectedInstanceIds.length === 1 && (
                        <g>
                          {[
                            { h: 'tl', x: 0, y: 0 }, { h: 't', x: inst.width / 2, y: 0 }, { h: 'tr', x: inst.width, y: 0 },
                            { h: 'r', x: inst.width, y: inst.height / 2 }, { h: 'br', x: inst.width, y: inst.height },
                            { h: 'b', x: inst.width / 2, y: inst.height }, { h: 'bl', x: 0, y: inst.height }, { h: 'l', x: 0, y: inst.height / 2 },
                          ].map(handle => (
                            <rect
                              key={handle.h} x={handle.x - 4 / zoom} y={handle.y - 4 / zoom} width={8 / zoom} height={8 / zoom}
                              fill="white" stroke="#0099ff" strokeWidth={1 / zoom}
                              style={{ cursor: 'crosshair', vectorEffect: 'non-scaling-stroke' }}
                              onMouseDown={(e) => handleHandleMouseDown(e, inst.id, handle.h)}
                            />
                          ))}
                          <line x1={inst.width / 2} y1={0} x2={inst.width / 2} y2={-20 / zoom} stroke="#0099ff" strokeWidth={1 / zoom} />
                          <circle
                            cx={inst.width / 2} cy={-20 / zoom} r={5 / zoom} fill="white" stroke="#0099ff" strokeWidth={1 / zoom}
                            style={{ cursor: 'alias', vectorEffect: 'non-scaling-stroke' }}
                            onMouseDown={(e) => handleHandleMouseDown(e, inst.id, 'rotate')}
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {marqueeStart && marqueeEnd && (
            <rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)} y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)} height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              fill="rgba(0, 153, 255, 0.1)" stroke="#0099ff" strokeWidth={1 / zoom}
              style={{ vectorEffect: 'non-scaling-stroke' }} pointerEvents="none"
            />
          )}

          <rect x={0} y={0} width={width} height={height} fill="none" stroke="#666" strokeWidth={2 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }} pointerEvents="none" />
        </g>
      </svg>

      <div style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(20,20,20,0.8)', color: '#ccc', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', pointerEvents: 'none', display: 'flex', gap: '15px', border: '1px solid #444', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Layout: {width} × {height}</span>
        <span>Tool: {tool.toUpperCase()}</span>
      </div>

      <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: '#666', fontSize: '10px', pointerEvents: 'none' }}>
        Space+Drag to Pan | Ctrl+Wheel to Zoom | Shift+Drag to Multiselect
      </div>
    </div>
  );
};
