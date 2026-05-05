import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { ObjectTypeKind } from '../../model/project';
import { 
  Plus, 
  Layout as LayoutIcon, 
  Package,
  Users,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Eye, 
  EyeOff, 
  Search, 
  Copy, 
  Scissors, 
  Clipboard, 
  ChevronUp, 
  List, 
  Settings, 
  Info, 
  Undo, 
  Redo, 
  Maximize2, 
  Minimize2, 
  Terminal, 
  Code, 
  Box, 
  Layers, 
  MousePointer2, 
  GitBranch, 
  Replace, 
  AlertCircle, 
  Variable, 
  Palette, 
  FilePlus, 
  Zap, 
  Bookmark, 
  BookmarkPlus, 
  Ghost, 
  MousePointer, 
  Monitor
} from 'lucide-react';
import { getTranslation } from '../../i18n';

const explorerStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#1e1e1e',
  color: '#ccc',
  fontSize: '12px',
  userSelect: 'none'
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 12px',
  background: '#2d2d2d',
  borderBottom: '1px solid #1a1a1a',
  marginBottom: '2px',
  color: '#888',
  fontSize: '10px',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.8px'
};

const itemStyle = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 10px',
  cursor: 'pointer',
  backgroundColor: selected ? '#094771' : 'transparent',
  color: selected ? '#fff' : '#ccc',
  fontSize: '12px',
  transition: 'background-color 0.1s, color 0.1s'
});

const miniIconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

