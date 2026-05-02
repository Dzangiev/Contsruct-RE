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
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '13px',
      userSelect: 'none',
      overflow: 'hidden'
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
              onClick={() => addLayout(`Layout ${(project.layouts?.length || 0) + 1}`)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px' }}
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


        {/* Object Types Section */}
        <section style={{ padding: '10px', borderTop: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', color: '#888' }}>Object Types</span>
            <button 
              onClick={() => addObjectType(`Sprite ${(project.objectTypes?.length || 0) + 1}`, ObjectTypeKind.Sprite)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px' }}
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
                  padding: '4px 8px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'grab',
                  backgroundColor: editorState.selectedObjectTypeId === ot.id ? '#37373d' : 'transparent',
                  color: editorState.selectedObjectTypeId === ot.id ? '#fff' : '#d4d4d4'
                }}
              >
                <Package size={14} />
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
                    fontSize: '10px'
                  }}
                >
                  {editorState.placementObjectTypeId === ot.id ? 'Placing...' : 'Place'}
                </button>
              </div>
            ))}
            {(project.objectTypes?.length === 0 || !project.objectTypes) && (
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
