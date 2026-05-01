import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { ObjectTypeKind } from '../../model/project';
import { 
  Plus, 
  Layout as LayoutIcon, 
  Layers, 
  Package, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  ChevronUp, 
  ChevronDown 
} from 'lucide-react';

export const ProjectExplorer: React.FC = () => {
  const { 
    project, 
    editorState, 
    setActiveLayout, 
    setActiveLayer, 
    addLayout, 
    addLayer, 
    addObjectType,
    setTool,
    setSelectedObjectType,
    updateLayer,
    moveLayer
  } = useEditorStore();

  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const activeLayer = activeLayout?.layers.find(layer => layer.id === editorState.activeLayerId);
  const isActiveLayerRestricted = activeLayer && (!activeLayer.visible || activeLayer.locked);

  return (
    <div className="project-explorer" style={{
// ... (rest of style remains same)
      width: '250px',
      height: '100%',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '13px',
      userSelect: 'none'
    }}>
      <div style={{ padding: '10px', borderBottom: '1px solid #333', fontWeight: 'bold', color: '#fff' }}>
        Project Explorer
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Layouts Section */}
        <section style={{ padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', color: '#888' }}>Layouts</span>
            <button 
              onClick={() => addLayout(`Layout ${project.layouts.length + 1}`)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px' }}
              title="Add Layout"
            >
              <Plus size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {project.layouts.map(layout => (
              <div 
                key={layout.id}
                onClick={() => setActiveLayout(layout.id, layout.layers[0]?.id)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  backgroundColor: editorState.activeLayoutId === layout.id ? '#37373d' : 'transparent',
                  color: editorState.activeLayoutId === layout.id ? '#fff' : '#d4d4d4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <LayoutIcon size={14} />
                {layout.name}
              </div>
            ))}
          </div>
        </section>

        {/* Layers Section (for active layout) */}
        {activeLayout && (
          <section style={{ padding: '10px', borderTop: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', color: '#888' }}>Layers</span>
              <button 
                onClick={() => addLayer(activeLayout.id, `Layer ${activeLayout.layers.length}`)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px' }}
                title="Add Layer"
              >
                <Plus size={14} />
              </button>
            </div>
            
            {isActiveLayerRestricted && (
              <div style={{ fontSize: '10px', color: '#e67e22', marginBottom: '8px', padding: '4px', backgroundColor: 'rgba(230, 126, 34, 0.1)', borderRadius: '3px' }}>
                Active layer is hidden or locked. Placement disabled.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '2px' }}>
              {activeLayout.layers.map((layer, idx) => (
                <div 
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    backgroundColor: editorState.activeLayerId === layer.id ? '#37373d' : 'transparent',
                    color: editorState.activeLayerId === layer.id ? '#fff' : '#d4d4d4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: layer.visible ? 1 : 0.5
                  }}
                >
                  <Layers size={14} style={{ color: editorState.activeLayerId === layer.id ? '#0099ff' : 'inherit' }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {layer.name}
                  </span>
                  
                  {/* Layer Controls */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveLayer(activeLayout.id, layer.id, 'down'); }}
                      disabled={idx === 0}
                      style={iconButtonStyle}
                      title="Move Down"
                    >
                      <ChevronDown size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveLayer(activeLayout.id, layer.id, 'up'); }}
                      disabled={idx === activeLayout.layers.length - 1}
                      style={iconButtonStyle}
                      title="Move Up"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateLayer(activeLayout.id, layer.id, { locked: !layer.locked }); }}
                      style={iconButtonStyle}
                      title={layer.locked ? "Unlock" : "Lock"}
                    >
                      {layer.locked ? <Lock size={12} color="#e67e22" /> : <Unlock size={12} />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateLayer(activeLayout.id, layer.id, { visible: !layer.visible }); }}
                      style={iconButtonStyle}
                      title={layer.visible ? "Hide" : "Show"}
                    >
                      {layer.visible ? <Eye size={12} /> : <EyeOff size={12} color="#888" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Object Types Section */}
        <section style={{ padding: '10px', borderTop: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', color: '#888' }}>Object Types</span>
            <button 
              onClick={() => addObjectType(`Sprite ${project.objectTypes.length + 1}`, ObjectTypeKind.Sprite)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px' }}
              title="Add Object Type"
            >
              <Plus size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {project.objectTypes.map(ot => (
              <div 
                key={ot.id}
                onClick={() => setSelectedObjectType(ot.id)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  backgroundColor: editorState.selectedObjectTypeId === ot.id ? '#37373d' : 'transparent',
                  color: editorState.selectedObjectTypeId === ot.id ? '#fff' : '#d4d4d4'
                }}
              >
                <Package size={14} />
                <span style={{ flex: 1 }}>{ot.name}</span>
                <button 
                  onClick={() => setTool('place', ot.id)}
                  style={{
                    marginLeft: 'auto',
                    background: editorState.placementObjectTypeId === ot.id ? '#007acc' : '#333',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '10px'
                  }}
                >
                  {editorState.placementObjectTypeId === ot.id ? 'Placing...' : 'Place'}
                </button>
              </div>
            ))}
            {project.objectTypes.length === 0 && (
              <div style={{ padding: '4px 8px', color: '#666', fontStyle: 'italic' }}>No objects</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const iconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '2px'
};
