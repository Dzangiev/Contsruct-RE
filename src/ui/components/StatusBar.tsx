import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { MousePointer2, Layers, Search, Cpu, FileJson } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { project, editorState } = useEditorStore();
  const { mousePosition, activeLayerId, activeLayoutId, zoom } = editorState;
  
  const activeLayout = project.layouts.find(l => l.id === activeLayoutId);
  const activeLayer = activeLayout?.layers.find(l => l.id === activeLayerId);

  return (
    <div style={statusBarStyle}>
      <div style={sectionStyle}>
        <FileJson size={14} style={{ color: '#fff', opacity: 0.8 }} />
        <span>{project.settings.name}</span>
      </div>

      <div style={spacerStyle} />

      <div style={sectionStyle}>
        <MousePointer2 size={14} />
        <span>{Math.round(mousePosition.x)}, {Math.round(mousePosition.y)}</span>
      </div>

      <div style={dividerStyle} />

      <div style={sectionStyle}>
        <Layers size={14} />
        <span>{activeLayer?.name || 'No Layer'}</span>
      </div>

      <div style={dividerStyle} />

      <div style={sectionStyle}>
        <Search size={14} />
        <span>{Math.round(zoom * 100)}%</span>
      </div>

      <div style={dividerStyle} />

      <div style={sectionStyle}>
        <Cpu size={14} style={{ color: '#2ecc71' }} />
        <span>Ready</span>
      </div>
    </div>
  );
};

const statusBarStyle: React.CSSProperties = {
  height: '24px',
  backgroundColor: '#007acc',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  padding: '0 10px',
  fontSize: '11px',
  userSelect: 'none',
  gap: '10px'
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  height: '100%'
};

const dividerStyle: React.CSSProperties = {
  width: '1px',
  height: '14px',
  backgroundColor: 'rgba(255,255,255,0.2)'
};

const spacerStyle: React.CSSProperties = {
  flex: 1
};
