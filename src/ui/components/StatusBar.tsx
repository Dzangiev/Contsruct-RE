import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { MousePointer2, Layers, Search, Cpu, FileJson, List, Zap, Terminal } from 'lucide-react';
import { EventBlock } from '../../model/project';

export const StatusBar: React.FC = () => {
  const { project, editorState } = useEditorStore();
  const { mousePosition, activeLayerId, activeLayoutId, zoom, currentTab } = editorState;
  
  const activeLayout = project.layouts.find(l => l.id === activeLayoutId);
  const activeLayer = activeLayout?.layers.find(l => l.id === activeLayerId);

  const countTotalEvents = (blocks: EventBlock[]): number => {
    let count = 0;
    blocks.forEach(b => { 
      if (b.type === 'event') count++; 
      if (b.children) count += countTotalEvents(b.children); 
    });
    return count;
  };

  const activeEventSheetId = activeLayout?.eventSheetId || project.eventSheets[0]?.id;
  const eventSheet = project.eventSheets.find(es => es.id === activeEventSheetId);

  return (
    <div style={statusBarStyle}>
      <div style={sectionStyle}>
        <FileJson size={14} style={{ color: '#fff', opacity: 0.8 }} />
        <span style={{ fontWeight: 600 }}>{project.settings.name}</span>
      </div>

      <div style={spacerStyle} />

      {currentTab === 'layout' ? (
        <>
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
            <List size={14} style={{ opacity: 0.7 }} />
            <span>Grid: {editorState.gridSize}px</span>
          </div>
        </>
      ) : (
        <>
          <div style={sectionStyle}>
            <Terminal size={14} />
            <span>{project.globalVariables.length} Global Variables</span>
          </div>

          <div style={dividerStyle} />

          <div style={sectionStyle}>
            <List size={14} />
            <span>{eventSheet ? countTotalEvents(eventSheet.events) : 0} Event Blocks</span>
          </div>

          <div style={dividerStyle} />

          <div style={sectionStyle}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2ecc71' }}></div>
            <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>C3 ELITE MODE ACTIVE</span>
          </div>
        </>
      )}

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
  backgroundColor: '#004b7e',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  padding: '0 10px',
  fontSize: '11px',
  userSelect: 'none',
  gap: '10px',
  borderTop: '1px solid rgba(255,255,255,0.1)'
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
