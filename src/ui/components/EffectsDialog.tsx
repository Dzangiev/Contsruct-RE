import React from 'react';
import { Effect } from '../../model/project';
import { EffectDefinition, EFFECT_DEFINITIONS } from '../../model/definitions';
import { Plus, Trash2, X, Zap, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { getTranslation } from '../../i18n';
import { useEditorStore } from '../../store/useEditorStore';

interface EffectsDialogProps {
  effects: Effect[];
  onAdd: (type: string, name: string, properties: any) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
  onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  backdropFilter: 'blur(4px)',
  animation: 'fadeIn 0.2s ease-out'
};

const dialogStyle: React.CSSProperties = {
  width: '600px',
  height: '500px',
  backgroundColor: '#1e1e1e',
  borderRadius: '12px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.1)',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '16px 24px',
  backgroundColor: '#252526',
  borderBottom: '1px solid #333',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden'
};

const sidebarStyle: React.CSSProperties = {
  width: '200px',
  borderRight: '1px solid #333',
  overflowY: 'auto',
  backgroundColor: '#1a1a1a',
  padding: '12px 0'
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '24px',
  overflowY: 'auto',
  backgroundColor: '#1e1e1e'
};

export const EffectsDialog: React.FC<EffectsDialogProps> = ({ effects, onAdd, onRemove, onUpdate, onClose }) => {
  const language = useEditorStore(s => s.editorState.language);
  const t = getTranslation(language);
  const [selectedEffectId, setSelectedEffectId] = React.useState<string | null>(effects[0]?.id || null);
  const [showAddList, setShowAddList] = React.useState(false);

  const selectedEffect = effects.find(e => e.id === selectedEffectId);
  const selectedDef = selectedEffect ? EFFECT_DEFINITIONS.find((d: EffectDefinition) => d.type === selectedEffect.type) : null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Zap size={18} color="#f1c40f" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>{t.EFFECTS_TITLE}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={contentStyle}>
          <div style={sidebarStyle}>
            <div style={{ padding: '0 12px 12px', borderBottom: '1px solid #333', marginBottom: '12px' }}>
              <button 
                onClick={() => setShowAddList(!showAddList)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  backgroundColor: '#007acc', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '12px'
                }}
              >
                <Plus size={14} /> {t.ADD_EFFECT}
              </button>
            </div>

            {showAddList && (
              <div style={{ position: 'absolute', left: '20px', top: '120px', width: '200px', backgroundColor: '#2d2d2d', border: '1px solid #444', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100 }}>
                {EFFECT_DEFINITIONS.map((def: EffectDefinition) => (
                  <div 
                    key={def.type}
                    onClick={() => {
                      onAdd(def.type, def.name, def.propertyDefinitions.reduce((acc: any, p: any) => ({ ...acc, [p.name]: p.defaultValue }), {}));
                      setShowAddList(false);
                    }}
                    style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '12px', color: '#ccc', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#3e3e3e'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {def.nameKey ? (t as any)[def.nameKey] : def.name}
                  </div>
                ))}
              </div>
            )}

            {effects.map(effect => (
              <div 
                key={effect.id}
                onClick={() => setSelectedEffectId(effect.id)}
                style={{ 
                  padding: '10px 16px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  backgroundColor: selectedEffectId === effect.id ? '#37373d' : 'transparent',
                  color: effect.disabled ? '#555' : '#ccc',
                  borderLeft: selectedEffectId === effect.id ? '3px solid #007acc' : '3px solid transparent'
                }}
              >
                <Zap size={14} color={effect.disabled ? '#444' : '#f1c40f'} />
                <span style={{ flex: 1, fontSize: '13px' }}>
                  {(() => {
                    const def = EFFECT_DEFINITIONS.find(d => d.type === effect.type);
                    return def?.nameKey ? (t as any)[def.nameKey] : effect.name;
                  })()}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(effect.id); if (selectedEffectId === effect.id) setSelectedEffectId(null); }}
                  style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 2 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#555'}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div style={mainStyle}>
            {selectedEffect ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                   <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
                     {selectedDef?.nameKey ? (t as any)[selectedDef.nameKey] : selectedEffect.name}
                   </h3>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>{t.ENABLED}</span>
                      <input 
                        type="checkbox" 
                        checked={!selectedEffect.disabled} 
                        onChange={e => onUpdate(selectedEffect.id, { disabled: !e.target.checked })}
                      />
                   </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedDef?.propertyDefinitions.map((pDef: any) => (
                    <div key={pDef.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ width: '120px', color: '#888', fontSize: '12px' }}>
                        {pDef.labelKey ? (t as any)[pDef.labelKey] : pDef.name}
                      </label>
                      <input 
                        type={pDef.type === 'number' ? 'number' : 'text'}
                        value={selectedEffect.properties[pDef.name] ?? pDef.defaultValue}
                        step={pDef.type === 'number' ? 0.1 : 1}
                        onChange={e => {
                          const val = pDef.type === 'number' ? Number(e.target.value) : e.target.value;
                          onUpdate(selectedEffect.id, { properties: { ...selectedEffect.properties, [pDef.name]: val } });
                        }}
                        style={{ 
                          flex: 1, 
                          backgroundColor: '#252526', 
                          border: '1px solid #444', 
                          borderRadius: '4px', 
                          color: '#fff', 
                          padding: '6px 10px',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                <Zap size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                <p>{t.SELECT_EFFECT_DETAILS}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
