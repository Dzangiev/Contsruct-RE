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
    setTool
  } = useEditorStore();
  
  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const activeLayer = activeLayout?.layers.find(layer => layer.id === editorState.activeLayerId);
  
  const [dragStart, setDragStart] = React.useState<{ x: number, y: number } | null>(null);
  const [initialPositions, setInitialPositions] = React.useState<Map<string, { x: number, y: number }>>(new Map());

  const { zoom, panX, panY, selectedInstanceIds } = editorState;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTool('select');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool]);

  React.useEffect(() => {
    if (!dragStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;

      initialPositions.forEach((pos, id) => {
        if (activeLayout) {
          updateInstance(activeLayout.id, id, {
            x: Math.round(pos.x + dx),
            y: Math.round(pos.y + dy)
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
  }, [dragStart, initialPositions, zoom, activeLayout, updateInstance]);

  if (!activeLayout) {
    return (
      <div style={{ 
        flex: 1, 
        backgroundColor: '#333', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666'
      }}>
        No Active Layout
      </div>
    );
  }

  const { width, height, layers, instances } = activeLayout;

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (editorState.tool !== 'select') return;
    setSelectedInstances([]);
  };

  const handleInstanceMouseDown = (e: React.MouseEvent, instanceId: string) => {
    if (editorState.tool !== 'select') return;
    e.stopPropagation();

    let currentSelection = selectedInstanceIds;
    if (!selectedInstanceIds.includes(instanceId)) {
      currentSelection = [instanceId];
      setSelectedInstances(currentSelection);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
    
    const positions = new Map<string, { x: number, y: number }>();
    currentSelection.forEach(id => {
      const inst = instances.find(i => i.id === id);
      if (inst) {
        positions.set(id, { x: inst.x, y: inst.y });
      }
    });
    setInitialPositions(positions);
  };

  const handleViewportClick = (e: React.MouseEvent) => {
    if (editorState.tool !== 'place' || !editorState.placementObjectTypeId || !activeLayout || !activeLayer) return;
    
    // Prevent placement on hidden or locked layers
    if (!activeLayer.visible || activeLayer.locked) {
      return;
    }

    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;

    const newId = generateId();
    addInstance(
      activeLayout.id, 
      editorState.placementObjectTypeId, 
      activeLayer.id, 
      Math.round(x), 
      Math.round(y), 
      newId
    );
    
    setSelectedInstances([newId]);
    setTool('select');
  };

  // Grid settings
  const gridSize = 32;

  return (
    <div className="viewport" style={{
      flex: 1,
      backgroundColor: '#1a1a1a',
      position: 'relative',
      overflow: 'hidden',
      cursor: editorState.tool === 'pan' ? 'grab' : dragStart ? 'grabbing' : 'default'
    }}>
      <svg 
        width="100%" 
        height="100%" 
        style={{ display: 'block' }}
        onMouseDown={handleBackgroundMouseDown}
        onClick={handleViewportClick}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {/* Layout Background */}
          <rect 
            id="bg-rect"
            x={0} y={0} 
            width={width} height={height} 
            fill="#2a2a2a" 
          />

          {/* Grid Pattern */}
          <defs>
            <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#3a3a3a" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" pointerEvents="none" />

          {/* Layers and Instances */}
          {layers.map(layer => {
            if (!layer.visible) return null;

            const layerInstances = instances.filter(inst => inst.layerId === layer.id);
            
            return (
              <g 
                key={layer.id} 
                opacity={layer.opacity} 
                style={{ pointerEvents: layer.locked ? 'none' : 'auto' }}
              >
                {layerInstances.map(inst => {
                  const isSelected = selectedInstanceIds.includes(inst.id);
                  const objectType = project.objectTypes.find(ot => ot.id === inst.objectTypeId);
                  
                  return (
                    <g 
                      key={inst.id} 
                      transform={`translate(${inst.x}, ${inst.y}) rotate(${inst.angle}, ${inst.width/2}, ${inst.height/2})`}
                      onMouseDown={(e) => handleInstanceMouseDown(e, inst.id)}
                      style={{ cursor: dragStart ? 'grabbing' : 'pointer' }}
                    >
                      {/* Instance Rectangle */}
                      <rect 
                        width={inst.width} 
                        height={inst.height} 
                        fill="#4a4a4a"
                        stroke={isSelected ? "#0099ff" : "#666"}
                        strokeWidth={isSelected ? 2 / zoom : 1 / zoom}
                        style={{ 
                          vectorEffect: 'non-scaling-stroke',
                          opacity: inst.visible ? 1 : 0.3 
                        }}
                      />
                      
                      {/* Instance Label */}
                      <text 
                        x={inst.width/2} 
                        y={inst.height/2} 
                        fontSize={Math.max(10 / zoom, 2)}
                        fill="#aaa"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        pointerEvents="none"
                        style={{ userSelect: 'none' }}
                      >
                        {objectType?.name || 'Instance'}
                      </text>

                      {/* Selection Highlight */}
                      {isSelected && (
                        <rect 
                          width={inst.width} 
                          height={inst.height} 
                          fill="rgba(0, 153, 255, 0.1)"
                          pointerEvents="none"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Layout Border */}
          <rect 
            x={0} y={0} 
            width={width} height={height} 
            fill="none" 
            stroke="#555" 
            strokeWidth={1 / zoom}
            style={{ vectorEffect: 'non-scaling-stroke' }}
            pointerEvents="none"
          />
        </g>
      </svg>

      {/* Info Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#ccc',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        pointerEvents: 'none',
        display: 'flex',
        gap: '15px',
        border: '1px solid #444',
        backdropFilter: 'blur(4px)'
      }}>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Layout: {width} × {height}</span>
      </div>
    </div>
  );
};
