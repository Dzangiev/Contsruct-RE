import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { EventBlock } from '../../model/project';
import { Plus, Trash2, Eye, EyeOff, Search } from 'lucide-react';

export const EventSheetEditor: React.FC = () => {
  const { project, editorState, addEventBlock } = useEditorStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const eventSheet = project.eventSheets.find(es => es.id === activeLayout?.eventSheetId) || project.eventSheets[0];

  if (!eventSheet) {
    return <div style={{ color: '#666', padding: '20px' }}>No event sheet found.</div>;
  }

  const filterBlocks = (blocks: EventBlock[]): EventBlock[] => {
    if (!searchTerm) return blocks;
    return blocks.filter(b => {
      const matchComment = b.commentText?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGroup = b.groupName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchVar = b.variable?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchConditions = b.conditions.some(c => c.type.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchActions = b.actions.some(a => a.type.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchChildren = filterBlocks(b.children).length > 0;
      return matchComment || matchGroup || matchVar || matchConditions || matchActions || matchChildren;
    });
  };

  const visibleEvents = filterBlocks(eventSheet.events);

  return (
    <div className="event-sheet-editor" style={{
      flex: 1,
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      overflowY: 'auto',
      padding: '0',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '10px 20px',
        backgroundColor: '#252526',
        borderBottom: '1px solid #333',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{eventSheet.name}</h2>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', color: '#666' }} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search events..."
              style={{
                backgroundColor: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: '4px',
                padding: '4px 10px 4px 28px',
                fontSize: '12px',
                color: '#fff',
                width: '200px'
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => addEventBlock(eventSheet.id, null, 'event')}
            style={toolbarButtonStyle}
          >
            <Plus size={14} /> Add Event
          </button>
          <button 
            onClick={() => addEventBlock(eventSheet.id, null, 'group')}
            style={toolbarButtonStyle}
          >
            <Plus size={14} /> Add Group
          </button>
          <button 
            onClick={() => addEventBlock(eventSheet.id, null, 'comment')}
            style={toolbarButtonStyle}
          >
            <Plus size={14} /> Add Comment
          </button>
          <button 
            onClick={() => addEventBlock(eventSheet.id, null, 'variable')}
            style={toolbarButtonStyle}
          >
            <Plus size={14} /> Add Variable
          </button>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visibleEvents.map((event, index) => (
          <EventBlockItem key={event.id} eventSheetId={eventSheet.id} block={event} index={index + 1} />
        ))}
        {eventSheet.events.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666', border: '2px dashed #333', borderRadius: '8px' }}>
            This event sheet is empty. Use the buttons above to begin.
          </div>
        )}
        {eventSheet.events.length > 0 && visibleEvents.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No events match your search.
          </div>
        )}
      </div>
    </div>
  );
};

const EventBlockItem: React.FC<{ eventSheetId: string, block: EventBlock, index?: number }> = ({ eventSheetId, block, index }) => {
  const { 
    project,
    updateEventBlock, 
    removeEventBlock, 
    addCondition, 
    addAction,
    addEventBlock
  } = useEditorStore();

  const isDisabled = block.disabled;

  if (block.type === 'variable' && block.variable) {
    return (
      <div style={{
        backgroundColor: '#252526',
        border: '1px solid #444',
        borderLeft: '4px solid #3498db',
        padding: '6px 12px',
        margin: '4px 0',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ color: '#3498db', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Global</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <input
            value={block.variable.name}
            onChange={(e) => updateEventBlock(eventSheetId, block.id, { variable: { ...block.variable!, name: e.target.value } })}
            style={{ ...inputStyle, width: 'auto', fontWeight: 'bold' }}
          />
          <span style={{ color: '#888', fontSize: '12px' }}>=</span>
          <input
            value={block.variable.initialValue}
            onChange={(e) => updateEventBlock(eventSheetId, block.id, { variable: { ...block.variable!, initialValue: e.target.value } })}
            style={{ ...inputStyle, width: '80px' }}
          />
          <span style={{ color: '#666', fontSize: '11px', marginLeft: '10px' }}>({block.variable.type})</span>
        </div>
        <button onClick={() => removeEventBlock(eventSheetId, block.id)} style={iconButtonStyle}>
          <Trash2 size={14} color="#f44336" />
        </button>
      </div>
    );
  }

  if (block.type === 'comment') {
    return (
      <div style={{
        backgroundColor: '#feffc1',
        color: '#000',
        padding: '8px 12px',
        margin: '4px 0',
        borderRadius: '2px',
        borderLeft: '4px solid #f1c40f',
        fontSize: '13px',
        fontStyle: 'italic',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start'
      }}>
        <textarea
          value={block.commentText || ''}
          onChange={(e) => updateEventBlock(eventSheetId, block.id, { commentText: e.target.value })}
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            width: '100%',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontStyle: 'inherit'
          }}
          placeholder="Double-click to edit comment..."
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
          }}
        />
        <button onClick={() => removeEventBlock(eventSheetId, block.id)} style={{ ...iconButtonStyle, color: '#666' }}>
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  if (block.type === 'group') {
    return (
      <div style={{
        margin: '8px 0',
        border: '1px solid #444',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#333',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none'
        }} onClick={() => updateEventBlock(eventSheetId, block.id, { groupExpanded: !block.groupExpanded })}>
          <span style={{ fontSize: '12px', transform: block.groupExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}>▶</span>
          <input
            value={block.groupName || ''}
            onChange={(e) => updateEventBlock(eventSheetId, block.id, { groupName: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 'bold',
              outline: 'none',
              flex: 1
            }}
            placeholder="Group Name"
          />
          <button 
            onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { disabled: !block.disabled }); }} 
            style={iconButtonStyle}
          >
            {isDisabled ? <EyeOff size={14} color="#e67e22" /> : <Eye size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheetId, block.id, 'event'); }} 
            style={iconButtonStyle}
          >
            <Plus size={14} color="#4caf50" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); removeEventBlock(eventSheetId, block.id); }} 
            style={iconButtonStyle}
          >
            <Trash2 size={14} color="#f44336" />
          </button>
        </div>
        {block.groupExpanded && (
          <div style={{ padding: '8px 8px 8px 20px', backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {block.children.map((child, i) => (
              <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} />
            ))}
            {block.children.length === 0 && (
              <div style={{ padding: '10px', color: '#666', fontSize: '11px', textAlign: 'center' }}>Group is empty.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #333',
      borderRadius: '2px',
      backgroundColor: isDisabled ? '#252526' : '#2d2d2d',
      opacity: isDisabled ? 0.6 : 1,
      marginBottom: '2px'
    }}>
      <div style={{ display: 'flex', minHeight: '60px' }}>
        {/* Event Number */}
        <div style={{
          width: '30px',
          backgroundColor: '#333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#888',
          borderRight: '1px solid #444',
          userSelect: 'none'
        }}>
          {index}
        </div>

        {/* Conditions Section */}
        <div style={{ flex: 1, padding: '8px', borderRight: '1px solid #333', minWidth: '300px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {block.conditions.map(c => (
              <ConditionItem 
                key={c.id} 
                project={project} 
                eventSheetId={eventSheetId} 
                blockId={block.id} 
                condition={c} 
              />
            ))}
            <button 
              onClick={() => addCondition(eventSheetId, block.id, 'On Start')} 
              style={{ ...addLinkStyle, alignSelf: 'flex-start' }}
            >
              + Add condition
            </button>
          </div>
        </div>

        {/* Actions Section */}
        <div style={{ flex: 1, padding: '8px', minWidth: '300px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {block.actions.map(a => (
              <ActionItem 
                key={a.id} 
                project={project} 
                eventSheetId={eventSheetId} 
                blockId={block.id} 
                action={a} 
              />
            ))}
            <button 
              onClick={() => addAction(eventSheetId, block.id, 'Set X')} 
              style={{ ...addLinkStyle, alignSelf: 'flex-start' }}
            >
              + Add action
            </button>
          </div>
        </div>

        {/* Control Section (Construct style right-click or hover) */}
        <div style={{ 
          padding: '4px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px', 
          borderLeft: '1px solid #333', 
          backgroundColor: '#252526',
          width: '28px'
        }}>
          <button onClick={() => updateEventBlock(eventSheetId, block.id, { disabled: !block.disabled })} style={iconButtonStyle}>
            {isDisabled ? <EyeOff size={12} color="#e67e22" /> : <Eye size={12} />}
          </button>
          <button onClick={() => addEventBlock(eventSheetId, block.id, 'event')} style={iconButtonStyle}>
            <Plus size={12} color="#4caf50" />
          </button>
          <button onClick={() => removeEventBlock(eventSheetId, block.id)} style={iconButtonStyle}>
            <Trash2 size={12} color="#f44336" />
          </button>
        </div>
      </div>

      {/* Sub-events Section */}
      {block.children.length > 0 && (
        <div style={{ 
          padding: '2px 0 2px 30px', 
          backgroundColor: 'rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          {block.children.map((child, i) => (
            <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} />
          ))}
        </div>
      )}
    </div>
  );
};

