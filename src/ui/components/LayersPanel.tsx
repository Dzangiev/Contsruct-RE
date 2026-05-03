import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { 
  Plus, 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  ChevronUp, 
  ChevronDown,
  Trash2,
  Settings2
} from 'lucide-react';

export const LayersPanel: React.FC = () => {
  const { 
    project, 
    editorState, 
    setActiveLayer, 
    addLayer, 
    updateLayer, 
    moveLayer 
  } = useEditorStore();

  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  if (!activeLayout) return <div style={{ ...panelStyle, padding: '20px', color: '#666', fontSize: '11px', backgroundColor: '#1e1e1e' }}>No active layout</div>;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#aaa' }}>Layers</span>
        <button 
          onClick={() => addLayer(activeLayout.id, `Layer ${activeLayout.layers.length}`)}
          style={actionButtonStyle}
          title="Add Layer"
        >
          <Plus size={14} />
        </button>
      </div>

      <div style={listStyle}>
        {[...activeLayout.layers].reverse().map((layer, idx) => {
          const isLast = idx === 0;
          const isFirst = idx === activeLayout.layers.length - 1;
          const isActive = editorState.activeLayerId === layer.id;

          return (
            <div 
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              style={{
                ...rowStyle,
                backgroundColor: isActive ? '#37373d' : 'transparent',
                borderLeft: isActive ? '3px solid #007acc' : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <Layers size={14} color={isActive ? '#007acc' : '#666'} />
                <span style={{ 
                  flex: 1, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  color: isActive ? '#fff' : '#d4d4d4',
                  fontSize: '12px'
                }}>
                  {layer.name}
                </span>
              </div>

              <div style={controlsStyle}>
                <button 
                  onClick={(e) => { e.stopPropagation(); updateLayer(activeLayout.id, layer.id, { visible: !layer.visible }); }}
                  style={{ ...iconButtonStyle, opacity: layer.visible ? 1 : 0.4 }}
                  title={layer.visible ? "Hide" : "Show"}
                >
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); updateLayer(activeLayout.id, layer.id, { locked: !layer.locked }); }}
                  style={{ ...iconButtonStyle, color: layer.locked ? '#e67e22' : '#888' }}
                  title={layer.locked ? "Unlock" : "Lock"}
                >
                  {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
                <div style={dividerStyle} />
                <button 
                  disabled={isLast}
                  onClick={(e) => { e.stopPropagation(); moveLayer(activeLayout.id, layer.id, 'up'); }}
                  style={{ ...iconButtonStyle, opacity: isLast ? 0.2 : 1 }}
                >
                  <ChevronUp size={12} />
                </button>
                <button 
                  disabled={isFirst}
                  onClick={(e) => { e.stopPropagation(); moveLayer(activeLayout.id, layer.id, 'down'); }}
                  style={{ ...iconButtonStyle, opacity: isFirst ? 0.2 : 1 }}
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const panelStyle: React.CSSProperties = {
  height: '100%',
  backgroundColor: '#1e1e1e',
  borderTop: '1px solid #333',
  display: 'flex',
  flexDirection: 'column',
  userSelect: 'none'
};

const headerStyle: React.CSSProperties = {
  padding: '6px 10px',
  backgroundColor: '#252526',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #333'
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column'
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 8px',
  cursor: 'pointer',
  gap: '10px',
  borderBottom: '1px solid #2d2d2d'
};

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2px'
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
  borderRadius: '2px',
  transition: 'background-color 0.1s'
};

const actionButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center'
};

const dividerStyle: React.CSSProperties = {
  width: '1px',
  height: '12px',
  backgroundColor: '#333',
  margin: '0 4px'
};
