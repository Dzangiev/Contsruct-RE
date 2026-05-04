import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { ProjectExplorer } from './components/ProjectExplorer';
import { Viewport } from './components/Viewport';
import { Inspector } from './components/Inspector';
import { EventSheetEditor } from './components/EventSheetEditor';
import { Runtime } from '../runtime/Runtime';
import { Play, Monitor, FileText, Info, Variable, Download, Upload, Bug, Sparkles, X } from 'lucide-react';
import { StatusBar } from './components/StatusBar';
import { SpriteEditor } from './components/SpriteEditor';
import { GlobalVariablesPanel } from './components/GlobalVariablesPanel';
import { List as ListIcon } from 'lucide-react';

import { LayersPanel } from './components/LayersPanel';
import { AssetPanel } from './components/AssetPanel';
import { SimpleModal } from './components/SimpleModal';
import { GridSettingsDialog } from './components/GridSettingsDialog';
import { TilemapEditor } from './components/TilemapEditor';

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
  const { project, editorState, dialogState, setTab, setPreviewMode, closeDialog, setGridSettingsDialogOpen } = useEditorStore();
  const { currentTab, previewMode, gridSettingsDialogOpen } = editorState;
  const [rightPanelTab, setRightPanelTab] = React.useState<'properties' | 'variables'>('properties');

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
        <div style={{ width: '260px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1a1a1a', backgroundColor: '#1e1e1e', height: '100%' }}>
          <div style={{ flex: 4, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderBottom: '1px solid #1a1a1a' }}>
            <ErrorBoundary name="ProjectExplorer">
              <ProjectExplorer />
            </ErrorBoundary>
          </div>
          <div style={{ flex: 3, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderBottom: '1px solid #1a1a1a', backgroundColor: '#252526' }}>
            <ErrorBoundary name="LayersPanel">
              <LayersPanel />
            </ErrorBoundary>
          </div>
          <div style={{ flex: 3, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
            <ErrorBoundary name="AssetPanel">
              <AssetPanel />
            </ErrorBoundary>
          </div>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => {
                  const data = JSON.stringify(project, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${project.settings.name || 'project'}.creproj`;
                  a.click();
                }}
                style={secondaryToolbarButtonStyle}
                title="Export Project"
              >
                <Download size={14} /> EXPORT
              </button>
              <label style={secondaryToolbarButtonStyle} title="Import Project">
                <Upload size={14} /> IMPORT
                <input 
                  type="file" 
                  hidden 
                  accept=".creproj,application/json" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const imported = JSON.parse(event.target?.result as string);
                        // Basic validation
                        if (imported.schemaVersion) {
                          useEditorStore.setState({ project: imported });
                          alert('Project imported successfully!');
                        }
                      } catch (err) {
                        alert('Failed to import project: Invalid JSON');
                      }
                    };
                    reader.readAsText(file);
                  }} 
                />
              </label>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#3d3d3d', margin: '0 4px' }} />
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

        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #1a1a1a', backgroundColor: '#1e1e1e' }}>
          <div style={{ 
            display: 'flex', 
            height: '35px', 
            backgroundColor: '#252526', 
            borderBottom: '1px solid #111',
            userSelect: 'none'
          }}>
            <button 
              onClick={() => setRightPanelTab('properties')}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: rightPanelTab === 'properties' ? '#1e1e1e' : 'transparent',
                color: rightPanelTab === 'properties' ? '#fff' : '#888',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '0.5px',
                transition: 'all 0.1s',
                borderBottom: rightPanelTab === 'properties' ? '2px solid #007acc' : '2px solid transparent'
              }}
            >
              <Info size={14} style={{ opacity: rightPanelTab === 'properties' ? 1 : 0.6 }} /> PROPERTIES
            </button>
            <button 
              onClick={() => setRightPanelTab('variables')}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: rightPanelTab === 'variables' ? '#1e1e1e' : 'transparent',
                color: rightPanelTab === 'variables' ? '#fff' : '#888',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '0.5px',
                transition: 'all 0.1s',
                borderBottom: rightPanelTab === 'variables' ? '2px solid #007acc' : '2px solid transparent'
              }}
            >
              <Variable size={14} style={{ opacity: rightPanelTab === 'variables' ? 1 : 0.6 }} /> VARIABLES
            </button>
          </div>
          
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {rightPanelTab === 'properties' ? (
              <ErrorBoundary name="Inspector">
                <Inspector />
              </ErrorBoundary>
            ) : (
              <ErrorBoundary name="GlobalVariablesPanel">
                <GlobalVariablesPanel />
              </ErrorBoundary>
            )}
          </div>
        </div>
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

      {/* Sprite Editor Overlay */}
      {editorState.spriteEditor?.isOpen && (
        <ErrorBoundary name="SpriteEditor">
          <SpriteEditor />
        </ErrorBoundary>
      )}

      {/* Grid Settings Dialog */}
      <GridSettingsDialog 
        isOpen={gridSettingsDialogOpen} 
        onClose={() => setGridSettingsDialogOpen(false)} 
      />

      {/* Tilemap Editor Overlay */}
      {editorState.tilemapEditor?.isOpen && (() => {
        const ot = project.objectTypes.find(o => o.id === editorState.tilemapEditor?.objectTypeId);
        if (!ot) return null;
        return (
          <ErrorBoundary name="TilemapEditor">
            <TilemapEditor 
              project={project}
              objectType={ot}
              onUpdate={(data) => useEditorStore.getState().updateTilemapData(ot.id, data)}
              onClose={() => useEditorStore.getState().closeTilemapEditor()}
            />
          </ErrorBoundary>
        );
      })()}
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

const secondaryToolbarButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#ccc',
  border: '1px solid #444',
  padding: '4px 10px',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '10px',
  fontWeight: 600,
  transition: 'all 0.1s',
  height: '24px'
};

