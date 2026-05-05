import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { 
  Variable, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Settings2, 
  BarChart2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { VariableDialog } from './VariableDialog';
import { getVariableUsageCount, getVariableUsageLocations } from '../../model/eventUpdates';
import { getTranslation } from '../../i18n';

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#1e1e1e',
  color: '#ccc',
  fontSize: '12px',
  borderLeft: '1px solid #1a1a1a'
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#252526',
  borderBottom: '1px solid #111',
  fontWeight: 700,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: '#aaa'
};

const itemStyle: React.CSSProperties = {
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'default',
  transition: 'background 0.1s'
};

const folderItemStyle: React.CSSProperties = {
  padding: '6px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'background-color 0.1s, color 0.1s'
};

const miniIconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '5px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'all 0.1s'
};

export const GlobalVariablesPanel: React.FC = () => {
  const { 
    project, 
    updateGlobalVariable, 
    removeGlobalVariable,
    addFolder,
    updateFolder,
    removeFolder,
    moveEntityToFolder,
    showDialog,
    editorState
  } = useEditorStore();
  const t = getTranslation(editorState.language);

  const [filter, setFilter] = React.useState('');
  const [dialogState, setDialogState] = React.useState<{ variableId: string } | null>(null);
  const [expandedVarId, setExpandedVarId] = React.useState<string | null>(null);
  const [dragIndicator, setDragIndicator] = React.useState<string | null>(null);

  const editingVar = dialogState
    ? project.globalVariables.find(v => v.id === dialogState.variableId) 
    : undefined;

  const jumpToLogic = useEditorStore(state => state.jumpToLogic);

  const renderVariable = (v: any) => {
    const usageCount = getVariableUsageCount(project, v.name);
    const isExpanded = expandedVarId === v.id;
    
    return (
      <div key={v.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div 
          style={{ ...itemStyle, paddingLeft: '8px' }} 
          className="var-item-hover"
          onClick={() => setExpandedVarId(isExpanded ? null : v.id)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('entity-id', v.id);
            e.dataTransfer.setData('organize-type', 'globalVariable');
            e.dataTransfer.setData('x-cre-org-globalvariable', 'true');
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '16px', 
            height: '16px',
            color: '#666',
            transform: isExpanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.1s',
            cursor: 'pointer'
          }}>
            {usageCount > 0 && <Plus size={10} style={{ transform: isExpanded ? 'rotate(45deg)' : 'none' }} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' }}>{v.name}</span>
              {v.isConstant && <span style={{ fontSize: '9px', backgroundColor: '#3498db33', padding: '1px 5px', borderRadius: '4px', color: '#3498db', fontWeight: 800 }}>{t.CONST}</span>}
              {usageCount > 0 && (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    marginLeft: 'auto', 
                    marginRight: '4px', 
                    fontSize: '10px', 
                    color: isExpanded ? '#007acc' : '#555', 
                    backgroundColor: isExpanded ? 'rgba(0, 122, 204, 0.1)' : 'transparent', 
                    padding: '1px 6px', 
                    borderRadius: '10px',
                    fontWeight: isExpanded ? 700 : 500,
                    border: isExpanded ? '1px solid rgba(0, 122, 204, 0.2)' : '1px solid transparent'
                  }}
                >
                  <BarChart2 size={10} />
                  {usageCount}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
              <span style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{v.type}</span>
              <span style={{ color: '#333' }}>•</span>
              <span style={{ fontSize: '11px', color: v.type === 'number' ? '#569cd6' : '#ce9178', fontWeight: 500 }}>
                {JSON.stringify(v.initialValue)}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
            <button 
              style={miniIconButtonStyle}
              onClick={() => setDialogState({ variableId: v.id })}
              title={t.CONFIGURE_VARIABLE}
            >
              <Settings2 size={14} />
            </button>
            <button 
              style={{ ...miniIconButtonStyle, color: '#e74c3c' }}
              onClick={() => {
                if (confirm(t.DELETE_VARIABLE_CONFIRM.replace('{name}', v.name))) {
                  removeGlobalVariable(v.id);
                }
              }}
              title={t.DELETE}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div style={{ backgroundColor: '#181818', borderTop: '1px solid #1a1a1a', paddingBottom: '4px' }}>
            {getVariableUsageLocations(project, v.name).map((loc, idx) => (
              <div 
                key={idx} 
                className="usage-item"
                onClick={() => {
                  if (loc.sheetId && loc.blockId) {
                    jumpToLogic(loc.sheetId, loc.blockId);
                  }
                }}
                style={{ 
                  padding: '8px 12px 8px 32px', 
                  fontSize: '11px', 
                  cursor: loc.blockId ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  borderLeft: '2px solid transparent',
                  transition: 'all 0.1s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      color: loc.type === 'Condition' ? '#e67e22' : loc.type === 'Action' ? '#2ecc71' : '#3498db', 
                      textTransform: 'uppercase', 
                      fontSize: '8px', 
                      fontWeight: 800,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      padding: '0 4px',
                      borderRadius: '2px'
                    }}>
                      {loc.type}
                    </span>
                    {loc.index && <span style={{ color: '#777', fontSize: '10px' }}>#{loc.index}</span>}
                  </div>
                  <span style={{ color: '#555', fontSize: '9px' }}>{loc.sheetName}</span>
                </div>
                <div style={{ color: '#aaa', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>
                  {loc.detail}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFolderContent = (parentId: string | null) => {
    const folders = project.folders.filter(f => f.type === 'globalVariable' && f.parentId === parentId);
    const variables = project.globalVariables.filter(v => (v.folderId ?? null) === parentId);
    
    // Filtering by search term if provided
    const displayVariables = filter 
      ? variables.filter(v => v.name.toLowerCase().includes(filter.toLowerCase()))
      : variables;

    // Helper to check if a folder is a descendant
    const isDescendant = (childId: string, pId: string): boolean => {
      let current = project.folders.find(f => f.id === childId);
      while (current && current.parentId) {
        if (current.parentId === pId) return true;
        current = project.folders.find(f => f.id === current?.parentId);
      }
      return false;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {folders.map(folder => (
          <div key={folder.id} style={{ marginLeft: parentId === null ? 0 : 12 }}>
            <div 
              style={{ 
                ...folderItemStyle, 
                fontWeight: 600, 
                color: '#aaa', 
                backgroundColor: dragIndicator === folder.id ? 'rgba(0, 122, 204, 0.2)' : 'transparent',
                outline: dragIndicator === folder.id ? '1px solid #007acc' : 'none',
                outlineOffset: '-1px',
                borderRadius: '4px'
              }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('folder-id', folder.id);
                e.dataTransfer.setData('organize-type', 'globalVariable');
                e.dataTransfer.setData('x-cre-org-folder-globalvariable', 'true');
                e.dataTransfer.setData(`x-cre-f-${folder.id.toLowerCase()}`, 'true');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => updateFolder(folder.id, { expanded: !folder.expanded })}
              onDragOver={(e) => {
                const isItemDrag = e.dataTransfer.types.includes('x-cre-org-globalvariable');
                const isFolderDrag = e.dataTransfer.types.includes('x-cre-org-folder-globalvariable');
                const isSelf = e.dataTransfer.types.includes(`x-cre-f-${folder.id.toLowerCase()}`);
                
                if ((isItemDrag || isFolderDrag) && !isSelf) {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragIndicator(folder.id);
                }
              }}
              onDragLeave={() => setDragIndicator(null)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragIndicator(null);

                const draggedFolderId = e.dataTransfer.getData('folder-id');
                const entityId = e.dataTransfer.getData('entity-id');
                const entityType = e.dataTransfer.getData('organize-type');

                if (draggedFolderId) {
                  if (draggedFolderId !== folder.id && !isDescendant(folder.id, draggedFolderId)) {
                    updateFolder(draggedFolderId, { parentId: folder.id });
                  }
                } else if (entityId && entityType === 'globalVariable') {
                  moveEntityToFolder('globalVariable', entityId, folder.id);
                }
              }}
            >
              {folder.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {folder.expanded ? <FolderOpen size={14} color="#f1c40f" /> : <Folder size={14} color="#f1c40f" />}
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const name = await showDialog({ title: t.RENAME_FOLDER, message: t.ENTER_NEW_FOLDER_NAME, type: 'prompt', defaultValue: folder.name });
                  if (name && typeof name === 'string') updateFolder(folder.id, { name });
                }}
                style={{ ...miniIconButtonStyle, padding: '2px' }}
              >
                <Edit2 size={10} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); if (confirm(t.DELETE_FOLDER_CONFIRM.replace('{name}', folder.name))) removeFolder(folder.id); }}
                style={{ ...miniIconButtonStyle, padding: '2px', color: '#e74c3c' }}
              >
                <Trash2 size={10} />
              </button>
            </div>
            {folder.expanded && (
              <div style={{ borderLeft: '1px solid #333', marginLeft: 8 }}>
                {renderFolderContent(folder.id)}
              </div>
            )}
          </div>
        ))}
        {displayVariables.map(v => renderVariable(v))}
      </div>
    );
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Variable size={14} />
          {t.GLOBAL_VARIABLES}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => addFolder('globalVariable', t.NEW_FOLDER)}
            style={miniIconButtonStyle}
            title={t.NEW_FOLDER}
          >
            <Folder size={12} />
          </button>
        </div>
      </div>

      <div style={{ padding: '8px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '6px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input 
            type="text" 
            placeholder={t.SEARCH_VARIABLES}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#181818',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#ccc',
              fontSize: '11px',
              padding: '6px 8px 6px 26px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div 
        style={{ flex: 1, overflowY: 'auto' }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('x-cre-org-globalvariable') || e.dataTransfer.types.includes('x-cre-org-folder-globalvariable')) {
            e.preventDefault();
            setDragIndicator('root');
          }
        }}
        onDragLeave={() => setDragIndicator(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragIndicator(null);
          const draggedFolderId = e.dataTransfer.getData('folder-id');
          const entityId = e.dataTransfer.getData('entity-id');
          const entityType = e.dataTransfer.getData('organize-type');
          if (draggedFolderId) {
            updateFolder(draggedFolderId, { parentId: null });
          } else if (entityId && entityType === 'globalVariable') {
            moveEntityToFolder('globalVariable', entityId, null);
          }
        }}
      >
        <div style={{ 
          outline: dragIndicator === 'root' ? '1px solid #007acc' : 'none', 
          outlineOffset: '-1px',
          minHeight: '100%'
        }}>
          {renderFolderContent(null)}
          {project.globalVariables.length === 0 && project.folders.filter(f => f.type === 'globalVariable').length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ color: '#444' }}><Variable size={48} /></div>
              <div style={{ color: '#555', fontStyle: 'italic', fontSize: '11px' }}>
                {t.NO_VARIABLES_DEFINED}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #111', backgroundColor: '#181818', fontSize: '10px', color: '#444', letterSpacing: '0.5px' }}>
        {t.TOTAL}: {project.globalVariables.length} {t.VARIABLES_COUNT}
      </div>

      {dialogState && editingVar && (
        <VariableDialog 
          title={t.EDIT_VARIABLE}
          variable={editingVar}
          existingNames={project.globalVariables.filter(v => v.id !== dialogState.variableId).map(v => v.name)}
          onSave={(updates) => {
            if (dialogState.variableId) {
              updateGlobalVariable(dialogState.variableId, updates);
            }
            setDialogState(null);
          }}
          onCancel={() => setDialogState(null)}
          showStaticConstant={true}
        />
      )}

      <style>{`
        .var-item-hover:hover {
          background-color: #252526;
        }
        .var-item-hover:hover button {
          color: #aaa;
        }
        .usage-item:hover {
          background-color: #222;
          border-left-color: #007acc !important;
        }
      `}</style>
    </div>
  );
};