const ConditionItem: React.FC<{ project: any, eventSheetId: string, blockId: string, condition: any }> = ({ project, eventSheetId, blockId, condition }) => {
  const { updateCondition, removeCondition } = useEditorStore();
  const [localParams, setLocalParams] = React.useState(JSON.stringify(condition.params));
  const [error, setError] = React.useState(false);

  const handleUpdate = (updates: any) => {
    updateCondition(eventSheetId, blockId, condition.id, updates);
  };

  const onParamsBlur = () => {
    try {
      const parsed = JSON.parse(localParams);
      if (Array.isArray(parsed)) {
        handleUpdate({ params: parsed });
        setError(false);
      } else { setError(true); }
    } catch { setError(true); }
  };

  const targetObject = project.objectTypes.find((ot: any) => ot.id === condition.targetObjectTypeId);

  return (
    <div style={logicItemStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ 
          width: '16px', 
          height: '16px', 
          backgroundColor: targetObject?.assetId ? 'transparent' : '#555',
          borderRadius: '2px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px'
        }}>
          {targetObject?.name?.[0] || 'S'}
        </div>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#aaa', fontSize: '12px' }}>{targetObject?.name || 'System'}</span>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 500 }}>{condition.type}</span>
          <span style={{ color: '#888', fontSize: '11px' }}>({condition.params.join(', ')})</span>
        </div>
        <div className="item-controls" style={{ display: 'flex', gap: '2px' }}>
           <button onClick={() => removeCondition(eventSheetId, blockId, condition.id)} style={iconButtonStyle}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {/* Hidden editing inputs - in a real app this would be a popup dialog */}
      <div style={{ display: 'none' }}>
        <input value={localParams} onChange={e => setLocalParams(e.target.value)} onBlur={onParamsBlur} />
      </div>
    </div>
  );
};

