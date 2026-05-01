import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { EventBlock } from '../../model/project';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';

export const EventSheetEditor: React.FC = () => {
  const { project, editorState, addEventBlock } = useEditorStore();
  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const eventSheet = project.eventSheets.find(es => es.id === activeLayout?.eventSheetId) || project.eventSheets[0];

  if (!eventSheet) {
    return <div style={{ color: '#666', padding: '20px' }}>No event sheet found.</div>;
  }

  return (
    <div className="event-sheet-editor" style={{
      flex: 1,
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      overflowY: 'auto',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>{eventSheet.name}</h2>
        <button 
          onClick={() => addEventBlock(eventSheet.id, null, 'event')}
          style={{
            backgroundColor: '#007acc',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px'
          }}
        >
          <Plus size={16} /> Add Event
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {eventSheet.events.map(event => (
          <EventBlockItem key={event.id} eventSheetId={eventSheet.id} block={event} />
        ))}
        {eventSheet.events.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666', border: '2px dashed #333', borderRadius: '8px' }}>
            This event sheet is empty. Click "Add Event" to begin.
          </div>
        )}
      </div>
    </div>
  );
};

const EventBlockItem: React.FC<{ eventSheetId: string, block: EventBlock }> = ({ eventSheetId, block }) => {
  const { 
    project,
    updateEventBlock, 
    removeEventBlock, 
    addCondition, 
    addAction,
    addEventBlock
  } = useEditorStore();

  const isDisabled = block.disabled;

  return (
    <div style={{
      border: '1px solid #333',
      borderRadius: '4px',
      backgroundColor: isDisabled ? '#252526' : '#2d2d2d',
      opacity: isDisabled ? 0.6 : 1,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', borderBottom: block.children.length > 0 ? '1px solid #333' : 'none' }}>
        {/* Conditions Section */}
        <div style={{ flex: 1, padding: '10px', borderRight: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>Conditions</span>
            <button onClick={() => addCondition(eventSheetId, block.id, 'On Start')} style={smallButtonStyle} title="Add Condition">
              <Plus size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {block.conditions.map(c => (
              <ConditionItem 
                key={c.id} 
                project={project} 
                eventSheetId={eventSheetId} 
                blockId={block.id} 
                condition={c} 
              />
            ))}
          </div>
        </div>

        {/* Actions Section */}
        <div style={{ flex: 1, padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>Actions</span>
            <button onClick={() => addAction(eventSheetId, block.id, 'Set X')} style={smallButtonStyle} title="Add Action">
              <Plus size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {block.actions.map(a => (
              <ActionItem 
                key={a.id} 
                project={project} 
                eventSheetId={eventSheetId} 
                blockId={block.id} 
                action={a} 
              />
            ))}
          </div>
        </div>

        {/* Control Section */}
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '1px solid #333', backgroundColor: '#1e1e1e' }}>
          <button 
            onClick={() => updateEventBlock(eventSheetId, block.id, { disabled: !block.disabled })} 
            style={iconButtonStyle}
            title={isDisabled ? "Enable" : "Disable"}
          >
            {isDisabled ? <EyeOff size={14} color="#e67e22" /> : <Eye size={14} />}
          </button>
          <button 
            onClick={() => addEventBlock(eventSheetId, block.id, 'event')} 
            style={iconButtonStyle}
            title="Add Sub-event"
          >
            <Plus size={14} color="#4caf50" />
          </button>
          <button 
            onClick={() => removeEventBlock(eventSheetId, block.id)} 
            style={iconButtonStyle}
            title="Delete Block"
          >
            <Trash2 size={14} color="#f44336" />
          </button>
        </div>
      </div>

      {/* Sub-events Section */}
      {block.children.length > 0 && (
        <div style={{ 
          padding: '10px 10px 10px 25px', 
          borderLeft: '2px solid #444', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          {block.children.map(child => (
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

  return (
    <div style={logicItemStyle}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        <select 
          value={condition.targetObjectTypeId || ''} 
          onChange={e => handleUpdate({ targetObjectTypeId: e.target.value || undefined })}
          style={selectStyle}
        >
          <option value="">System</option>
          {project.objectTypes.map((ot: any) => <option key={ot.id} value={ot.id}>{ot.name}</option>)}
        </select>
        <input 
          value={condition.type} 
          onChange={e => handleUpdate({ type: e.target.value })} 
          style={inputStyle}
          placeholder="Condition Type"
        />
        <button onClick={() => removeCondition(eventSheetId, blockId, condition.id)} style={iconButtonStyle}>
          <Trash2 size={12} />
        </button>
      </div>
      <input 
        value={localParams} 
        onChange={e => setLocalParams(e.target.value)}
        onBlur={onParamsBlur}
        style={{ ...inputStyle, width: '100%', border: error ? '1px solid #f44336' : '1px solid #444' }}
        placeholder="Params (JSON array)"
      />
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

  return (
    <div style={logicItemStyle}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        <select 
          value={action.targetObjectTypeId || ''} 
          onChange={e => handleUpdate({ targetObjectTypeId: e.target.value || undefined })}
          style={selectStyle}
        >
          <option value="">System</option>
          {project.objectTypes.map((ot: any) => <option key={ot.id} value={ot.id}>{ot.name}</option>)}
        </select>
        <input 
          value={action.type} 
          onChange={e => handleUpdate({ type: e.target.value })} 
          style={inputStyle}
          placeholder="Action Type"
        />
        <button onClick={() => removeAction(eventSheetId, blockId, action.id)} style={iconButtonStyle}>
          <Trash2 size={12} />
        </button>
      </div>
      <input 
        value={localParams} 
        onChange={e => setLocalParams(e.target.value)}
        onBlur={onParamsBlur}
        style={{ ...inputStyle, width: '100%', border: error ? '1px solid #f44336' : '1px solid #444' }}
        placeholder="Params (JSON array)"
      />
    </div>
  );
};

const logicItemStyle: React.CSSProperties = {
  backgroundColor: '#333',
  padding: '6px',
  borderRadius: '4px',
  display: 'flex',
  flexDirection: 'column'
};

const selectStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  color: '#fff',
  border: '1px solid #444',
  borderRadius: '2px',
  fontSize: '11px',
  flex: 1,
  padding: '2px'
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  color: '#fff',
  border: '1px solid #444',
  borderRadius: '2px',
  fontSize: '11px',
  flex: 2,
  padding: '2px 4px'
};

const smallButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #444',
  color: '#888',
  cursor: 'pointer',
  padding: '0 4px',
  borderRadius: '2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const iconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
