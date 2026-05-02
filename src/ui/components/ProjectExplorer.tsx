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

  const activeLayout = project.layouts?.find(l => l.id === editorState.activeLayoutId);
  const activeLayer = activeLayout?.layers?.find(layer => layer.id === editorState.activeLayerId);
  const isActiveLayerRestricted = activeLayer && (!activeLayer.visible || activeLayer.locked);

  return (
    <div className="project-explorer" style={{
      flex: 1,
      backgroundColor: '#2d2d2d',
      color: '#aaa',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '13px',
      userSelect: 'none',
      overflow: 'hidden',
      borderRight: '1px solid #1a1a1a'
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', fontWeight: 800, fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Project Explorer
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Layouts Section */}
        <section style={{ padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', padding: '0 5px' }}>
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', color: '#666' }}>Layouts</span>
            <button 
              onClick={() => addLayout(`Layout ${(project.layouts?.length || 0) + 1}`)}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '2px' }}
              title="Add Layout"
            >
              <Plus size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {project.layouts?.map(layout => (
              <div 
                key={layout.id}
                onClick={() => setActiveLayout(layout.id, layout.layers?.[0]?.id)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: editorState.activeLayoutId === layout.id ? '#3e3e42' : 'transparent',
                  color: editorState.activeLayoutId === layout.id ? '#fff' : '#aaa',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  transition: 'background-color 0.1s'
                }}
              >
                <LayoutIcon size={14} color={editorState.activeLayoutId === layout.id ? '#007acc' : '#666'} />
                {layout.name}
              </div>
            ))}
          </div>
        </section>


        {/* Object Types Section */}
        <section style={{ padding: '10px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', padding: '0 5px' }}>
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', color: '#666' }}>Object Types</span>
            <button 
              onClick={() => addObjectType(`Sprite ${(project.objectTypes?.length || 0) + 1}`, ObjectTypeKind.Sprite)}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '2px' }}
              title="Add Object Type"
            >
              <Plus size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {project.objectTypes?.map(ot => (
              <div 
                key={ot.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('objectTypeId', ot.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => setSelectedObjectType(ot.id)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'grab',
                  backgroundColor: editorState.selectedObjectTypeId === ot.id ? '#3e3e42' : 'transparent',
                  color: editorState.selectedObjectTypeId === ot.id ? '#fff' : '#aaa',
                  fontSize: '12px',
                  transition: 'background-color 0.1s'
                }}
              >
                <Package size={14} color={editorState.selectedObjectTypeId === ot.id ? '#007acc' : '#666'} />
                <span style={{ flex: 1 }}>{ot.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setTool('place', ot.id); }}
                  style={{
                    marginLeft: 'auto',
                    background: editorState.placementObjectTypeId === ot.id ? '#007acc' : '#333',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 600
                  }}
                >
                  {editorState.placementObjectTypeId === ot.id ? 'Placing...' : 'Place'}
                </button>
              </div>
            ))}
            {(project.objectTypes?.length === 0 || !project.objectTypes) && (
              <div style={{ padding: '8px 10px', color: '#555', fontStyle: 'italic', fontSize: '11px' }}>No objects</div>
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
