import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { ProjectExplorer } from './components/ProjectExplorer';
import { Viewport } from './components/Viewport';
import { Inspector } from './components/Inspector';
import { EventSheetEditor } from './components/EventSheetEditor';
import { Runtime } from '../runtime/Runtime';
import { Play } from 'lucide-react';
import { StatusBar } from './components/StatusBar';

import { LayersPanel } from './components/LayersPanel';

class ErrorBoundary extends React.Component<{ children: React.ReactNode, name: string }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error(`Error in ${this.props.name}:`, error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: '20px', color: '#ff4444', backgroundColor: '#2a1a1a', fontSize: '12px', border: '1px solid #442222', flex: 1 }}>
        <strong>Error in {this.props.name}</strong><br/>Check console for details.
      </div>;
    }
    return this.props.children;
  }
}

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
      position: 'relative',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' }}>
          <ErrorBoundary name="ProjectExplorer">
            <ProjectExplorer />
          </ErrorBoundary>
          <ErrorBoundary name="LayersPanel">
            <LayersPanel />
          </ErrorBoundary>
        </div>
        
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
                  label={project.layouts?.find(l => l.id === editorState.activeLayoutId)?.name || 'Layout'} 
                />
                {(() => {
                  const activeLayout = project.layouts?.find(l => l.id === editorState.activeLayoutId);
                  const eventSheet = project.eventSheets?.find(es => es.id === activeLayout?.eventSheetId);
                  return (
                    <TabButton 
                      active={currentTab === 'eventSheet'} 
                      onClick={() => setTab('eventSheet')}
                      label={eventSheet?.name || 'Event Sheet'} 
                    />
                  );
                })()}
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
          
          <ErrorBoundary name="MainContent">
            {currentTab === 'layout' ? <Viewport /> : <EventSheetEditor />}
          </ErrorBoundary>
        </main>

        <ErrorBoundary name="Inspector">
          <Inspector />
        </ErrorBoundary>
      </div>

      <StatusBar />

      {/* Runtime Preview Overlay */}
      {previewMode && (
        <ErrorBoundary name="Runtime">
          <Runtime 
            project={project} 
            layoutId={editorState.activeLayoutId} 
            onStop={() => setPreviewMode(false)} 
          />
        </ErrorBoundary>
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

