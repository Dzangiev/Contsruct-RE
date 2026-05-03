import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { ProjectExplorer } from './components/ProjectExplorer';
import { Viewport } from './components/Viewport';
import { Inspector } from './components/Inspector';
import { EventSheetEditor } from './components/EventSheetEditor';
import { Runtime } from '../runtime/Runtime';
import { Play, Monitor, FileText } from 'lucide-react';
import { StatusBar } from './components/StatusBar';

import { LayersPanel } from './components/LayersPanel';
import { SimpleModal } from './components/SimpleModal';

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
  const { project, editorState, dialogState, setTab, setPreviewMode, closeDialog } = useEditorStore();
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
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1a1a1a', backgroundColor: '#2d2d2d' }}>
          <ErrorBoundary name="ProjectExplorer">
            <ProjectExplorer />
          </ErrorBoundary>
          <ErrorBoundary name="LayersPanel">
            <LayersPanel />
          </ErrorBoundary>
        </div>
        
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#333', overflow: 'hidden' }}>
          <header style={{ 
            height: '35px', 
            backgroundColor: '#2d2d2d', 
            borderBottom: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            justifyContent: 'space-between',
            color: '#ccc',
            fontSize: '11px',
            userSelect: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ padding: '0 12px', fontWeight: 800, color: '#555', letterSpacing: '1px', fontSize: '10px' }}>CRE ENGINE</div>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#3d3d3d', margin: '0 8px' }} />
              
              <nav style={{ display: 'flex', height: '35px' }}>
                <TabButton 
                  active={currentTab === 'layout'} 
                  onClick={() => setTab('layout')}
                  icon={<Monitor size={14} />}
                  label={project.layouts?.find(l => l.id === editorState.activeLayoutId)?.name || 'Layout'} 
                />
                {(() => {
                  const activeLayout = project.layouts?.find(l => l.id === editorState.activeLayoutId);
                  const eventSheet = project.eventSheets?.find(es => es.id === activeLayout?.eventSheetId);
                  return (
                    <TabButton 
                      active={currentTab === 'eventSheet'} 
                      onClick={() => setTab('eventSheet')}
                      icon={<FileText size={14} />}
                      label={eventSheet?.name || 'Event Sheet'} 
                    />
                  );
                })()}
              </nav>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => setPreviewMode(true)}
                style={{
                  backgroundColor: '#2ea44f',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                <Play size={12} fill="currentColor" /> PREVIEW
              </button>
            </div>
          </header>
          
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <ErrorBoundary name="MainContent">
              {currentTab === 'layout' ? <Viewport /> : <EventSheetEditor />}
            </ErrorBoundary>
          </div>
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

      {/* Global Dialog */}
      {dialogState?.isOpen && (
        <SimpleModal 
          title={dialogState.title}
          message={dialogState.message}
          type={dialogState.type}
          defaultValue={dialogState.defaultValue}
          onConfirm={(val) => {
            dialogState.resolve(val ?? true);
            useEditorStore.setState({ dialogState: null });
          }}
          onCancel={() => {
            dialogState.resolve(undefined);
            useEditorStore.setState({ dialogState: null });
          }}
        />
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string, icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button 
    onClick={onClick}
    style={{
      height: '100%',
      padding: '0 16px',
      backgroundColor: active ? '#333' : 'transparent',
      border: 'none',
      borderTop: active ? '2px solid #007acc' : '2px solid transparent',
      borderRight: '1px solid #222',
      color: active ? '#fff' : '#aaa',
      cursor: 'pointer',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s',
      fontWeight: active ? 600 : 400,
      minWidth: '120px',
      position: 'relative'
    }}
  >
    <span style={{ opacity: active ? 1 : 0.5, display: 'flex', alignItems: 'center' }}>{icon}</span>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    {active && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: '1px', backgroundColor: '#1e1e1e' }} />}
  </button>
);

export default App;

