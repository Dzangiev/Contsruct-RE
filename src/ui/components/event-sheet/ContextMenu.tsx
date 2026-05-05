import React from 'react';
import { 
  EyeOff, Eye, Copy, Scissors, Clipboard, 
  Plus, Variable, Zap, Trash2, FilePlus, GitBranch, Folder
} from 'lucide-react';
import { useEditorStore } from '../../../store/useEditorStore';
import { Project, EventBlock } from '../../../model/project';
import { getTranslation } from '../../../i18n';

interface ContextMenuProps {
  project: Project;
  x: number;
  y: number;
  blockId: string | null;
  logicItemId: string | null | undefined;
  eventSheetId: string;
  onAddVariable: (parentId?: string | null) => void;
  onAddGroup: (parentId?: string | null) => void;
  onEditGroup: (eventSheetId: string, blockId: string, block: EventBlock) => void;
  onClose: () => void;
  setBrowserState: (state: any) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  project, x, y, blockId, logicItemId, eventSheetId, onAddVariable, onAddGroup, onEditGroup, onClose, setBrowserState 
}) => {
  const { editorState, addEventBlock, removeEventBlock, copySelected, cutSelected, pasteSelected, addCondition, updateEventBlock, toggleConditionInverted, toggleOrBlock, removeCondition, removeAction, pasteLogicItem } = useEditorStore();
  const t = getTranslation(editorState.language);
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];

  const findBlock = (list: EventBlock[]): EventBlock | undefined => { for (const b of list) { if (b.id === blockId) return b; const f = findBlock(b.children); if (f) return f; } return undefined; };
  const currentBlock = blockId ? findBlock(project.eventSheets.find(es => es.id === eventSheetId)?.events || []) : undefined;
  const isLogicItem = !!logicItemId;

  const contextItemStyle: React.CSSProperties = { padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', transition: 'background 0.1s' };
  const contextDividerStyle: React.CSSProperties = { height: '1px', backgroundColor: '#444', margin: '4px 0' };

  return (
    <div style={{ position: 'fixed', top: y, left: x, backgroundColor: '#2d2d2d', border: '1px solid #444', borderRadius: '4px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', zIndex: 3000, padding: '4px 0', minWidth: '180px' }}>
      {isLogicItem ? (
        <>
          <div style={contextItemStyle} onClick={() => { if (blockId && logicItemId) { 
            const findB = (list: EventBlock[]): EventBlock | undefined => { for (const b of list) { if (b.id === blockId) return b; const f = findB(b.children); if (f) return f; } return undefined; };
            const b = findB(project.eventSheets.find(es => es.id === eventSheetId)?.events || []);
            if (b) {
              if (b.conditions.some(c => c.id === logicItemId)) useEditorStore.getState().toggleConditionDisabled(eventSheetId, blockId, logicItemId);
              else if (b.actions.some(a => a.id === logicItemId)) useEditorStore.getState().toggleActionDisabled(eventSheetId, blockId, logicItemId);
            }
          } onClose(); }}><EyeOff size={14} /> {t.TOGGLE_DISABLED}</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { copySelected(); onClose(); }}><Copy size={14} /> {t.COPY_ITEM}</div>
          <div style={contextItemStyle} onClick={() => { cutSelected(); onClose(); }}><Scissors size={14} /> {t.CUT_ITEM}</div>
          <div style={contextDividerStyle} />
          {blockId && logicItemId && (
            <div style={contextItemStyle} onClick={() => { toggleConditionInverted(eventSheetId, blockId, logicItemId); onClose(); }}><Eye size={14} /> {t.INVERT}</div>
          )}
          <div style={contextDividerStyle} />
          <div onClick={() => { if (blockId && logicItemId) { removeCondition(eventSheetId, blockId, logicItemId); removeAction(eventSheetId, blockId, logicItemId); } onClose(); }} style={{ ...contextItemStyle, color: '#f44336' }}><Trash2 size={14} /> {t.DELETE_ITEM}</div>
        </>
      ) : blockId ? (
        <>
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, blockId, 'event'); onClose(); }}><Plus size={14} /> {t.ADD_SUB_EVENT}</div>
          <div style={contextItemStyle} onClick={() => { onAddVariable(blockId); onClose(); }}><Variable size={14} /> {t.ADD_LOCAL_VARIABLE}</div>
          <div style={contextItemStyle} onClick={() => { onAddGroup(blockId); onClose(); }}><Folder size={14} /> {t.ADD_SUB_GROUP}</div>
          {currentBlock?.type === 'group' && (
            <div style={contextItemStyle} onClick={() => { onEditGroup(eventSheetId, blockId, currentBlock); onClose(); }}><Folder size={14} /> {t.EDIT_GROUP_PROPERTIES}</div>
          )}
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { setBrowserState({ isOpen: true, mode: 'condition', eventSheetId, blockId }); onClose(); }}><Plus size={14} /> {t.ADD_CONDITION} (C)</div>
          <div style={contextItemStyle} onClick={() => { setBrowserState({ isOpen: true, mode: 'action', eventSheetId, blockId }); onClose(); }}><Plus size={14} /> {t.ADD_ACTION} (A)</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { updateEventBlock(eventSheetId, blockId, { disabled: !currentBlock?.disabled }); onClose(); }}><EyeOff size={14} /> {currentBlock?.disabled ? t.ENABLE : t.DISABLE}</div>
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, null, 'event'); addCondition(eventSheetId, 'LAST', 'else', []); onClose(); }}><GitBranch size={14} /> {t.ADD_ELSE}</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { toggleOrBlock(eventSheetId, blockId); onClose(); }}> {currentBlock?.isOrBlock ? t.MAKE_AND_BLOCK : t.MAKE_OR_BLOCK}</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { useEditorStore.getState().moveEventBlock(eventSheetId, blockId, null, 0, undefined, blockId); onClose(); }}>{t.ADD_ABOVE}</div>
          <div style={contextItemStyle} onClick={() => { useEditorStore.getState().moveEventBlock(eventSheetId, blockId, null, 0, blockId, undefined); onClose(); }}>{t.ADD_BELOW}</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { copySelected(); onClose(); }}><Copy size={14} /> {t.COPY_BLOCK}</div>
          <div style={contextItemStyle} onClick={() => { cutSelected(); onClose(); }}><Scissors size={14} /> {t.CUT_BLOCK}</div>
          <div style={contextItemStyle} onClick={() => { pasteSelected(eventSheetId, blockId); pasteLogicItem(eventSheetId, blockId, 0); onClose(); }}><Clipboard size={14} /> {t.PASTE}</div>
          <div style={contextDividerStyle} />
          <div style={{ padding: '6px 12px', fontSize: '11px', color: '#666', fontWeight: 'bold' }}>{t.SET_COLOR}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', padding: '4px 12px' }}>
            {colors.map(c => <div key={c} onClick={() => { updateEventBlock(eventSheetId, blockId, { color: c }); onClose(); }} style={{ width: '20px', height: '20px', backgroundColor: c, borderRadius: '2px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }} />)}
          </div>
          <div style={contextDividerStyle} />
          <div onClick={() => { removeEventBlock(eventSheetId, blockId); onClose(); }} style={{ ...contextItemStyle, color: '#f44336' }}><Trash2 size={14} /> {t.DELETE_BLOCK}</div>
        </>
      ) : (
        <>
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, null, 'event'); onClose(); }}><Plus size={14} /> {t.ADD_EVENT} (E)</div>
          <div style={contextItemStyle} onClick={() => { onAddVariable(null); onClose(); }}><Variable size={14} /> {t.ADD_VARIABLE} (V)</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, null, 'function'); onClose(); }}><Zap size={14} /> {t.ADD_FUNCTION} (F)</div>
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, null, 'include'); onClose(); }}><FilePlus size={14} /> {t.ADD_INCLUDE}</div>
          <div style={contextItemStyle} onClick={() => { onAddGroup(null); onClose(); }}><Folder size={14} /> {t.ADD_GROUP} (G)</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { pasteSelected(eventSheetId, null); onClose(); }}><Clipboard size={14} /> {t.PASTE}</div>
        </>
      )}
    </div>
  );
};