export const ProjectExplorer: React.FC = () => {
  const { 
    project, 
    editorState, 
    setActiveLayout, 
    addLayout, 
    addObjectType,
    updateObjectType,
    updateLayout,
    updateFamily,
    setTool,
    setTab,
    setSelectedObjectType,
    setSelectedFamily,
    addFamily,
    openSpriteEditor,
    showDialog,
    addFolder,
    updateFolder,
    removeFolder,
    moveEntityToFolder,
    addGlobalVariable,
    updateGlobalVariable,
    removeGlobalVariable
  } = useEditorStore();

  const t = getTranslation(editorState.language);

  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, folderId?: string, itemId?: string, type: string } | null>(null);
  const [dragIndicator, setDragIndicator] = React.useState<string | null>(null);

  const handleContextMenu = (e: React.MouseEvent, type: string, folderId?: string, itemId?: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, folderId, itemId, type });
  };

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const renderFolderContent = (type: 'layout' | 'objectType' | 'family' | 'eventSheet', parentId: string | null) => {
    const folders = project.folders.filter(f => f.type === type && f.parentId === parentId);
    
    // Helper to check if a folder is a descendant of another (to prevent circular loops)
    const isDescendant = (childId: string, parentId: string): boolean => {
      let current = project.folders.find(f => f.id === childId);
      while (current && current.parentId) {
        if (current.parentId === parentId) return true;
        current = project.folders.find(f => f.id === current?.parentId);
      }
      return false;
    };

    let items: any[] = [];
    if (type === 'layout') items = project.layouts.filter(l => (l.folderId ?? null) === parentId);
    else if (type === 'objectType') items = project.objectTypes.filter(ot => (ot.folderId ?? null) === parentId);
    else if (type === 'family') items = project.families.filter(f => (f.folderId ?? null) === parentId);
    else if (type === 'eventSheet') items = project.eventSheets.filter(es => (es.folderId ?? null) === parentId);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {folders.map(folder => (
          <div key={folder.id} style={{ marginLeft: parentId === null ? 0 : 12 }}>
            <div 
              style={{ 
                ...itemStyle(false), 
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
                e.dataTransfer.setData('organize-type', type);
                e.dataTransfer.setData(`x-cre-org-folder-${type.toLowerCase()}`, 'true');
                e.dataTransfer.setData(`x-cre-f-${folder.id.toLowerCase()}`, 'true');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => updateFolder(folder.id, { expanded: !folder.expanded })}
              onContextMenu={(e) => handleContextMenu(e, type, folder.id)}
              onDragOver={(e) => {
                const isItemDrag = e.dataTransfer.types.includes(`x-cre-org-${type.toLowerCase()}`);
                const isFolderDrag = e.dataTransfer.types.includes(`x-cre-org-folder-${type.toLowerCase()}`);
                const isSelf = e.dataTransfer.types.includes(`x-cre-f-${folder.id.toLowerCase()}`);
                
                if ((isItemDrag || isFolderDrag) && !isSelf) {
                  // Prevent dropping a folder into itself or its children
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
                  // Folder-in-folder move
                  if (draggedFolderId !== folder.id && !isDescendant(folder.id, draggedFolderId)) {
                    updateFolder(draggedFolderId, { parentId: folder.id });
                  }
                } else if (entityId && entityType === type) {
                  // Item-in-folder move
                  moveEntityToFolder(entityType as any, entityId, folder.id);
                }
              }}
            >
              {folder.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {folder.expanded ? <FolderOpen size={14} color="#f1c40f" /> : <Folder size={14} color="#f1c40f" />}
              <span style={{ flex: 1 }}>{folder.name}</span>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const name = await showDialog({ title: t.RENAME, message: `${t.NAME}:`, type: 'prompt', defaultValue: folder.name });
                  if (name && typeof name === 'string') updateFolder(folder.id, { name });
                }}
                style={miniIconButtonStyle}
              >
                <Edit2 size={10} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); if (confirm(`${t.DELETE} ${t.FOLDER.toLowerCase()} "${folder.name}"? ${t.CONTENTS_WILL_MOVE_UP}`)) removeFolder(folder.id); }}
                style={miniIconButtonStyle}
              >
                <Trash2 size={10} />
              </button>
            </div>
            {folder.expanded && (
              <div style={{ borderLeft: '1px solid #333', marginLeft: 8 }}>
                {renderFolderContent(type, folder.id)}
              </div>
            )}
          </div>
        ))}
        {items.map(item => {
           const isSelected = type === 'layout' ? editorState.activeLayoutId === item.id :
                              type === 'objectType' ? editorState.selectedObjectTypeId === item.id :
                              type === 'family' ? editorState.selectedFamilyId === item.id :
                              false; // TODO for event sheets

           return (
             <div 
               key={item.id}
               style={{ ...itemStyle(isSelected), marginLeft: parentId === null ? 0 : 12 }}
               draggable
               onDragStart={(e) => {
                 if (type === 'objectType') {
                   e.dataTransfer.setData('objectTypeId', item.id);
                 }
                 e.dataTransfer.setData('entity-id', item.id);
                 e.dataTransfer.setData(`x-cre-org-${type.toLowerCase()}`, 'true');
                 e.dataTransfer.setData('organize-type', type);
                 e.dataTransfer.effectAllowed = 'copyMove';
               }}
               onClick={() => {
                 if (type === 'layout') setActiveLayout(item.id, item.layers?.[0]?.id);
                 else if (type === 'objectType') setSelectedObjectType(item.id);
                 else if (type === 'family') setSelectedFamily(item.id);
                 else if (type === 'eventSheet') {
                   const layout = project.layouts.find(l => l.eventSheetId === item.id);
                   if (layout) setActiveLayout(layout.id);
                   setTab('eventSheet');
                 }

               }}
               onDoubleClick={() => {
                 if (type === 'objectType' && item.kind === ObjectTypeKind.Sprite) {
                   openSpriteEditor(item.id);
                 }
               }}
               onContextMenu={(e) => handleContextMenu(e, type, undefined, item.id)}
             >
               {type === 'layout' && <LayoutIcon size={14} color={isSelected ? '#007acc' : '#666'} />}
               {type === 'objectType' && <Package size={14} color={isSelected ? '#007acc' : '#666'} />}
               {type === 'family' && <Users size={14} color={isSelected ? '#007acc' : '#666'} />}
               {type === 'eventSheet' && <FileText size={14} color={isSelected ? '#007acc' : '#666'} />}
               
               <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
               
               {type === 'objectType' && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setTool('place', item.id); }}
                   style={{
                     marginLeft: 'auto',
                     background: editorState.placementObjectTypeId === item.id ? '#007acc' : '#333',
                     border: 'none',
                     color: '#fff',
                     cursor: 'pointer',
                     padding: '2px 8px',
                     borderRadius: '3px',
                     fontSize: '10px',
                     fontWeight: 600
                   }}
                 >
                   {editorState.placementObjectTypeId === item.id ? t.PLACING : t.PLACE}
                 </button>
               )}
               {type === 'family' && <span style={{ fontSize: '10px', color: '#555' }}>({item.objectTypeIds.length})</span>}
             </div>
           );
        })}
      </div>
    );
  };


  return (
    <div className="project-explorer" style={explorerStyle}>
      <div style={{ padding: '12px 16px 8px 16px', fontWeight: 800, fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {t.PROJECT_EXPLORER}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px 8px' }}>
        {/* Layouts */}
        <section 
          style={{ marginBottom: '16px' }}
          onDragOver={(e) => { 
            if (e.dataTransfer.types.includes('x-cre-org-layout') || e.dataTransfer.types.includes('x-cre-org-folder-layout')) {
              e.preventDefault(); 
              setDragIndicator('root-layout'); 
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
            } else if (entityId && entityType === 'layout') {
              moveEntityToFolder('layout', entityId, null);
            }
          }}
        >
          <div style={{ ...sectionHeaderStyle, outline: dragIndicator === 'root-layout' ? '1px solid #007acc' : 'none', outlineOffset: '-1px', backgroundColor: '#252526' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LayoutIcon size={12} />
              <span>{t.LAYOUTS}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => addFolder('layout', t.NEW_FOLDER)} style={miniIconButtonStyle} title={t.NEW_FOLDER}><Folder size={12} /></button>
              <button onClick={async () => {
                  const name = await showDialog({ title: t.NEW_LAYOUT, message: `${t.NAME}:`, type: 'prompt', defaultValue: `${t.LAYOUT} ${(project.layouts?.length || 0) + 1}` });
                  if (name && typeof name === 'string') addLayout(name);
              }} style={miniIconButtonStyle} title={t.ADD_LAYOUT}><Plus size={12} /></button>
            </div>
          </div>
          <div style={{ padding: '4px 0' }}>
            {renderFolderContent('layout', null)}
          </div>
        </section>

        {/* Object Types */}
        <section 
          style={{ marginBottom: '16px' }}
          onDragOver={(e) => { 
            if (e.dataTransfer.types.includes('x-cre-org-objecttype') || e.dataTransfer.types.includes('x-cre-org-folder-objecttype')) {
              e.preventDefault(); 
              setDragIndicator('root-objectType'); 
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
            } else if (entityId && entityType === 'objectType') {
              moveEntityToFolder('objectType', entityId, null);
            }
          }}
        >
          <div style={{ ...sectionHeaderStyle, outline: dragIndicator === 'root-objectType' ? '1px solid #007acc' : 'none', outlineOffset: '-1px', backgroundColor: '#252526' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={12} />
              <span>{t.OBJECT_TYPES}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => addFolder('objectType', t.NEW_FOLDER)} style={miniIconButtonStyle} title={t.NEW_FOLDER}><Folder size={12} /></button>
              <button 
                onClick={async () => {
                  const name = await showDialog({ title: t.NEW_SPRITE, message: `${t.NAME}:`, type: 'prompt', defaultValue: `${t.SPRITE} ${(project.objectTypes?.length || 0) + 1}` });
                  if (name && typeof name === 'string') addObjectType(name, ObjectTypeKind.Sprite);
                }}
                style={miniIconButtonStyle}
                title={t.ADD_OBJECT_TYPE}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div style={{ padding: '4px 0' }}>
            {renderFolderContent('objectType', null)}
          </div>
        </section>

        {/* Families */}
        <section 
          style={{ marginBottom: '16px' }}
          onDragOver={(e) => { 
            if (e.dataTransfer.types.includes('x-cre-org-family') || e.dataTransfer.types.includes('x-cre-org-folder-family')) {
              e.preventDefault(); 
              setDragIndicator('root-family'); 
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
            } else if (entityId && entityType === 'family') {
              moveEntityToFolder('family', entityId, null);
            }
          }}
        >
          <div style={{ ...sectionHeaderStyle, outline: dragIndicator === 'root-family' ? '1px solid #007acc' : 'none', outlineOffset: '-1px', backgroundColor: '#252526' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={12} />
              <span>{t.FAMILIES}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => addFolder('family', t.NEW_FOLDER)} style={miniIconButtonStyle} title={t.NEW_FOLDER}><Folder size={12} /></button>
              <button 
                onClick={async () => {
                  const name = await showDialog({ title: t.NEW_FAMILY, message: `${t.NAME}:`, type: 'prompt', defaultValue: `${t.FAMILY} ${(project.families?.length || 0) + 1}` });
                  if (name && typeof name === 'string') addFamily(name);
                }}
                style={miniIconButtonStyle}
                title={t.ADD_FAMILY}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div style={{ padding: '4px 0' }}>
            {renderFolderContent('family', null)}
            {project.families?.length === 0 && (
               <div style={{ padding: '8px 12px', color: '#555', fontStyle: 'italic', fontSize: '11px' }}>{t.NO_FAMILIES}</div>
            )}
          </div>
        </section>

        {/* Event Sheets */}
        <section 
          onDragOver={(e) => { 
            if (e.dataTransfer.types.includes('x-cre-org-eventsheet') || e.dataTransfer.types.includes('x-cre-org-folder-eventsheet')) {
              e.preventDefault(); 
              setDragIndicator('root-eventSheet'); 
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
            } else if (entityId && entityType === 'eventSheet') {
              moveEntityToFolder('eventSheet', entityId, null);
            }
          }}
        >
          <div style={{ ...sectionHeaderStyle, outline: dragIndicator === 'root-eventSheet' ? '1px solid #007acc' : 'none', outlineOffset: '-1px', backgroundColor: '#252526' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={12} />
              <span>{t.EVENT_SHEETS}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => addFolder('eventSheet', t.NEW_FOLDER)} style={miniIconButtonStyle} title={t.NEW_FOLDER}><Folder size={12} /></button>
              <button style={miniIconButtonStyle} title={t.ADD_EVENT_SHEET}><Plus size={12} /></button>
            </div>
          </div>
          <div style={{ padding: '4px 0' }}>
            {renderFolderContent('eventSheet', null)}
          </div>
        </section>
      </div>

      {contextMenu && (
        <div style={{ ...contextMenuStyle, top: contextMenu.y, left: contextMenu.x }}>
          {contextMenu.folderId ? (
            <>
              <div style={contextItemStyle} onClick={() => { addFolder(contextMenu.type as any, t.NEW_FOLDER, contextMenu.folderId); }}><Folder size={12} /> {t.NEW_SUB_FOLDER}</div>
              <div style={contextItemStyle} onClick={async () => { 
                const name = await showDialog({ title: t.RENAME_FOLDER, message: `${t.NAME}:`, type: 'prompt', defaultValue: project.folders.find(f => f.id === contextMenu.folderId)?.name });
                if (name && typeof name === 'string') updateFolder(contextMenu.folderId!, { name });
              }}><Edit2 size={12} /> {t.RENAME}</div>
              <div style={contextDividerStyle} />
              <div style={{ ...contextItemStyle, color: '#e74c3c' }} onClick={() => { if (confirm(t.DELETE_CONFIRM)) removeFolder(contextMenu.folderId!); }}><Trash2 size={12} /> {t.DELETE}</div>
            </>
          ) : contextMenu.itemId ? (
            <>
              <div style={contextItemStyle} onClick={async () => {
                const item = contextMenu.type === 'layout' ? project.layouts.find(l => l.id === contextMenu.itemId) :
                             contextMenu.type === 'objectType' ? project.objectTypes.find(ot => ot.id === contextMenu.itemId) :
                             project.families.find(f => f.id === contextMenu.itemId);
                const name = await showDialog({ title: t.RENAME, message: `${t.NAME}:`, type: 'prompt', defaultValue: item?.name });
                if (name && typeof name === 'string') {
                   if (contextMenu.type === 'layout') updateLayout(contextMenu.itemId!, { name });
                   else if (contextMenu.type === 'objectType') updateObjectType(contextMenu.itemId!, { name });
                   else if (contextMenu.type === 'family') updateFamily(contextMenu.itemId!, { name });
                }
              }}><Edit2 size={12} /> {t.RENAME}</div>
              <div style={contextDividerStyle} />
              <div style={{ ...contextItemStyle, color: '#e74c3c' }} onClick={() => { 
                // Delete item logic
              }}><Trash2 size={12} /> {t.DELETE}</div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

const contextMenuStyle: React.CSSProperties = {
  position: 'fixed',
  backgroundColor: '#2d2d2d',
  border: '1px solid #444',
  borderRadius: '4px',
  boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
  zIndex: 3000,
  padding: '4px 0',
  minWidth: '150px'
};

const contextItemStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '11px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: '#ccc',
  transition: 'background 0.1s'
};

const contextDividerStyle: React.CSSProperties = {
  height: '1px',
  backgroundColor: '#444',
  margin: '4px 0'
};




