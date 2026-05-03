import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { ObjectTypeKind } from '../../model/project';
import { 
  Plus, 
  Layout as LayoutIcon, 
  Package
} from 'lucide-react';

export const ProjectExplorer: React.FC = () => {
  const { 
    project, 
    editorState, 
    setActiveLayout, 
    addLayout, 
    addObjectType,
    setTool,
    setSelectedObjectType,
    openSpriteEditor,
    showDialog
  } = useEditorStore();

  return (
    <div className="project-explorer" style={explorerStyle}>
      <div style={{ padding: '12px 16px 8px 16px', fontWeight: 800, fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Project Explorer
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Layouts Section */}
        <section style={{ padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', padding: '0 5px' }}>
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', color: '#666' }}>Layouts</span>
            <button 
              onClick={async () => {
                const name = await showDialog({ title: 'New Layout', message: 'Enter layout name:', type: 'prompt', defaultValue: `Layout ${(project.layouts?.length || 0) + 1}` });
                if (name && typeof name === 'string') addLayout(name);
              }}
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
                style={itemStyle(editorState.activeLayoutId === layout.id)}
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
              onClick={async () => {
                const name = await showDialog({ title: 'New Sprite', message: 'Enter sprite name:', type: 'prompt', defaultValue: `Sprite ${(project.objectTypes?.length || 0) + 1}` });
                if (name && typeof name === 'string') addObjectType(name, ObjectTypeKind.Sprite);
              }}
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
                onDoubleClick={() => {
                  if (ot.kind === ObjectTypeKind.Sprite) {
                    openSpriteEditor(ot.id);
                  }
                }}
                style={itemStyle(editorState.selectedObjectTypeId === ot.id)}
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

const explorerStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#2d2d2d',
  color: '#ccc',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  userSelect: 'none',
  paddingTop: '8px'
};

const itemStyle = (active: boolean, depth: number = 0): React.CSSProperties => ({
  padding: `6px 12px 6px ${12 + depth * 12}px`,
  backgroundColor: active ? '#3e3e42' : 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '11px',
  color: active ? '#fff' : '#ccc',
  transition: 'background-color 0.1s'
});
