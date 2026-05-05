import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Project, ObjectTypeKind, Instance } from '../../model/project';
import { generateId } from '../../utils/id';
import { Rulers } from './Rulers';
import { InsertObjectDialog } from './InsertObjectDialog';
import { Trash2, Copy, Grid, Zap, Maximize, Settings, MousePointer2, Info, Layout as LayoutIcon, AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown } from 'lucide-react';
import { getEffectsFilter } from '../../utils/renderUtils';
import { ViewportInstance } from './ViewportInstance';

export const Viewport: React.FC = () => {
  const { 
    project, 
    editorState,
    setSelectedInstances,
    updateInstanceSilently,
    updateInstancesSilently,
    commitProject,
    addInstance,
    addObjectType,
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
    setGridSettings,
    setGridSettingsDialogOpen,
    setRulerSettings
  } = useEditorStore();
  
  const activeLayout = project.layouts?.find(l => l.id === editorState.activeLayoutId);
  const activeLayer = activeLayout?.layers?.find(layer => layer.id === editorState.activeLayerId);
  
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = React.useState<{ x: number, y: number, isClone?: boolean } | null>(null);
  const [initialPositions, setInitialPositions] = React.useState<Map<string, { x: number, y: number }>>(new Map());
  const [panStart, setPanStart] = React.useState<{ x: number, y: number, panX: number, panY: number } | null>(null);
  const [marqueeStart, setMarqueeStart] = React.useState<{ x: number, y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = React.useState<{ x: number, y: number } | null>(null);
  const [isSpaceDown, setIsSpaceDown] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, instanceId?: string } | null>(null);
  const [insertDialogPos, setInsertDialogPos] = React.useState<{ x: number, y: number } | null>(null);
  const [currentRotation, setCurrentRotation] = React.useState<number | null>(null);

  const { zoom, panX, panY, selectedInstanceIds, highlightedInstanceIds, tool, gridSizeW, gridSizeH, gridOffsetX, gridOffsetY, gridColor, gridOpacity, snapToGrid, showGrid, showRulers } = editorState;
  
  

  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (!viewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  const centerLayout = React.useCallback((targetZoom?: number) => {
    if (!activeLayout || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const rulerOffset = showRulers ? 22 : 0;
    const availableWidth = rect.width - rulerOffset;
    const availableHeight = rect.height - rulerOffset;
    
    const useZoom = targetZoom || zoom;
    const vWidth = project.settings.viewportWidth;
    const vHeight = project.settings.viewportHeight;
    const newPanX = (availableWidth - vWidth * useZoom) / 2;
    const newPanY = (availableHeight - vHeight * useZoom) / 2;
    
    setView(useZoom, newPanX, newPanY);
  }, [activeLayout, zoom, showRulers, setView, project.settings]);

  // Auto-center on first load or when layout changes if not yet centered
  const [lastLayoutId, setLastLayoutId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (activeLayout && containerSize.width > 0 && activeLayout.id !== lastLayoutId) {
      centerLayout();
      setLastLayoutId(activeLayout.id);
    }
  }, [activeLayout, containerSize, lastLayoutId, centerLayout]);

  // Global key handlers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editorState.previewMode) return;
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
          const amountX = e.shiftKey ? gridSizeW : 1;
          const amountY = e.shiftKey ? gridSizeH : 1;
          const dx = e.key === 'ArrowLeft' ? -amountX : e.key === 'ArrowRight' ? amountX : 0;
          const dy = e.key === 'ArrowUp' ? -amountY : e.key === 'ArrowDown' ? amountY : 0;
          
          if (activeLayout) {
            const updates: Record<string, any> = {};
            selectedInstanceIds.forEach(id => {
              const inst = activeLayout.instances.find(i => i.id === id);
              if (inst) {
                updates[id] = { x: inst.x + dx, y: inst.y + dy };
              }
            });
            if (Object.keys(updates).length > 0) {
              updateInstancesSilently(activeLayout.id, updates);
              commitProject();
            }
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
          centerLayout();
        }
      }
      if (e.key.toLowerCase() === 'g') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          if (e.shiftKey) {
            setGridSettingsDialogOpen(true);
          } else {
            setGridSettings(undefined, undefined, undefined, !showGrid);
          }
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
  }, [setTool, activeLayout, selectedInstanceIds, removeInstance, setSelectedInstances, gridSizeW, gridSizeH, gridOffsetX, gridOffsetY, gridColor, gridOpacity, undo, redo, copySelected, pasteInstances, cutSelected, cloneInstance, editorState.previewMode, setGridSettingsDialogOpen, setGridSettings, showGrid, centerLayout]);

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
        const mx = e.clientX - rect.left - (showRulers ? 22 : 0);
        const my = e.clientY - rect.top - (showRulers ? 22 : 0);
        const newPanX = mx - (mx - panX) * (newZoom / zoom);
        const newPanY = my - (my - panY) * (newZoom / zoom);
        
        // Update CSS variables immediately for smoothness
        el.style.setProperty('--pan-x', `${newPanX}px`);
        el.style.setProperty('--pan-y', `${newPanY}px`);
        
        setView(newZoom, newPanX, newPanY);
      } else if (e.shiftKey) {
        e.preventDefault();
        const newPanX = panX - e.deltaY;
        el.style.setProperty('--pan-x', `${newPanX}px`);
        setView(zoom, newPanX, panY); 
      } else {
        const newPanX = panX - e.deltaX;
        const newPanY = panY - e.deltaY;
        el.style.setProperty('--pan-x', `${newPanX}px`);
        el.style.setProperty('--pan-y', `${newPanY}px`);
        setView(zoom, newPanX, newPanY);
      }
    };
    el.addEventListener('wheel', handleWheelGlobal, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelGlobal);
  }, [zoom, panX, panY, setView, showRulers]);

  const [snapLines, setSnapLines] = React.useState<{ x?: number, y?: number }[]>([]);

  // Instance Dragging
  const dragRaf = React.useRef<number | null>(null);
  const scrollInterval = React.useRef<number | null>(null);
  
  React.useEffect(() => {
    if (!dragStart) {
      if (scrollInterval.current) { clearInterval(scrollInterval.current); scrollInterval.current = null; }
      return;
    }
    const handleMouseMove = (e: MouseEvent) => {
      // Auto-scrolling logic
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const margin = 50;
      let scrollX = 0;
      let scrollY = 0;
      
      if (e.clientX < rect.left + margin) scrollX = 10;
      else if (e.clientX > rect.right - margin) scrollX = -10;
      
      if (e.clientY < rect.top + margin) scrollY = 10;
      else if (e.clientY > rect.bottom - margin) scrollY = -10;

      if (scrollX !== 0 || scrollY !== 0) {
        if (!scrollInterval.current) {
          scrollInterval.current = window.setInterval(() => {
            const el = viewportRef.current;
            if (el) {
              const currentPanX = parseFloat(el.style.getPropertyValue('--pan-x')) || 0;
              const currentPanY = parseFloat(el.style.getPropertyValue('--pan-y')) || 0;
              const newPanX = currentPanX + scrollX;
              const newPanY = currentPanY + scrollY;
              el.style.setProperty('--pan-x', `${newPanX}px`);
              el.style.setProperty('--pan-y', `${newPanY}px`);
              setView(zoom, newPanX, newPanY);
            }
          }, 16);
        }
      } else {
        if (scrollInterval.current) { clearInterval(scrollInterval.current); scrollInterval.current = null; }
      }

      if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
      dragRaf.current = requestAnimationFrame(() => {
        const dx = (e.clientX - dragStart.x) / zoom;
        const dy = (e.clientY - dragStart.y) / zoom;
        
        const activeSnaps: { x?: number, y?: number }[] = [];
        
        // Use the first selected instance as a reference for snapping to avoid clumping
        const refId = Array.from(initialPositions.keys())[0];
        const refPos = initialPositions.get(refId);
        
        if (activeLayout && refId && refPos) {
          let targetX = refPos.x + dx;
          let targetY = refPos.y + dy;
          
          if (e.shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) targetY = refPos.y;
            else targetX = refPos.x;
          }

          if (snapToGrid) {
            targetX = Math.round((targetX - gridOffsetX) / gridSizeW) * gridSizeW + gridOffsetX;
            targetY = Math.round((targetY - gridOffsetY) / gridSizeH) * gridSizeH + gridOffsetY;
          }

          // Smart Guides (Object Snapping)
          const snapThreshold = 10 / zoom;
          const refInst = activeLayout.instances.find(i => i.id === refId);
          
          if (refInst) {
            const others = [
              ...activeLayout.instances.filter(i => !selectedInstanceIds.includes(i.id)),
              { x: 0, y: 0, width: activeLayout.width, height: activeLayout.height, isLayout: true },
              { x: 0, y: 0, width: project.settings.viewportWidth, height: project.settings.viewportHeight, isViewport: true }
            ];

            others.forEach(other => {
              const otherEdgesX = [other.x, other.x + (other as any).width / 2, other.x + (other as any).width];
              const myEdgesX = [targetX, targetX + refInst.width / 2, targetX + refInst.width];
              
              myEdgesX.forEach((myX) => {
                otherEdgesX.forEach((othX) => {
                  if (Math.abs(myX - othX) < snapThreshold) {
                    targetX += (othX - myX);
                    activeSnaps.push({ x: othX });
                  }
                });
              });

              const otherEdgesY = [other.y, other.y + (other as any).height / 2, other.y + (other as any).height];
              const myEdgesY = [targetY, targetY + refInst.height / 2, targetY + refInst.height];
              
              myEdgesY.forEach((myY) => {
                otherEdgesY.forEach((othY) => {
                  if (Math.abs(myY - othY) < snapThreshold) {
                    targetY += (othY - myY);
                    activeSnaps.push({ y: othY });
                  }
                });
              });
            });
          }

          const snappedDeltaX = targetX - refPos.x;
          const snappedDeltaY = targetY - refPos.y;

          const updates: Record<string, any> = {};
          initialPositions.forEach((pos, id) => {
            updates[id] = { 
              x: Math.round(pos.x + snappedDeltaX), 
              y: Math.round(pos.y + snappedDeltaY) 
            };
          });
          updateInstancesSilently(activeLayout.id, updates);
        }
        setSnapLines(activeSnaps);
      });
    };
    const handleMouseUp = () => {
      if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
      if (scrollInterval.current) { clearInterval(scrollInterval.current); scrollInterval.current = null; }
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
  }, [dragStart, initialPositions, zoom, activeLayout, updateInstancesSilently, commitProject, gridSizeW, gridSizeH, snapToGrid, selectedInstanceIds, project.settings.viewportWidth, project.settings.viewportHeight, gridOffsetX, gridOffsetY]);

  // Panning
  const panRaf = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!panStart) return;
    const el = viewportRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (panRaf.current) cancelAnimationFrame(panRaf.current);
      panRaf.current = requestAnimationFrame(() => {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        const newX = panStart.panX + dx;
        const newY = panStart.panY + dy;
        
        el.style.setProperty('--pan-x', `${newX}px`);
        el.style.setProperty('--pan-y', `${newY}px`);
        setView(zoom, newX, newY);
      });
    };
    const handleMouseUp = () => {
      if (panRaf.current) cancelAnimationFrame(panRaf.current);
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
      
      const mx = e.clientX - rect.left - (showRulers ? 22 : 0);
      const my = e.clientY - rect.top - (showRulers ? 22 : 0);
      const mouseX = (mx - panX) / zoom;
      const mouseY = (my - panY) / zoom;

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
        
        const updates: Record<string, any> = {};
        ids.forEach(id => {
          const init = initialInstances.get(id);
          if (!init) return;
          
          if (ids.length === 1) {
            updates[id] = { angle: Math.round(targetAngle) };
            setCurrentRotation(Math.round(targetAngle));
          } else {
            const rad = targetAngle * (Math.PI / 180);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            const instCenterX = init.x + init.w / 2;
            const instCenterY = init.y + init.h / 2;
            
            const dx = instCenterX - pivotX;
            const dy = instCenterY - pivotY;
            
            const newCenterX = pivotX + (dx * cos - dy * sin);
            const newCenterY = pivotY + (dx * sin + dy * cos);
            
            updates[id] = {
              x: Math.round(newCenterX - init.w / 2),
              y: Math.round(newCenterY - init.h / 2),
              angle: init.angle + targetAngle
            };
            setCurrentRotation(Math.round(targetAngle));
          }
        });
        updateInstancesSilently(activeLayout.id, updates);
        return;
      }

      // Group Resizing
      let currentMouseX = mouseX;
      let currentMouseY = mouseY;

      if (snapToGrid) {
        currentMouseX = Math.round((currentMouseX - gridOffsetX) / gridSizeW) * gridSizeW + gridOffsetX;
        currentMouseY = Math.round((currentMouseY - gridOffsetY) / gridSizeH) * gridSizeH + gridOffsetY;
      }

      const dx = currentMouseX - stationaryPoint.x;
      const dy = currentMouseY - stationaryPoint.y;
      
      let scaleX = Math.abs(dx / initialAABB.w);
      let scaleY = Math.abs(dy / initialAABB.h);

      scaleX = Math.max(0.01, scaleX);
      scaleY = Math.max(0.01, scaleY);

      if (e.shiftKey && handle.length === 2) {
        const uniformScale = Math.max(scaleX, scaleY);
        scaleX = uniformScale;
        scaleY = uniformScale;
      }

      const currentAABBW = initialAABB.w * scaleX;
      const currentAABBH = initialAABB.h * scaleY;
      const currentAABBX = handle.includes('l') ? stationaryPoint.x - currentAABBW : initialAABB.x;
      const currentAABBY = handle.includes('t') ? stationaryPoint.y - currentAABBH : initialAABB.y;

      const updates: Record<string, any> = {};
      ids.forEach(id => {
        const init = initialInstances.get(id);
        if (!init) return;

        const offsetX = (init.x - initialAABB.x) / initialAABB.w;
        const offsetY = (init.y - initialAABB.y) / initialAABB.h;
        const offsetW = init.w / initialAABB.w;
        const offsetH = init.h / initialAABB.h;

        updates[id] = {
          x: Math.round(currentAABBX + offsetX * currentAABBW),
          y: Math.round(currentAABBY + offsetY * currentAABBH),
          width: Math.max(1, Math.round(offsetW * currentAABBW)),
          height: Math.max(1, Math.round(offsetH * currentAABBH))
        };
      });
      updateInstancesSilently(activeLayout.id, updates);
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
// ... (MouseDown logic remains same)
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
      const mx = e.clientX - rect.left - (showRulers ? 22 : 0);
      const my = e.clientY - rect.top - (showRulers ? 22 : 0);
      const x = (mx - panX) / zoom;
      const y = (my - panY) / zoom;
      setMarqueeStart({ x, y });
      setMarqueeEnd({ x, y });
      if (!e.shiftKey) setSelectedInstances([]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const worldX = (rawX - (showRulers ? 22 : 0) - panX) / zoom;
    const worldY = (rawY - (showRulers ? 22 : 0) - panY) / zoom;
    const inst = instances.find(i => worldX >= i.x && worldX <= i.x + i.width && worldY >= i.y && worldY <= i.y + i.height);
    setContextMenu({ x: rawX, y: rawY, instanceId: inst?.id });
  };

  const [selectionIndex, setSelectionIndex] = React.useState(0);

  const handleInstanceMouseDown = (e: React.MouseEvent, instanceId: string) => {
    if (tool !== 'select' || isSpaceDown || e.button !== 0) return;
    e.stopPropagation();
    
    // Selection Cycling logic
    const rect = viewportRef.current?.getBoundingClientRect();
    if (rect) {
      const mx = e.clientX - rect.left - (showRulers ? 22 : 0);
      const my = e.clientY - rect.top - (showRulers ? 22 : 0);
      const x = (mx - panX) / zoom;
      const y = (my - panY) / zoom;
      
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
    const mx = e.clientX - rect.left - (showRulers ? 22 : 0);
    const my = e.clientY - rect.top - (showRulers ? 22 : 0);
    let x = (mx - panX) / zoom;
    let y = (my - panY) / zoom;
    if (snapToGrid) { x = Math.round(x / gridSizeW) * gridSizeW; y = Math.round(y / gridSizeH) * gridSizeH; }
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

    const mx = e.clientX - rect.left - (showRulers ? 22 : 0);
    const my = e.clientY - rect.top - (showRulers ? 22 : 0);
    let x = (mx - panX) / zoom;
    let y = (my - panY) / zoom;
    
    if (snapToGrid) {
      x = Math.round(x / gridSizeW) * gridSizeW;
      y = Math.round(y / gridSizeH) * gridSizeH;
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

    const updates: Record<string, any> = {};
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
      updates[inst.id] = { x: Math.round(newX), y: Math.round(newY) };
    });
    updateInstancesSilently(activeLayout.id, updates);
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
    const mx = e.clientX - rect.left - (showRulers ? 22 : 0);
    const my = e.clientY - rect.top - (showRulers ? 22 : 0);
    const lx = (mx - panX) / zoom;
    const ly = (my - panY) / zoom;
    setMouseLayoutPos({ x: Math.round(lx), y: Math.round(ly) });
    useEditorStore.getState().setMousePosition(Math.round(lx), Math.round(ly));
  };

  const contextMenuItemStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: '13px', color: '#ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background-color 0.1s', userSelect: 'none'
  };

  return (
    <div 
      className="viewport" ref={viewportRef}
      style={{ 
        flex: 1, height: '100%', width: '100%', backgroundColor: '#2b2b2b', position: 'relative', overflow: 'hidden', 
        cursor: (tool === 'pan' || isSpaceDown) ? (panStart ? 'grabbing' : 'grab') : (tool === 'place') ? 'crosshair' : (dragStart || resizing) ? 'grabbing' : 'default', 
        outline: 'none', display: 'flex', flexDirection: 'column',
        opacity: lastLayoutId ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
        '--pan-x': `${panX}px`,
        '--pan-y': `${panY}px`,
        '--zoom': zoom,
        '--ruler-offset': `${showRulers ? 22 : 0}px`
      } as React.CSSProperties}
      tabIndex={0} onMouseDown={handleMouseDown} onContextMenu={handleContextMenu} onClick={handleViewportClick} onMouseMove={handleMouseMoveGlobal}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={handleDrop}
      onDoubleClick={(e) => {
        if (e.button !== 0) return;
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left - (showRulers ? 22 : 0);
        const my = e.clientY - rect.top - (showRulers ? 22 : 0);
        const x = (mx - panX) / zoom;
        const y = (my - panY) / zoom;
        setInsertDialogPos({ x, y });
      }}
    >
      {insertDialogPos && (
        <InsertObjectDialog 
          onClose={() => setInsertDialogPos(null)}
          onSelect={(kind, name) => {
            if (activeLayout && activeLayer) {
              const otId = generateId();
              addObjectType(name, kind, otId);
              addInstance(activeLayout.id, otId, activeLayer.id, Math.round(insertDialogPos.x), Math.round(insertDialogPos.y));
            }
            setInsertDialogPos(null);
          }}
        />
      )}
      {showRulers && (
        <Rulers 
          zoom={zoom} 
          panX={panX} 
          panY={panY} 
          layoutWidth={width} 
          layoutHeight={height} 
          viewportWidth={project.settings.viewportWidth}
          viewportHeight={project.settings.viewportHeight}
          mouseX={mouseLayoutPos.x}
          mouseY={mouseLayoutPos.y}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      )}
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        .context-menu-item:hover { background-color: rgba(255,255,255,0.05); color: #fff !important; }
      `}</style>
      
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#161617' }}>
        <svg 
          width="100%" height="100%" 
          style={{ display: 'block', minWidth: '100%', minHeight: '100%' }}
        >
          <defs>
            <pattern id="workspace-dots" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.02)" />
            </pattern>
            <filter id="canvasShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="12" floodOpacity="0.5"/>
            </filter>
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
            
            {showGrid && (
              <>
                <pattern id="grid-major" width={gridSizeW * 4} height={gridSizeH * 4} patternUnits="userSpaceOnUse" patternTransform={`translate(${gridOffsetX}, ${gridOffsetY})`}>
                  {/* Minor lines */}
                  <path 
                    d={`M ${gridSizeW} 0 L ${gridSizeW} ${gridSizeH * 4} M ${gridSizeW * 2} 0 L ${gridSizeW * 2} ${gridSizeH * 4} M ${gridSizeW * 3} 0 L ${gridSizeW * 3} ${gridSizeH * 4} M 0 ${gridSizeH} L ${gridSizeW * 4} ${gridSizeH} M 0 ${gridSizeH * 2} L ${gridSizeW * 4} ${gridSizeH * 2} M 0 ${gridSizeH * 3} L ${gridSizeW * 4} ${gridSizeH * 3}`} 
                    fill="none" stroke={gridColor} strokeWidth={0.5 / zoom} opacity={gridOpacity * (zoom < 0.4 ? 0.1 : 0.3)} style={{ vectorEffect: 'non-scaling-stroke' }} 
                  />
                  {/* Major lines */}
                  <path 
                    d={`M ${gridSizeW * 4} 0 L 0 0 0 ${gridSizeH * 4}`} 
                    fill="none" stroke={gridColor} strokeWidth={1 / zoom} opacity={gridOpacity * (zoom < 0.2 ? 0.2 : 0.8)} style={{ vectorEffect: 'non-scaling-stroke' }} 
                  />
                </pattern>
                <rect x={-50000} y={-50000} width={100000} height={100000} fill="none" pointerEvents="none" />
              </>
            )}
          </defs>

          <g style={{ transform: 'translate3d(calc(var(--ruler-offset) + var(--pan-x)), calc(var(--ruler-offset) + var(--pan-y)), 0) scale(var(--zoom))', willChange: 'transform' }}>
            {/* Workspace Background (Infinite) */}
            <rect x={-20000} y={-20000} width={40000} height={40000} fill="#161617" />
            <rect x={-20000} y={-20000} width={40000} height={40000} fill="url(#workspace-dots)" />
            {showGrid && <rect x={-20000} y={-20000} width={40000} height={40000} fill="url(#grid-major)" opacity={0.3} pointerEvents="none" />}
            
            {/* Orientation Guides */}
            <g pointerEvents="none">
              {/* Layout Center Crosshair */}
              <line x1={width / 2} y1={height / 2 - 20 / zoom} x2={width / 2} y2={height / 2 + 20 / zoom} stroke="rgba(255,255,255,0.4)" strokeWidth={2 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }} />
              <line x1={width / 2 - 20 / zoom} y1={height / 2} x2={width / 2 + 20 / zoom} y2={height / 2} stroke="rgba(255,255,255,0.4)" strokeWidth={2 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }} />
              <circle cx={width / 2} cy={height / 2} r={4 / zoom} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }} />

              {/* Viewport Boundary Extended Guides (Infinite Lines) */}
              <g opacity={0.15}>
                <line x1={0} y1={-20000} x2={0} y2={20000} stroke="#007acc" strokeWidth={1 / zoom} strokeDasharray={`${8/zoom} ${8/zoom}`} style={{ vectorEffect: 'non-scaling-stroke' }} />
                <line x1={project.settings.viewportWidth} y1={-20000} x2={project.settings.viewportWidth} y2={20000} stroke="#007acc" strokeWidth={1 / zoom} strokeDasharray={`${8/zoom} ${8/zoom}`} style={{ vectorEffect: 'non-scaling-stroke' }} />
                <line x1={-20000} y1={0} x2={20000} y2={0} stroke="#007acc" strokeWidth={1 / zoom} strokeDasharray={`${8/zoom} ${8/zoom}`} style={{ vectorEffect: 'non-scaling-stroke' }} />
                <line x1={-20000} y1={project.settings.viewportHeight} x2={20000} y2={project.settings.viewportHeight} stroke="#007acc" strokeWidth={1 / zoom} strokeDasharray={`${8/zoom} ${8/zoom}`} style={{ vectorEffect: 'non-scaling-stroke' }} />
              </g>
            </g>
            
            {/* Layout Canvas with shadow/distinct border */}
            <rect 
              x={0} y={0} width={width} height={height} 
              fill="#252526" 
              stroke="#111" strokeWidth={1 / zoom} 
              filter="url(#canvasShadow)"
              style={{ vectorEffect: 'non-scaling-stroke' }} 
            />
            
            {showGrid && (
              <rect width={width} height={height} fill="url(#grid-major)" pointerEvents="none" />
            )}

            {/* Viewport Window Boundary (Project Settings) */}
            <rect 
              x={0} y={0} width={project.settings.viewportWidth} height={project.settings.viewportHeight} 
              fill="none" stroke="#007acc" strokeWidth={2 / zoom} strokeDasharray={`${8/zoom} ${4/zoom}`}
              opacity={0.5}
              style={{ vectorEffect: 'non-scaling-stroke' }} pointerEvents="none" 
            />
            
            {layers.map(layer => {
              if (!layer.visible) return null;
              return (
                <g 
                  key={layer.id} 
                  opacity={layer.opacity} 
                  style={{ 
                    pointerEvents: layer.locked ? 'none' : 'auto',
                    filter: getEffectsFilter(layer.effects)
                  }}
                >
                  {instances.filter(inst => inst.layerId === layer.id).map(inst => (
                    <ViewportInstance
                      key={inst.id}
                      inst={inst}
                      isSelected={selectedInstanceIds.includes(inst.id)}
                      isHighlighted={highlightedInstanceIds.includes(inst.id)}
                      project={project}
                      zoom={zoom}
                      onMouseDown={handleInstanceMouseDown}
                      onHandleMouseDown={handleHandleMouseDown}
                      getHandleCursor={getHandleCursor}
                      selectedInstanceIdsCount={selectedInstanceIds.length}
                    />
                  ))}
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

            {/* Live Watchers */}
            {editorState.showWatchers && activeLayout.instances.map(inst => {
              const objectType = project.objectTypes.find(ot => ot.id === inst.objectTypeId);
              if (!objectType) return null;
              
              const families = project.families.filter(f => f.objectTypeIds.includes(inst.objectTypeId));
              const watchedVars = [
                ...(objectType.instanceVariables || []).filter(v => v.watcherEnabled),
                ...families.flatMap(f => (f.instanceVariables || []).filter(v => v.watcherEnabled))
              ];
              
              if (watchedVars.length === 0) return null;
              
              const totalHeight = watchedVars.length * 14 + 6;
              const yPos = inst.y - totalHeight / zoom - (10 / zoom);

              return (
                <g key={`watcher-${inst.id}`} transform={`translate(${inst.x}, ${yPos}) scale(${1/zoom})`}>
                  <rect 
                    width={120} 
                    height={totalHeight} 
                    rx={4} 
                    fill="rgba(0,0,0,0.75)" 
                    stroke="rgba(255,255,255,0.2)" 
                    strokeWidth={1} 
                    style={{ backdropFilter: 'blur(8px)' }}
                  />
                  {watchedVars.map((v, i) => (
                    <text 
                      key={v.id}
                      x={6} 
                      y={14 + i * 14} 
                      fill="#fff" 
                      style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600 }}
                    >
                      {v.name}: {inst.properties[v.name] ?? v.initialValue}
                    </text>
                  ))}
                </g>
              );
            })}

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
                    <Trash2 size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>Delete</span> <span style={{ color: '#666', fontSize: '10px' }}>Del</span>
                  </div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { cloneInstance(activeLayout.id, contextMenu.instanceId!); setContextMenu(null); }}>
                    <Copy size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>Clone</span> <span style={{ color: '#666', fontSize: '10px' }}>Ctrl+D</span>
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                  <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', fontWeight: 'bold', letterSpacing: '0.05em' }}>Z ORDER</div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { reorderInstance(activeLayout.id, contextMenu.instanceId!, 'front'); setContextMenu(null); }}>
                    <ArrowUp size={12} style={{ marginRight: '8px', color: '#2ecc71' }} />
                    <span style={{ flex: 1 }}>Send to Top</span>
                  </div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { reorderInstance(activeLayout.id, contextMenu.instanceId!, 'back'); setContextMenu(null); }}>
                    <ArrowDown size={12} style={{ marginRight: '8px', color: '#e74c3c' }} />
                    <span style={{ flex: 1 }}>Send to Bottom</span>
                  </div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { reorderInstance(activeLayout.id, contextMenu.instanceId!, 'forward'); setContextMenu(null); }}>
                    <ArrowUp size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>Move Forward</span>
                  </div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { reorderInstance(activeLayout.id, contextMenu.instanceId!, 'backward'); setContextMenu(null); }}>
                    <ArrowDown size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>Move Backward</span>
                  </div>
                  
                  {selectedInstanceIds.length > 1 && (
                    <>
                      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                      <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', fontWeight: 'bold', letterSpacing: '0.05em' }}>ALIGN</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '0 8px', gap: '2px' }}>
                        <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '6px', justifyContent: 'center', borderRadius: '4px' }} onClick={() => alignSelection('left')} title="Align Left"><AlignLeft size={14} /></div>
                        <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '6px', justifyContent: 'center', borderRadius: '4px' }} onClick={() => alignSelection('center')} title="Align Center"><AlignCenter size={14} /></div>
                        <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '6px', justifyContent: 'center', borderRadius: '4px' }} onClick={() => alignSelection('right')} title="Align Right"><AlignRight size={14} /></div>
                        <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '6px', justifyContent: 'center', borderRadius: '4px' }} onClick={() => alignSelection('top')} title="Align Top"><ArrowUp size={14} /></div>
                        <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '6px', justifyContent: 'center', borderRadius: '4px' }} onClick={() => alignSelection('middle')} title="Align Middle"><span style={{ fontWeight: 'bold' }}>—</span></div>
                        <div className="context-menu-item" style={{ ...contextMenuItemStyle, padding: '6px', justifyContent: 'center', borderRadius: '4px' }} onClick={() => alignSelection('bottom')} title="Align Bottom"><ArrowDown size={14} /></div>
                      </div>
                    </>
                  )}

                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                  <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', fontWeight: 'bold', letterSpacing: '0.05em' }}>TRANSFORM</div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { 
                    selectedInstanceIds.forEach(id => {
                      const inst = activeLayout.instances.find(i => i.id === id);
                      if (inst) updateInstanceSilently(activeLayout.id, id, { 
                        x: Math.round(inst.x / gridSizeW) * gridSizeW, 
                        y: Math.round(inst.y / gridSizeH) * gridSizeH 
                      });
                    });
                    commitProject();
                    setContextMenu(null);
                  }}>
                    <Grid size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    Align to Grid
                  </div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { 
                    selectedInstanceIds.forEach(id => updateInstanceSilently(activeLayout.id, id, { angle: 0 }));
                    commitProject();
                    setContextMenu(null);
                  }}>
                    <Maximize size={12} style={{ marginRight: '8px', opacity: 0.7, transform: 'rotate(45deg)' }} />
                    Reset Rotation
                  </div>
                  
                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                  <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', fontWeight: 'bold', letterSpacing: '0.05em' }}>ORDER</div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { reorderInstance(activeLayout.id, contextMenu.instanceId!, 'front'); setContextMenu(null); }}>
                    <ArrowUp size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    Bring to Front
                  </div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { reorderInstance(activeLayout.id, contextMenu.instanceId!, 'back'); setContextMenu(null); }}>
                    <ArrowDown size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    Send to Back
                  </div>
                </>
              ) : (
                <>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { setSelectedInstances(activeLayout.instances.map(i => i.id)); setContextMenu(null); }}>
                    <MousePointer2 size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>Select All</span>
                  </div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { centerLayout(1); setContextMenu(null); }}>
                    <Maximize size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>Center View</span> <span style={{ color: '#666', fontSize: '10px' }}>Ctrl+0</span>
                  </div>
                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                  <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', fontWeight: 'bold', letterSpacing: '0.05em' }}>GRID</div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { setGridSettings(undefined, undefined, undefined, !showGrid); setContextMenu(null); }}>
                    <Grid size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>Show Grid</span> <span style={{ color: showGrid ? '#4caf50' : '#666' }}>{showGrid ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { setGridSettings(undefined, undefined, !snapToGrid, undefined); setContextMenu(null); }}>
                    <Zap size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>Snap to Grid</span> <span style={{ color: snapToGrid ? '#4caf50' : '#666' }}>{snapToGrid ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => { setRulerSettings(!showRulers); setContextMenu(null); }}>
                    <Maximize size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>Show Rulers</span> <span style={{ color: showRulers ? '#4caf50' : '#666' }}>{showRulers ? 'ON' : 'OFF'}</span>
                  </div>
                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                  <div className="context-menu-item" style={contextMenuItemStyle} onClick={() => {
                    setGridSettingsDialogOpen(true);
                    setContextMenu(null);
                  }}>
                    <Settings size={12} style={{ marginRight: '8px', opacity: 0.7 }} />
                    Edit Grid...
                  </div>
                </>
              )}
          </div>
        )}
      </div>


    </div>
  );
};

