import React from 'react';
import { Project, ObjectType } from '../../model/project';
import { LogicDefinition, CONDITIONS, ACTIONS } from '../../model/definitions';
import { Search, ChevronRight, Info, Settings, Box, Terminal, Code, Cpu, MousePointer2, Zap, Layout, Monitor } from 'lucide-react';

interface LogicBrowserProps {
  project: Project;
  mode: 'condition' | 'action';
  onSelect: (targetObjectTypeId: string | undefined, type: string, params: any[]) => void;
  onClose: () => void;
  initialObjectTypeId?: string;
  initialLogicTypeId?: string;
}

const ObjectCard: React.FC<{ name: string, icon: React.ReactNode, onClick: () => void, selected?: boolean }> = ({ name, icon, onClick, selected }) => (
  <div 
    onClick={onClick}
    className={`object-card ${selected ? 'selected' : ''}`}
  >
    {icon}
    <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', textAlign: 'center' }}>{name}</div>
  </div>
);

export const LogicBrowser: React.FC<LogicBrowserProps> = ({ project, mode, onSelect, onClose, initialObjectTypeId, initialLogicTypeId }) => {
  const initialOT = initialObjectTypeId ? project.objectTypes.find(ot => ot.id === initialObjectTypeId) : undefined;
  
  const [step, setStep] = React.useState<'object' | 'logic'>((initialObjectTypeId !== undefined || initialLogicTypeId !== undefined) ? 'logic' : 'object');
  const [selectedObjectType, setSelectedObjectType] = React.useState<ObjectType | undefined>(initialOT);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('All');

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    // Focus search when entering logic step or when modal opens directly in logic step
    if (step === 'logic') {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [step]);
  
  const items = mode === 'condition' ? CONDITIONS : ACTIONS;
  const [hoveredItem, setHoveredItem] = React.useState<LogicDefinition | null>(
    initialLogicTypeId ? (items.find(i => i.type === initialLogicTypeId) || null) : null
  );


  
  // 1. First find all items that match the target (System/Object) and search term
  const availableItems = items.filter(item => {
    const isSystemSelected = selectedObjectType === undefined;
    const matchesTarget = isSystemSelected ? 
      (item.target === 'system' || item.target === 'both') : 
      (item.target === 'object' || item.target === 'both');
    
    // Check requiredKind
    let matchesKind = true;
    if (!isSystemSelected && item.requiredKind) {
      const kinds = Array.isArray(item.requiredKind) ? item.requiredKind : [item.requiredKind];
      matchesKind = kinds.includes(selectedObjectType.kind);
    } else if (isSystemSelected && item.requiredKind) {
      // System items with requiredKind are usually invalid unless target is system, 
      // but let's be safe: if it's a system item, it shouldn't have requiredKind for an object.
      matchesKind = false;
    }
    
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
                          
    return matchesTarget && matchesKind && matchesSearch;
  });

  // 2. Generate categories list from ALL available items (not just the ones in the current category)
  const categories = ['All', ...Array.from(new Set(availableItems.map(i => i.category)))];

  // 3. Finally, filter for display based on the selected category
  const filteredItems = availableItems.filter(item => 
    selectedCategoryId === 'All' || item.category === selectedCategoryId
  );

  const handleObjectSelect = (ot: ObjectType | undefined) => {
    setSelectedObjectType(ot);
    setStep('logic');
    setSearchTerm('');
    setSelectedCategoryId('All');
  };

  const handleLogicSelect = (def: LogicDefinition) => {
    const defaultParams = def.params.map(p => p.defaultValue);
    onSelect(selectedObjectType?.id, def.type, defaultParams);
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <style>{`
        .object-card {
          background-color: #2d2d2d;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .object-card:hover {
          background-color: #37373d;
          border-color: #444;
          transform: translateY(-2px);
        }
        .object-card.selected {
          background-color: #004b7e !important;
          border-color: #007acc !important;
        }
        .object-card.selected:hover {
          background-color: #005d9e !important;
        }
        .logic-browser-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .logic-browser-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }
        .logic-browser-scroll::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 4px;
          border: 2px solid #1e1e1e;
        }
        .logic-browser-scroll::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#007acc', padding: '6px', borderRadius: '4px' }}>
              {mode === 'condition' ? <Zap size={16} color="#fff" /> : <Settings size={16} color="#fff" />}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                {step === 'object' ? `Add ${mode === 'condition' ? 'Condition' : 'Action'}` : `${selectedObjectType?.name || 'System'}`}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {step === 'object' ? 'Select target object first' : `Select ${mode === 'condition' ? 'a condition' : 'an action'}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        {/* Search Bar */}
        <div style={searchContainerStyle}>
          <Search size={14} style={{ position: 'absolute', left: '24px', color: '#666' }} />
          <input 
            ref={searchInputRef}
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={step === 'object' ? "Search objects..." : `Search ${mode}s...`}
            style={inputStyle}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {step === 'object' ? (
            <div className="logic-browser-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
              <ObjectCard 
                name="System" 
                icon={<Monitor size={24} color="#3498db" />} 
                onClick={() => handleObjectSelect(undefined)}
                selected={!selectedObjectType}
              />
              {project.objectTypes.filter(ot => ot.name.toLowerCase().includes(searchTerm.toLowerCase())).map(ot => (
                <ObjectCard 
                  key={ot.id}
                  name={ot.name} 
                  icon={<Box size={24} color="#2ecc71" />} 
                  onClick={() => handleObjectSelect(ot)}
                  selected={selectedObjectType?.id === ot.id}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Sidebar Categories */}
              <div className="logic-browser-scroll" style={{ ...sidebarStyle, overflowY: 'auto' }}>
                {categories.map(cat => (
                  <div 
                    key={cat} 
                    onClick={() => setSelectedCategoryId(cat)}
                    style={{
                      ...categoryItemStyle,
                      backgroundColor: selectedCategoryId === cat ? '#37373d' : 'transparent',
                      color: selectedCategoryId === cat ? '#fff' : '#aaa'
                    }}
                  >
                    {cat}
                  </div>
                ))}
              </div>

              {/* Main List Grid */}
              <div className="logic-browser-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px', backgroundColor: '#1e1e1e' }}>
                <div 
                  style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2px' }}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {filteredItems.map(def => (
                    <div 
                      key={def.type} 
                      style={{
                        ...logicItemStyle,
                        backgroundColor: hoveredItem?.type === def.type 
                          ? (initialLogicTypeId === def.type ? '#005d9e' : '#37373d') 
                          : (initialLogicTypeId === def.type ? '#004b7e' : 'transparent'),
                        borderLeft: initialLogicTypeId === def.type ? '3px solid #007acc' : '3px solid transparent'
                      }} 
                      onClick={() => handleLogicSelect(def)}
                      onMouseEnter={() => setHoveredItem(def)}
                    >
                      <ChevronRight size={14} style={{ opacity: hoveredItem?.type === def.type ? 1 : 0.2 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{def.name}</span>
                        <span style={{ fontSize: '11px', color: '#666' }}>{def.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredItems.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                    No matching {mode}s found.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Detail Panel */}
        <div style={footerStyle}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hoveredItem ? (
              <>
                <Info size={14} color="#007acc" />
                <span style={{ fontSize: '12px', color: '#aaa' }}>{hoveredItem.description || hoveredItem.name}</span>
              </>
            ) : (
              <span style={{ fontSize: '11px', color: '#555' }}>Hover an item for description</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step === 'logic' && (
              <button onClick={() => setStep('object')} style={secondaryButtonStyle}>Back to Objects</button>
            )}
            <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};



const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3000,
  backdropFilter: 'blur(4px)'
};

const modalStyle: React.CSSProperties = {
  width: '650px',
  height: '550px',
  backgroundColor: '#252526',
  borderRadius: '12px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
  border: '1px solid #333',
  color: '#d4d4d4',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  backgroundColor: '#323233',
  borderBottom: '1px solid #111',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  fontSize: '24px',
  cursor: 'pointer',
  padding: '0 8px'
};

const searchContainerStyle: React.CSSProperties = {
  padding: '12px 16px',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#2d2d2d',
  borderBottom: '1px solid #111'
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#1e1e1e',
  border: '1px solid #444',
  borderRadius: '6px',
  padding: '8px 12px 8px 34px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 0.2s'
};

const sidebarStyle: React.CSSProperties = {
  width: '160px',
  backgroundColor: '#252526',
  borderRight: '1px solid #111',
  overflowY: 'auto',
  padding: '8px'
};

const categoryItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '12px',
  cursor: 'pointer',
  borderRadius: '4px',
  marginBottom: '2px',
  transition: 'all 0.1s ease'
};

const logicItemStyle: React.CSSProperties = {
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  cursor: 'pointer',
  borderRadius: '4px',
  transition: 'background-color 0.1s',
  userSelect: 'none',
  borderBottom: '1px solid #252526'
};

const footerStyle: React.CSSProperties = {
  padding: '12px 20px',
  backgroundColor: '#1e1e1e',
  borderTop: '1px solid #333',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  height: '50px'
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#37373d',
  color: '#ccc',
  border: 'none',
  padding: '6px 16px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  transition: 'background-color 0.2s'
};