const ActionItem: React.FC<{ project: any, eventSheetId: string, blockId: string, action: any }> = ({ project, eventSheetId, blockId, action }) => {
  const { updateAction, removeAction } = useEditorStore();
  const [localParams, setLocalParams] = React.useState(JSON.stringify(action.params));
  const [error, setError] = React.useState(false);

  const handleUpdate = (updates: any) => {
    updateAction(eventSheetId, blockId, action.id, updates);
  };

  const onParamsBlur = () => {
    try {
      const parsed = JSON.parse(localParams);
      if (Array.isArray(parsed)) {
        handleUpdate({ params: parsed });
        setError(false);
      } else { setError(true); }
    } catch { setError(true); }
  };

  const targetObject = project.objectTypes.find((ot: any) => ot.id === action.targetObjectTypeId);

  return (
    <div style={logicItemStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ 
          width: '16px', 
          height: '16px', 
          backgroundColor: targetObject?.assetId ? 'transparent' : '#555',
          borderRadius: '2px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px'
        }}>
          {targetObject?.name?.[0] || 'S'}
        </div>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#aaa', fontSize: '12px' }}>{targetObject?.name || 'System'}</span>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 500 }}>{action.type}</span>
          <span style={{ color: '#888', fontSize: '11px' }}>({action.params.join(', ')})</span>
        </div>
        <div className="item-controls" style={{ display: 'flex', gap: '2px' }}>
           <button onClick={() => removeAction(eventSheetId, blockId, action.id)} style={iconButtonStyle}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

const toolbarButtonStyle: React.CSSProperties = {
  backgroundColor: '#3c3c3c',
  color: '#ccc',
  border: '1px solid #444',
  padding: '4px 10px',
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '12px'
};

const logicItemStyle: React.CSSProperties = {
  padding: '4px 6px',
  borderRadius: '2px',
  display: 'flex',
  flexDirection: 'column',
  transition: 'background-color 0.1s',
  cursor: 'pointer'
};

const addLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#007acc',
  fontSize: '12px',
  cursor: 'pointer',
  padding: '4px 0',
  textAlign: 'left'
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
  borderRadius: '2px'
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  color: '#fff',
  border: '1px solid #444',
  borderRadius: '2px',
  fontSize: '11px',
  padding: '2px 4px'
};
