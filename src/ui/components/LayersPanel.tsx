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
  Settings2,
  Box,
  MousePointer2
} from 'lucide-react';
import { getTranslation } from '../../i18n';

export const LayersPanel: React.FC = () => {
  const { 
    project, 
    editorState, 
    setActiveLayer, 
    addLayer, 
    updateLayer, 
    moveLayer,
    reorderInstance,
    setSelectedInstances
  } = useEditorStore();
  const t = getTranslation(editorState.language);

  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  if (!activeLayout) return <div style={{ ...panelStyle, padding: '20px', color: '#666', fontSize: '11px', backgroundColor: '#1e1e1e' }}>{t.NO_ACTIVE_LAYOUT}</div>;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#aaa' }}>{t.LAYERS}</span>
        <button 
          onClick={() => addLayer(activeLayout.id, `${t.LAYER} ${activeLayout.layers.length}`)}
          style={actionButtonStyle}
          title={t.ADD_LAYER}
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
                  title={layer.visible ? t.HIDE : t.SHOW}
                >
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); updateLayer(activeLayout.id, layer.id, { locked: !layer.locked }); }}
                  style={{ ...iconButtonStyle, color: layer.locked ? '#e67e22' : '#888' }}
                  title={layer.locked ? t.UNLOCK : t.LOCK}
                >
                  {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
                <div style={dividerStyle} />
                <button 
                  disabled={isLast}
                  onClick={(e) => { e.stopPropagation(); moveLayer(activeLayout.id, layer.id, 'up'); }}
                  style={{ ...iconButtonStyle, opacity: isLast ? 0.2 : 1 }}
                  title={t.MOVE_UP}
                >
                  <ChevronUp size={12} />
                </button>
                <button 
                  disabled={isFirst}
                  onClick={(e) => { e.stopPropagation(); moveLayer(activeLayout.id, layer.id, 'down'); }}
                  style={{ ...iconButtonStyle, opacity: isFirst ? 0.2 : 1 }}
                  title={t.MOVE_DOWN}
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...headerStyle, borderTop: '1px solid #333' }}>
        <span style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#aaa' }}>{t.OBJECTS_IN_LAYER}</span>
      </div>

      <div style={{ ...listStyle, flex: 1.5 }}>
        {activeLayout.instances
          .filter(inst => inst.layerId === editorState.activeLayerId)
          .reverse() // Show top to bottom
          .map((inst, idx, arr) => {
            const isSelected = editorState.selectedInstanceIds.includes(inst.id);
            const objectType = project.objectTypes.find(ot => ot.id === inst.objectTypeId);
            const isTop = idx === 0;
            const isBottom = idx === arr.length - 1;

            return (
              <div 
                key={inst.id}
                onClick={() => setSelectedInstances([inst.id])}
                style={{
                  ...rowStyle,
                  backgroundColor: isSelected ? 'rgba(0, 122, 204, 0.2)' : 'transparent',
                  padding: '4px 8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <Box size={12} color={isSelected ? '#007acc' : '#555'} />
                  <span style={{ 
                    flex: 1, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    color: isSelected ? '#fff' : '#aaa',
                    fontSize: '11px'
                  }}>
                    {objectType?.name || t.INSTANCE}
                  </span>
                </div>
                <div style={controlsStyle}>
                   <button 
                    disabled={isTop}
                    onClick={(e) => { e.stopPropagation(); reorderInstance(activeLayout.id, inst.id, 'forward'); }}
                    style={{ ...iconButtonStyle, opacity: isTop ? 0.2 : 0.8 }}
                    title={t.FORWARD}
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button 
                    disabled={isBottom}
                    onClick={(e) => { e.stopPropagation(); reorderInstance(activeLayout.id, inst.id, 'backward'); }}
                    style={{ ...iconButtonStyle, opacity: isBottom ? 0.2 : 0.8 }}
                    title={t.BACKWARD}
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        {activeLayout.instances.filter(i => i.layerId === editorState.activeLayerId).length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '11px' }}>
            {t.NO_OBJECTS_IN_LAYER}
          </div>
        )}
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
