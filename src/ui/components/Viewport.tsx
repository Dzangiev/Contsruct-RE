import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { generateId } from '../../utils/id';

export const Viewport: React.FC = () => {
  const { 
    project, 
    editorState,
    setSelectedInstances,
    updateInstanceSilently,
    commitProject,
    addInstance,
    cloneInstance,
    removeInstance,
    reorderInstance,
    setTool,
    setView,
    undo,
    redo,
    copySelected,
    pasteInstances,
    cutSelected,
    setGridSettings
  } = useEditorStore();
  
  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const activeLayer = activeLayout?.layers.find(layer => layer.id === editorState.activeLayerId);
  
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = React.useState<{ x: number, y: number, isClone?: boolean } | null>(null);
  const [initialPositions, setInitialPositions] = React.useState<Map<string, { x: number, y: number }>>(new Map());
  const [panStart, setPanStart] = React.useState<{ x: number, y: number, panX: number, panY: number } | null>(null);
  const [marqueeStart, setMarqueeStart] = React.useState<{ x: number, y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = React.useState<{ x: number, y: number } | null>(null);
  const [isSpaceDown, setIsSpaceDown] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, instanceId?: string } | null>(null);
  const [currentRotation, setCurrentRotation] = React.useState<number | null>(null);

  const { zoom, panX, panY, selectedInstanceIds, tool, gridSize, snapToGrid, showGrid } = editorState;

  // Global key handlers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTool('select');
        setContextMenu(null);
      }
      if (e.code === 'Space') setIsSpaceDown(true);
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          if (activeLayout && selectedInstanceIds.length > 0) {
            selectedInstanceIds.forEach(id => removeInstance(activeLayout.id, id));
            setSelectedInstances([]);
          }
        }
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const amount = e.shiftKey ? gridSize : 1;
          const dx = e.key === 'ArrowLeft' ? -amount : e.key === 'ArrowRight' ? amount : 0;
          const dy = e.key === 'ArrowUp' ? -amount : e.key === 'ArrowDown' ? amount : 0;
          
          if (activeLayout) {
            selectedInstanceIds.forEach(id => {
              const inst = activeLayout.instances.find(i => i.id === id);
              if (inst) {
                updateInstanceSilently(activeLayout.id, id, { x: inst.x + dx, y: inst.y + dy });
              }
            });
            commitProject();
          }
        }
      }

      // Clipboard and other shortcuts
      if (e.ctrlKey || e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          copySelected();
        }
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          pasteInstances();
        }
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault();
          cutSelected();
        }
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          if (activeLayout && selectedInstanceIds.length > 0) {
             selectedInstanceIds.forEach(id => cloneInstance(activeLayout.id, id));
          }
        }
        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          if (activeLayout) {
            setSelectedInstances(activeLayout.instances.map(i => i.id));
          }
        }
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
        if (e.key === '0') {
          e.preventDefault();
          setView(1, 50, 50);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setTool, activeLayout, selectedInstanceIds, removeInstance, setSelectedInstances, gridSize, undo, redo, copySelected, pasteInstances, cutSelected, cloneInstance]);

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
      } else if (e.shiftKey) {
        e.preventDefault();
        setView(zoom, panX - e.deltaY, panY); // Shift + Wheel = Horizontal scroll
      } else {
        setView(zoom, panX - e.deltaX, panY - e.deltaY);
      }
    };
    el.addEventListener('wheel', handleWheelGlobal, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelGlobal);
  }, [zoom, panX, panY, setView]);

  const [snapLines, setSnapLines] = React.useState<{ x?: number, y?: number }[]>([]);

  // Instance Dragging
  React.useEffect(() => {
    if (!dragStart) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      
      const activeSnaps: { x?: number, y?: number }[] = [];
      
      initialPositions.forEach((pos, id) => {
        if (activeLayout) {
          let newX = pos.x + dx;
          let newY = pos.y + dy;
          
          if (e.shiftKey) {
            // Constrain to axis
            if (Math.abs(dx) > Math.abs(dy)) newY = pos.y;
            else newX = pos.x;
          }

          if (snapToGrid) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
          }

          // Smart Guides (Object Snapping)
          const snapThreshold = 10 / zoom;
          const inst = activeLayout.instances.find(i => i.id === id);
          if (inst) {
            const others = [
              ...activeLayout.instances.filter(i => !selectedInstanceIds.includes(i.id)),
              // Also snap to Layout boundaries
              { x: 0, y: 0, width: activeLayout.width, height: activeLayout.height, isLayout: true },
              // Also snap to Viewport Window
              { x: 0, y: 0, width: project.settings.viewportWidth, height: project.settings.viewportHeight, isViewport: true }
            ];

            others.forEach(other => {
              // X snaps (Left, Center, Right)
              const otherEdgesX = [other.x, other.x + other.width / 2, other.x + other.width];
              const myEdgesX = [newX, newX + inst.width / 2, newX + inst.width];
              
              myEdgesX.forEach((myX, myIdx) => {
                otherEdgesX.forEach((othX, othIdx) => {
                  if (Math.abs(myX - othX) < snapThreshold) {
                    const offset = othX - myX;
                    newX += offset;
                    activeSnaps.push({ x: othX });
                  }
                });
              });

              // Y snaps (Top, Center, Bottom)
              const otherEdgesY = [other.y, other.y + other.height / 2, other.y + other.height];
              const myEdgesY = [newY, newY + inst.height / 2, newY + inst.height];
              
              myEdgesY.forEach((myY, myIdx) => {
                otherEdgesY.forEach((othY, othIdx) => {
                  if (Math.abs(myY - othY) < snapThreshold) {
                    const offset = othY - myY;
                    newY += offset;
                    activeSnaps.push({ y: othY });
                  }
                });
              });
            });
          }

          updateInstanceSilently(activeLayout.id, id, { x: Math.round(newX), y: Math.round(newY) });
        }
      });
      setSnapLines(activeSnaps);
    };
    const handleMouseUp = () => {
      setDragStart(null);
      setInitialPositions(new Map());
      setSnapLines([]);
      commitProject();
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, initialPositions, zoom, activeLayout, updateInstanceSilently, commitProject, gridSize, snapToGrid, selectedInstanceIds, project.settings.viewportWidth, project.settings.viewportHeight]);

  // Panning
  React.useEffect(() => {
    if (!panStart) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setView(zoom, panStart.panX + dx, panStart.panY + dy);
    };
    const handleMouseUp = () => setPanStart(null);
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
    ids: string[], 
    handle: string, 
    stationaryPoint: { x: number, y: number },
    initialAABB: { x: number, y: number, w: number, h: number },
    initialInstances: Map<string, { x: number, y: number, w: number, h: number, angle: number }>
  } | null>(null);

  React.useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const { ids, handle, stationaryPoint, initialAABB, initialInstances } = resizing;
      if (!activeLayout) return;
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = (e.clientX - rect.left - panX) / zoom;
      const mouseY = (e.clientY - rect.top - panY) / zoom;

      // Group Rotation
      if (handle === 'rotate') {
        const pivotX = initialAABB.x + initialAABB.w / 2;
        const pivotY = initialAABB.y + initialAABB.h / 2;
        
        let targetAngle = Math.atan2(mouseY - pivotY, mouseX - pivotX) * (180 / Math.PI);
        targetAngle = (targetAngle + 90) % 360;
        if (targetAngle < 0) targetAngle += 360;
        if (e.shiftKey) targetAngle = Math.round(targetAngle / 15) * 15;
        
        const rotationDelta = targetAngle; // Since initial was 0 relative to pivot for the mouse
        // Actually, we need the delta relative to the START of the drag.
        // But for simplicity in many editors, they just set the angle of the group.
        // Let's calculate the delta.
        
        const startAngle = Math.atan2((stationaryPoint.y - pivotY), (stationaryPoint.x - pivotX)) * (180 / Math.PI);
        // Wait, stationaryPoint for rotate is the start mouse pos.
        
        ids.forEach(id => {
          const init = initialInstances.get(id);
          if (!init) return;
          
          if (ids.length === 1) {
            updateInstanceSilently(activeLayout.id, id, { angle: Math.round(targetAngle) });
            setCurrentRotation(Math.round(targetAngle));
          } else {
            const rad = targetAngle * (Math.PI / 180);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            // Rotate each object around the group pivot
            const instCenterX = init.x + init.w / 2;
            const instCenterY = init.y + init.h / 2;
            
            const dx = instCenterX - pivotX;
            const dy = instCenterY - pivotY;
            
            // This is a bit complex because initial state might already be rotated.
            // For now, let's just do individual rotation if more than 1.
            // Actually, let's do the proper math.
            const newCenterX = pivotX + (dx * cos - dy * sin);
            const newCenterY = pivotY + (dx * sin + dy * cos);
            
            updateInstanceSilently(activeLayout.id, id, {
              x: Math.round(newCenterX - init.w / 2),
              y: Math.round(newCenterY - init.h / 2),
              angle: init.angle + targetAngle
            });
            setCurrentRotation(Math.round(targetAngle));
          }
        });
        return;
      }

      // Group Resizing
      const dx = mouseX - stationaryPoint.x;
      const dy = mouseY - stationaryPoint.y;
      
      let scaleX = 1;
      let scaleY = 1;

      if (handle.includes('r')) scaleX = dx / initialAABB.w;
      if (handle.includes('l')) scaleX = -dx / initialAABB.w;
      if (handle.includes('b')) scaleY = dy / initialAABB.h;
      if (handle.includes('t')) scaleY = -dy / initialAABB.h;

      scaleX = Math.max(0.01, scaleX);
      scaleY = Math.max(0.01, scaleY);

      if (e.shiftKey && handle.length === 2) {
        const uniformScale = Math.max(scaleX, scaleY);
        scaleX = uniformScale;
        scaleY = uniformScale;
      }

      ids.forEach(id => {
        const init = initialInstances.get(id);
        if (!init) return;

        const offsetX = (init.x - initialAABB.x) / initialAABB.w;
        const offsetY = (init.y - initialAABB.y) / initialAABB.h;
        const offsetW = init.w / initialAABB.w;
        const offsetH = init.h / initialAABB.h;

        const currentAABBW = initialAABB.w * scaleX;
        const currentAABBH = initialAABB.h * scaleY;
        const currentAABBX = handle.includes('l') ? stationaryPoint.x - currentAABBW : initialAABB.x;
        const currentAABBY = handle.includes('t') ? stationaryPoint.y - currentAABBH : initialAABB.y;

        updateInstanceSilently(activeLayout.id, id, {
          x: Math.round(currentAABBX + offsetX * currentAABBW),
          y: Math.round(currentAABBY + offsetY * currentAABBH),
          width: Math.round(offsetW * currentAABBW),
          height: Math.round(offsetH * currentAABBH)
        });
      });
    };
    const handleMouseUp = () => {
      setResizing(null);
      setCurrentRotation(null);
      commitProject();
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, zoom, activeLayout, updateInstanceSilently, commitProject, panX, panY]);

  if (!activeLayout) return <div style={{ flex: 1, backgroundColor: '#333' }} />;

  const { width, height, layers, instances } = activeLayout;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return; // Right click handled separately
    setContextMenu(null);
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const worldX = (localX - panX) / zoom;
    const worldY = (localY - panY) / zoom;
    const inst = instances.find(i => worldX >= i.x && worldX <= i.x + i.width && worldY >= i.y && worldY <= i.y + i.height);
    setContextMenu({ x: localX, y: localY, instanceId: inst?.id });
  };

  const [selectionIndex, setSelectionIndex] = React.useState(0);

  const handleInstanceMouseDown = (e: React.MouseEvent, instanceId: string) => {
    if (tool !== 'select' || isSpaceDown || e.button !== 0) return;
    e.stopPropagation();
    
    // Selection Cycling logic
    const rect = viewportRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left - panX) / zoom;
      const y = (e.clientY - rect.top - panY) / zoom;
      
      const objectsAtPoint = instances.filter(inst => {
        const layer = layers.find(l => l.id === inst.layerId);
        if (!layer || !layer.visible || layer.locked) return false;
        return x >= inst.x && x <= inst.x + inst.width && y >= inst.y && y <= inst.y + inst.height;
      }).reverse(); // Topmost first

      if (objectsAtPoint.length > 1 && selectedInstanceIds.includes(instanceId)) {
        const nextIdx = (selectionIndex + 1) % objectsAtPoint.length;
        setSelectionIndex(nextIdx);
        setSelectedInstances([objectsAtPoint[nextIdx].id]);
        return;
      } else {
        setSelectionIndex(0);
      }
    }

    let currentSelection = [...selectedInstanceIds];
    
    if (e.altKey) {
      // Alt+Drag: Duplicate
      if (!currentSelection.includes(instanceId)) {
        currentSelection = [instanceId];
        setSelectedInstances(currentSelection);
      }
      currentSelection.forEach(id => cloneInstance(activeLayout.id, id));
    } else {
      if (e.shiftKey) {
        if (currentSelection.includes(instanceId)) currentSelection = currentSelection.filter(id => id !== instanceId);
        else currentSelection.push(instanceId);
      } else {
        if (!currentSelection.includes(instanceId)) currentSelection = [instanceId];
      }
      setSelectedInstances(currentSelection);
    }

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

  const handleHandleMouseDown = (e: React.MouseEvent, ids: string[], handle: string) => {
    e.stopPropagation();
    if (!activeLayout) return;
    const selectedInstances = instances.filter(i => ids.includes(i.id));
    if (selectedInstances.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedInstances.forEach(inst => {
      minX = Math.min(minX, inst.x);
      minY = Math.min(minY, inst.y);
      maxX = Math.max(maxX, inst.x + inst.width);
      maxY = Math.max(maxY, inst.y + inst.height);
    });

    const initialAABB = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    const initialInstances = new Map();
    selectedInstances.forEach(i => initialInstances.set(i.id, { x: i.x, y: i.y, w: i.width, h: i.height, angle: i.angle }));

    let stationaryPoint = { x: minX, y: minY };
    if (handle.includes('l')) stationaryPoint.x = maxX;
    if (handle.includes('t')) stationaryPoint.y = maxY;
    if (handle.includes('r')) stationaryPoint.x = minX;
    if (handle.includes('b')) stationaryPoint.y = minY;

    setResizing({ ids, handle, stationaryPoint, initialAABB, initialInstances });
  };

  const handleViewportClick = (e: React.MouseEvent) => {
    if (tool !== 'place' || !editorState.placementObjectTypeId || !activeLayer) return;
    if (!activeLayer.visible || activeLayer.locked) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x = (e.clientX - rect.left - panX) / zoom;
    let y = (e.clientY - rect.top - panY) / zoom;
    if (snapToGrid) { x = Math.round(x / gridSize) * gridSize; y = Math.round(y / gridSize) * gridSize; }
    const newId = generateId();
    addInstance(activeLayout.id, editorState.placementObjectTypeId, activeLayer.id, Math.round(x), Math.round(y), newId);
    setSelectedInstances([newId]);
    setTool('select');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const objectTypeId = e.dataTransfer.getData('objectTypeId');
    if (!objectTypeId || !activeLayer || !activeLayout) return;
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
    addInstance(activeLayout.id, objectTypeId, activeLayer.id, Math.round(x), Math.round(y), newId);
    setSelectedInstances([newId]);
  };

  const alignSelection = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedInstanceIds.length < 2) return;
    const selectedInstances = instances.filter(i => selectedInstanceIds.includes(i.id));
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedInstances.forEach(inst => {
      minX = Math.min(minX, inst.x);
      minY = Math.min(minY, inst.y);
      maxX = Math.max(maxX, inst.x + inst.width);
      maxY = Math.max(maxY, inst.y + inst.height);
    });

    selectedInstances.forEach(inst => {
      let newX = inst.x;
      let newY = inst.y;
      switch (type) {
        case 'left': newX = minX; break;
        case 'center': newX = minX + (maxX - minX) / 2 - inst.width / 2; break;
        case 'right': newX = maxX - inst.width; break;
        case 'top': newY = minY; break;
        case 'middle': newY = minY + (maxY - minY) / 2 - inst.height / 2; break;
        case 'bottom': newY = maxY - inst.height; break;
      }
      updateInstanceSilently(activeLayout.id, inst.id, { x: Math.round(newX), y: Math.round(newY) });
    });
    commitProject();
    setContextMenu(null);
  };

  const getHandleCursor = (handle: string, angle: number) => {
// ... (rest of getHandleCursor remains same)
    if (handle === 'rotate') return 'alias';
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    const cursorMap: any = { 't': 'n', 'tr': 'ne', 'r': 'e', 'br': 'se', 'b': 's', 'bl': 'sw', 'l': 'w', 'tl': 'nw' };
    const baseDir = cursorMap[handle];
    if (!baseDir) return 'pointer';
    const baseIdx = directions.indexOf(baseDir);
    const rotationSteps = Math.round(angle / 45);
    const newIdx = (baseIdx + rotationSteps + 8) % 8;
    const finalDir = directions[newIdx];
    const standardCursors: any = { 'n': 'ns-resize', 's': 'ns-resize', 'e': 'ew-resize', 'w': 'ew-resize', 'ne': 'nesw-resize', 'sw': 'nesw-resize', 'nw': 'nwse-resize', 'se': 'nwse-resize' };
    return standardCursors[finalDir] || 'pointer';
  };

  const [mouseLayoutPos, setMouseLayoutPos] = React.useState({ x: 0, y: 0 });

  const handleMouseMoveGlobal = (e: React.MouseEvent) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round((e.clientX - rect.left - panX) / zoom);
    const y = Math.round((e.clientY - rect.top - panY) / zoom);
    setMouseLayoutPos({ x, y });
  };

  const contextMenuItemStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: '13px', color: '#ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background-color 0.1s', userSelect: 'none'
  };

  return (
    <div 
      className="viewport" ref={viewportRef}
      style={{ 
        flex: 1, backgroundColor: '#0a0a0a', position: 'relative', overflow: 'hidden', 
        cursor: (tool === 'pan' || isSpaceDown) ? 'grab' : (dragStart || resizing) ? 'grabbing' : 'default', 
        outline: 'none', display: 'flex', flexDirection: 'column'
      }}
      tabIndex={0} onMouseDown={handleMouseDown} onContextMenu={handleContextMenu} onClick={handleViewportClick} onMouseMove={handleMouseMoveGlobal}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={handleDrop}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .context-menu-item:hover { background-color: rgba(255,255,255,0.05); color: #fff !important; }
      `}</style>
      
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg width="100%" height="100%" style={{ display: 'block' }}>
          <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
            {/* Workspace Background */}
            <rect x={-10000} y={-10000} width={20000} height={20000} fill="#050505" />
            
            {/* Layout Canvas with shadow/distinct border */}
            <rect x={0} y={0} width={width} height={height} fill="#1e1e1e" stroke="#000" strokeWidth={1 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }} />
            
            {showGrid && (
              <>
                <defs>
                  <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                    <circle cx={1 / zoom} cy={1 / zoom} r={1 / zoom} fill="rgba(255,255,255,0.1)" />
                  </pattern>
                  <pattern id="grid-large" width={gridSize * 4} height={gridSize * 4} patternUnits="userSpaceOnUse">
                    <rect width={gridSize * 4} height={gridSize * 4} fill="url(#grid)" />
                    <circle cx={2 / zoom} cy={2 / zoom} r={1.5 / zoom} fill="rgba(255,255,255,0.4)" />
                  </pattern>
                </defs>
                <rect width={width} height={height} fill="url(#grid-large)" pointerEvents="none" />
              </>
            )}

            <filter id="handleShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
              <feOffset dx="0" dy="1" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Viewport Window Boundary (Project Settings) - CLEARER VISUAL */}
            <rect 
              x={0} y={0} width={project.settings.viewportWidth} height={project.settings.viewportHeight} 
              fill="none" stroke="#555" strokeWidth={2 / zoom} strokeDasharray={`${10/zoom} ${5/zoom}`}
              style={{ vectorEffect: 'non-scaling-stroke' }} pointerEvents="none" 
            />
            
            {layers.map(layer => {
              if (!layer.visible) return null;
              return (
                <g key={layer.id} opacity={layer.opacity} style={{ pointerEvents: layer.locked ? 'none' : 'auto' }}>
                  {instances.filter(inst => inst.layerId === layer.id).map(inst => {
                    const isSelected = selectedInstanceIds.includes(inst.id);
                    const objectType = project.objectTypes.find(ot => ot.id === inst.objectTypeId);
                    return (
                      <g key={inst.id} transform={`translate(${inst.x}, ${inst.y}) rotate(${inst.angle})`} onMouseDown={(e) => handleInstanceMouseDown(e, inst.id)} opacity={inst.opacity}>
                        <rect width={inst.width} height={inst.height} fill="#4a4a4a" stroke={isSelected ? "#0099ff" : "#555"} strokeWidth={isSelected ? 2 / zoom : 1 / zoom} style={{ vectorEffect: 'non-scaling-stroke', opacity: inst.visible ? 1 : 0.3 }} />
                        {isSelected && <rect width={inst.width} height={inst.height} fill="none" stroke="#0099ff" strokeWidth={1 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }} pointerEvents="none" />}
                        <text x={inst.width/2} y={inst.height/2} fontSize={Math.max(10 / zoom, 2)} fill="#aaa" textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ userSelect: 'none' }}>{objectType?.name || 'Instance'}</text>
                        {isSelected && (
                          <g>
                            <rect width={inst.width} height={inst.height} fill="rgba(0, 153, 255, 0.1)" pointerEvents="none" />
                            {selectedInstanceIds.length === 1 && (
                              <g>
                                {[
                                  { h: 'tl', x: 0, y: 0 }, { h: 't', x: inst.width / 2, y: 0 }, { h: 'tr', x: inst.width, y: 0 },
                                  { h: 'r', x: inst.width, y: inst.height / 2 }, { h: 'br', x: inst.width, y: inst.height },
                                  { h: 'b', x: inst.width / 2, y: inst.height }, { h: 'bl', x: 0, y: inst.height }, { h: 'l', x: 0, y: inst.height / 2 },
                                ].map(handle => (
                                  <rect 
                                    key={handle.h} x={handle.x - 4 / zoom} y={handle.y - 4 / zoom} 
                                    width={8 / zoom} height={8 / zoom} fill="white" stroke="#0099ff" 
                                    strokeWidth={1 / zoom} filter="url(#handleShadow)"
                                    style={{ cursor: getHandleCursor(handle.h, inst.angle), vectorEffect: 'non-scaling-stroke' }} 
                                    onMouseDown={(e) => handleHandleMouseDown(e, [inst.id], handle.h)} 
                                  />
                                ))}
                                <line x1={inst.width / 2} y1={0} x2={inst.width / 2} y2={-20 / zoom} stroke="#0099ff" strokeWidth={1.5 / zoom} />
                                <circle 
                                  cx={inst.width / 2} cy={-20 / zoom} r={5 / zoom} 
                                  fill="white" stroke="#0099ff" strokeWidth={1 / zoom} 
                                  filter="url(#handleShadow)"
                                  style={{ cursor: 'alias', vectorEffect: 'non-scaling-stroke' }} 
                                  onMouseDown={(e) => handleHandleMouseDown(e, [inst.id], 'rotate')} 
                                />
                              </g>
                            )}
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {marqueeStart && marqueeEnd && <rect x={Math.min(marqueeStart.x, marqueeEnd.x)} y={Math.min(marqueeStart.y, marqueeEnd.y)} width={Math.abs(marqueeEnd.x - marqueeStart.x)} height={Math.abs(marqueeEnd.y - marqueeStart.y)} fill="rgba(0, 153, 255, 0.05)" stroke="#0099ff" strokeWidth={1 / zoom} strokeDasharray={`${4/zoom} ${2/zoom}`} style={{ vectorEffect: 'non-scaling-stroke' }} pointerEvents="none" />}

            {selectedInstanceIds.length > 1 && (() => {
              const selectedInstances = instances.filter(i => selectedInstanceIds.includes(i.id));
              if (selectedInstances.length === 0) return null;
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              selectedInstances.forEach(inst => {
                minX = Math.min(minX, inst.x); minY = Math.min(minY, inst.y);
                maxX = Math.max(maxX, inst.x + inst.width); maxY = Math.max(maxY, inst.y + inst.height);
              });
              return (
                <g>
                  <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="none" stroke="#0099ff" strokeWidth={1 / zoom} strokeDasharray={`${4/zoom} ${4/zoom}`} style={{ vectorEffect: 'non-scaling-stroke' }} />
                  {[
                    { h: 'tl', x: minX, y: minY }, { h: 't', x: minX + (maxX - minX) / 2, y: minY }, { h: 'tr', x: maxX, y: minY },
                    { h: 'r', x: maxX, y: minY + (maxY - minY) / 2 }, { h: 'br', x: maxX, y: maxY },
                    { h: 'b', x: minX + (maxX - minX) / 2, y: maxY }, { h: 'bl', x: minX, y: maxY }, { h: 'l', x: minX, y: minY + (maxY - minY) / 2 }
                  ].map(handle => (
                    <rect 
                      key={handle.h} x={handle.x - 4 / zoom} y={handle.y - 4 / zoom} 
                      width={8 / zoom} height={8 / zoom} fill="white" stroke="#0099ff" 
                      strokeWidth={1 / zoom} filter="url(#handleShadow)"
                      style={{ cursor: getHandleCursor(handle.h, 0), vectorEffect: 'non-scaling-stroke' }} 
                      onMouseDown={(e) => handleHandleMouseDown(e, selectedInstanceIds, handle.h)} 
                    />
                  ))}
                  <line x1={minX + (maxX - minX) / 2} y1={minY} x2={minX + (maxX - minX) / 2} y2={minY - 20 / zoom} stroke="#0099ff" strokeWidth={1.5 / zoom} />
                  <circle 
                    cx={minX + (maxX - minX) / 2} cy={minY - 20 / zoom} r={5 / zoom} 
                    fill="white" stroke="#0099ff" strokeWidth={1 / zoom} 
                    filter="url(#handleShadow)"
                    style={{ cursor: 'alias', vectorEffect: 'non-scaling-stroke' }} 
                    onMouseDown={(e) => handleHandleMouseDown(e, selectedInstanceIds, 'rotate')} 
                  />
                </g>
              );
            })()}

            {/* Layout Boundary Outline */}
            <rect x={0} y={0} width={width} height={height} fill="none" stroke="#444" strokeWidth={1 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }} pointerEvents="none" />
            
            {snapLines.map((line, i) => (
              <React.Fragment key={i}>
                {line.x !== undefined && <line x1={line.x} y1={-10000} x2={line.x} y2={10000} stroke="#ff00ff" strokeWidth={1 / zoom} strokeDasharray={`${4/zoom} ${4/zoom}`} style={{ vectorEffect: 'non-scaling-stroke' }} />}
                {line.y !== undefined && <line x1={-10000} y1={line.y} x2={10000} y2={line.y} stroke="#ff00ff" strokeWidth={1 / zoom} strokeDasharray={`${4/zoom} ${4/zoom}`} style={{ vectorEffect: 'non-scaling-stroke' }} />}
              </React.Fragment>
            ))}
          </g>
        </svg>

        {/* Visual Scrollbars (Mimic Construct 3's overlay scrollbars) */}
        <div className="scrollbar" style={{ position: 'absolute', right: '4px', top: '10%', bottom: '10%', width: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', opacity: 0.3, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
           <div style={{ position: 'absolute', top: `${Math.max(0, Math.min(90, -panY / 40))}%`, height: '10%', width: '100%', backgroundColor: '#666', borderRadius: '2px' }} />
        </div>
        <div className="scrollbar" style={{ position: 'absolute', bottom: '4px', left: '10%', right: '10%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', opacity: 0.3, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
           <div style={{ position: 'absolute', left: `${Math.max(0, Math.min(90, -panX / 40))}%`, width: '10%', height: '100%', backgroundColor: '#666', borderRadius: '2px' }} />
        </div>

        {currentRotation !== null && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 1000
          }}>
            Angle: {currentRotation}°
          </div>
        )}

        {contextMenu && (
          <div 
            onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'absolute', top: contextMenu.y, left: contextMenu.x, 
              backgroundColor: 'rgba(30, 30, 30, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '8px', padding: '6px 0', zIndex: 1000, minWidth: '180px', 
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'fadeIn 0.1s ease-out'
            }}
          >
             {contextMenu.instanceId ? (
               <>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { removeInstance(activeLayout.id, contextMenu.instanceId!); setSelectedInstances([]); setContextMenu(null); }}>
                   <span style={{ flex: 1 }}>Delete</span> <span style={{ color: '#666', fontSize: '10px' }}>Del</span>
                 </div>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { cloneInstance(activeLayout.id, contextMenu.instanceId!); setContextMenu(null); }}>
                   <span style={{ flex: 1 }}>Clone</span> <span style={{ color: '#666', fontSize: '10px' }}>Ctrl+D</span>
                 </div>
                 
                 {selectedInstanceIds.length > 1 && (
                   <>
                     <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                     <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', fontWeight: 'bold', letterSpacing: '0.05em' }}>ALIGN</div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0 8px' }}>
                       <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '4px', justifyContent: 'center' }} onClick={() => alignSelection('left')} title="Align Left">L</div>
                       <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '4px', justifyContent: 'center' }} onClick={() => alignSelection('center')} title="Align Center">C</div>
                       <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '4px', justifyContent: 'center' }} onClick={() => alignSelection('right')} title="Align Right">R</div>
                       <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '4px', justifyContent: 'center' }} onClick={() => alignSelection('top')} title="Align Top">T</div>
                       <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '4px', justifyContent: 'center' }} onClick={() => alignSelection('middle')} title="Align Middle">M</div>
                       <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '4px', justifyContent: 'center' }} onClick={() => alignSelection('bottom')} title="Align Bottom">B</div>
                     </div>
                   </>
                 )}

                 <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                 <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', fontWeight: 'bold', letterSpacing: '0.05em' }}>TRANSFORM</div>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { 
                   selectedInstanceIds.forEach(id => {
                     const inst = activeLayout.instances.find(i => i.id === id);
                     if (inst) updateInstanceSilently(activeLayout.id, id, { 
                       x: Math.round(inst.x / gridSize) * gridSize, 
                       y: Math.round(inst.y / gridSize) * gridSize 
                     });
                   });
                   commitProject();
                   setContextMenu(null);
                 }}>Align to Grid</div>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { 
                   selectedInstanceIds.forEach(id => updateInstanceSilently(activeLayout.id, id, { angle: 0 }));
                   commitProject();
                   setContextMenu(null);
                 }}>Reset Rotation</div>
                 
                 <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                 <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', fontWeight: 'bold', letterSpacing: '0.05em' }}>ORDER</div>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { reorderInstance(activeLayout.id, contextMenu.instanceId!, 'front'); setContextMenu(null); }}>Bring to Front</div>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { reorderInstance(activeLayout.id, contextMenu.instanceId!, 'back'); setContextMenu(null); }}>Send to Back</div>
               </>
             ) : (
               <>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { setSelectedInstances(activeLayout.instances.map(i => i.id)); setContextMenu(null); }}>Select All</div>
                 <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                 <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', fontWeight: 'bold', letterSpacing: '0.05em' }}>GRID</div>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { setGridSettings(undefined, undefined, !showGrid); setContextMenu(null); }}>
                   <span style={{ flex: 1 }}>Show Grid</span> <span style={{ color: showGrid ? '#4caf50' : '#666' }}>{showGrid ? 'ON' : 'OFF'}</span>
                 </div>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { setGridSettings(undefined, !snapToGrid, undefined); setContextMenu(null); }}>
                   <span style={{ flex: 1 }}>Snap to Grid</span> <span style={{ color: snapToGrid ? '#4caf50' : '#666' }}>{snapToGrid ? 'ON' : 'OFF'}</span>
                 </div>
                 <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { setGridSettings(16); setContextMenu(null); }}>Grid Size: 16</div>
                 <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { setGridSettings(32); setContextMenu(null); }}>Grid Size: 32</div>
               </>
             )}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(20,20,20,0.8)', color: '#ccc', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', pointerEvents: 'none', display: 'flex', gap: '15px', border: '1px solid #444', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 100 }}>
        <span>X: {mouseLayoutPos.x}, Y: {mouseLayoutPos.y}</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>{selectedInstanceIds.length} objects selected</span>
        <span>Grid: {gridSize}px ({snapToGrid ? 'Snap' : 'Free'})</span>
      </div>
    </div>
  );
};

