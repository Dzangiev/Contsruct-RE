import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { ProjectExplorer } from './components/ProjectExplorer';
import { Viewport } from './components/Viewport';
import { Inspector } from './components/Inspector';
import { EventSheetEditor } from './components/EventSheetEditor';
import { Runtime } from '../runtime/Runtime';
import { Play } from 'lucide-react';

const App: React.FC = () => {
  const { project, editorState, setTab, setPreviewMode } = useEditorStore();
  const { currentTab, previewMode } = editorState;

  return (
    <div className="editor-root" style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      backgroundColor: '#121212',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      position: 'relative'
    }}>
      <ProjectExplorer />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <header style={{ 
          height: '40px', 
          backgroundColor: '#252526', 
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          justifyContent: 'space-between',
          color: '#ccc',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '100%' }}>
            <div style={{ fontWeight: 'bold', color: '#fff' }}>CRE Editor</div>
            
            <nav style={{ display: 'flex', gap: '2px', height: '100%' }}>
              <TabButton 
                active={currentTab === 'layout'} 
                onClick={() => setTab('layout')}
                label="Layout 1" 
              />
              <TabButton 
                active={currentTab === 'eventSheet'} 
                onClick={() => setTab('eventSheet')}
                label="Event Sheet 1" 
              />
            </nav>
          </div>

          <button 
            onClick={() => setPreviewMode(true)}
            style={{
              backgroundColor: '#22a043',
              color: '#fff',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
          >
            <Play size={12} fill="currentColor" /> Preview
          </button>
        </header>
        
        {currentTab === 'layout' ? <Viewport /> : <EventSheetEditor />}
      </main>

      <Inspector />

      {/* Runtime Preview Overlay */}
      {previewMode && (
        <Runtime 
          project={project} 
          layoutId={editorState.activeLayoutId} 
          onStop={() => setPreviewMode(false)} 
        />
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    style={{
      height: '100%',
      padding: '0 15px',
      backgroundColor: active ? '#1e1e1e' : 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #007acc' : 'none',
      color: active ? '#fff' : '#888',
      cursor: 'pointer',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      transition: 'background-color 0.2s'
    }}
  >
    {label}
  </button>
);

export default App;

