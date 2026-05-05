import React from 'react';
import { 
  Variable, 
  Box, 
  Settings, 
  Code, 
  Zap, 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Layout, 
  Terminal,
  Calculator,
  Cpu
} from 'lucide-react';
import { Project, EventBlock } from '../../../model/project';
import { getTranslation } from '../../../i18n';
import { useEditorStore } from '../../../store/useEditorStore';

interface ExpressionBuilderProps {
  project: Project;
  eventSheetId: string;
  blockId: string;
  onInsert: (text: string) => void;
  onClose?: () => void;
}

type ViewMode = 'main' | 'object' | 'family' | 'math' | 'system' | 'functions' | 'globals' | 'locals';

export const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({ 
  project, 
  eventSheetId, 
  blockId, 
  onInsert,
  onClose 
}) => {
  const language = useEditorStore(s => s.editorState.language);
  const t = getTranslation(language);
  const [viewMode, setViewMode] = React.useState<ViewMode>('main');
  const [selectedObjectId, setSelectedObjectId] = React.useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const getInScopeVariables = () => {
    const sheet = project.eventSheets.find(es => es.id === eventSheetId);
    if (!sheet) return { globals: project.globalVariables, locals: [] };

    const globals = [...project.globalVariables];
    const locals: any[] = [];

    const collectInScope = (blocks: EventBlock[], targetId: string): boolean => {
      for (const b of blocks) {
        if (b.id === targetId) {
          b.children.forEach(child => {
            if (child.type === 'variable' && child.variable) locals.push(child.variable);
          });
          return true;
        }
        if (b.type === 'variable' && b.variable) locals.push(b.variable);
        if (collectInScope(b.children, targetId)) return true;
        if (b.type === 'variable' && b.variable) {
          const idx = locals.findIndex(v => v.id === b.variable?.id);
          if (idx !== -1) locals.splice(idx, 1);
        }
      }
      return false;
    };

    collectInScope(sheet.events, blockId);
    return { globals, locals };
  };

  const { globals, locals } = getInScopeVariables();

  const mathFuncs = [
    { name: 'abs(x)', insert: 'abs(' },
    { name: 'ceil(x)', insert: 'ceil(' },
    { name: 'floor(x)', insert: 'floor(' },
    { name: 'round(x)', insert: 'round(' },
    { name: 'sqrt(x)', insert: 'sqrt(' },
    { name: 'pow(x, y)', insert: 'pow(' },
    { name: 'min(a, b)', insert: 'min(' },
    { name: 'max(a, b)', insert: 'max(' },
    { name: 'clamp(x, min, max)', insert: 'clamp(' },
    { name: 'sin(x)', insert: 'sin(' },
    { name: 'cos(x)', insert: 'cos(' },
    { name: 'tan(x)', insert: 'tan(' },
    { name: 'random(max)', insert: 'random(' },
    { name: 'random(min, max)', insert: 'random(' },
    { name: 'pi', insert: 'pi' },
  ];

  const systemExpressions = [
    { name: 'dt', insert: 'dt' },
    { name: 'time', insert: 'time' },
    { name: 'fps', insert: 'fps' },
    { name: 'LayoutName', insert: 'LayoutName' },
  ];

  const renderItem = (icon: React.ReactNode, label: string, onClick: () => void, hasChevron = false) => (
    <div 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        padding: '10px 12px', 
        cursor: 'pointer', 
        borderRadius: '6px',
        transition: 'background 0.2s',
        fontSize: '13px',
        color: '#ccc'
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <div style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>{icon}</div>
      <div style={{ flex: 1, fontWeight: 500 }}>{label}</div>
      {hasChevron && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
    </div>
  );

  const renderMain = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {renderItem(<Box size={14} color="#2ecc71" />, t.OBJECT_TYPES, () => setViewMode('object'), true)}
      {project.families.length > 0 && renderItem(<Users size={14} color="#f1c40f" />, t.FAMILIES, () => setViewMode('family'), true)}
      {renderItem(<Variable size={14} color="#3498db" />, t.GLOBAL_VARIABLES, () => setViewMode('globals'), true)}
      {locals.length > 0 && renderItem(<Variable size={14} color="#e67e22" />, t.LOCAL_VARIABLES, () => setViewMode('locals'), true)}
      {renderItem(<Calculator size={14} color="#9b59b6" />, t.CAT_MATH, () => setViewMode('math'), true)}
      {renderItem(<Settings size={14} color="#95a5a6" />, t.SYSTEM, () => setViewMode('system'), true)}
      {renderItem(<Zap size={14} color="#9b59b6" />, t.CAT_FUNCTIONS, () => setViewMode('functions'), true)}
    </div>
  );

  const renderObjects = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {project.objectTypes.map(ot => renderItem(<Box size={14} color="#2ecc71" />, ot.name, () => {
        setSelectedObjectId(ot.id);
        setViewMode('object'); // Stays in object but shows properties
      }, true))}
    </div>
  );

  const renderObjectProperties = (otId: string) => {
    const ot = project.objectTypes.find(o => o.id === otId);
    if (!ot) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ padding: '8px 12px', fontSize: '11px', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>{t.PROPERTIES_LABEL}</div>
        {[{n: 'X', k: t.X}, {n: 'Y', k: t.Y}, {n: t.WIDTH, k: t.WIDTH}, {n: t.HEIGHT, k: t.HEIGHT}, {n: t.ANGLE, k: t.ANGLE}, {n: t.OPACITY, k: t.OPACITY}].map(p => renderItem(<Settings size={14} color="#3498db" />, p.k, () => onInsert(`${ot.name}.${p.n}`)))}
        {ot.instanceVariables.length > 0 && (
          <>
            <div style={{ padding: '16px 12px 8px', fontSize: '11px', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>{t.INSTANCE_VARIABLES}</div>
            {ot.instanceVariables.map(v => renderItem(<Terminal size={14} color="#e67e22" />, v.name, () => onInsert(`${ot.name}.${v.name}`)))}
          </>
        )}
      </div>
    );
  };

  const renderFamilies = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {project.families.map(f => renderItem(<Users size={14} color="#f1c40f" />, f.name, () => {
        setSelectedFamilyId(f.id);
        setViewMode('family');
      }, true))}
    </div>
  );

  const renderFamilyProperties = (familyId: string) => {
    const family = project.families.find(f => f.id === familyId);
    if (!family) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ padding: '8px 12px', fontSize: '11px', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>{t.COMMON_PROPERTIES}</div>
        {[{n: 'X', k: t.X}, {n: 'Y', k: t.Y}, {n: t.WIDTH, k: t.WIDTH}, {n: t.HEIGHT, k: t.HEIGHT}, {n: t.ANGLE, k: t.ANGLE}, {n: t.OPACITY, k: t.OPACITY}].map(p => renderItem(<Settings size={14} color="#3498db" />, p.k, () => onInsert(`${family.name}.${p.n}`)))}
        {family.instanceVariables.length > 0 && (
          <>
            <div style={{ padding: '16px 12px 8px', fontSize: '11px', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>{t.INSTANCE_VARIABLES}</div>
            {family.instanceVariables.map(v => renderItem(<Terminal size={14} color="#e67e22" />, v.name, () => onInsert(`${family.name}.${v.name}`)))}
          </>
        )}
      </div>
    );
  };

  const renderSearch = () => {
    // Basic flat search results
    const items: { name: string, insert: string, icon: any, category: string }[] = [];
    
    // Add variables
    globals.forEach(v => items.push({ name: v.name, insert: v.name, icon: <Variable size={14} color="#3498db" />, category: t.GLOBAL_VARIABLES }));
    locals.forEach(v => items.push({ name: v.name, insert: v.name, icon: <Variable size={14} color="#e67e22" />, category: t.LOCAL_VARIABLES }));
    
    // Add math
    mathFuncs.forEach(m => items.push({ name: m.name, insert: m.insert, icon: <Calculator size={14} color="#9b59b6" />, category: t.CAT_MATH }));
    
    // Add objects and their properties
    project.objectTypes.forEach(ot => {
      items.push({ name: ot.name, insert: ot.name, icon: <Box size={14} color="#2ecc71" />, category: t.OBJECT_TYPES });
      [{n: 'X', k: t.X}, {n: 'Y', k: t.Y}, {n: t.WIDTH, k: t.WIDTH}, {n: t.HEIGHT, k: t.HEIGHT}, {n: t.ANGLE, k: t.ANGLE}, {n: t.OPACITY, k: t.OPACITY}].forEach(p => items.push({ name: `${ot.name}.${p.n}`, insert: `${ot.name}.${p.n}`, icon: <Settings size={14} color="#3498db" />, category: `${ot.name} ${t.PROPERTIES_LABEL}` }));
      ot.instanceVariables.forEach(v => items.push({ name: `${ot.name}.${v.name}`, insert: `${ot.name}.${v.name}`, icon: <Terminal size={14} color="#e67e22" />, category: `${ot.name} ${t.VARIABLES_LABEL}` }));
    });

    const filtered = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 50);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {filtered.map((i, idx) => renderItem(i.icon, i.name, () => onInsert(i.insert)))}
        {filtered.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>{t.NO_MATCHES_FOUND}</div>}
      </div>
    );
  };

  const getHeader = () => {
    if (searchQuery) return t.SEARCH_RESULTS;
    switch (viewMode) {
      case 'object': return selectedObjectId ? project.objectTypes.find(o => o.id === selectedObjectId)?.name : t.OBJECT_TYPES;
      case 'family': return selectedFamilyId ? project.families.find(f => f.id === selectedFamilyId)?.name : t.FAMILIES;
      case 'math': return t.MATH_EXPRESSIONS;
      case 'system': return t.SYSTEM_EXPRESSIONS;
      case 'functions': return t.CAT_FUNCTIONS;
      case 'globals': return t.GLOBAL_VARIABLES;
      case 'locals': return t.LOCAL_VARIABLES;
      default: return t.EXPRESSION_BUILDER;
    }
  };

  const handleBack = () => {
    if (viewMode === 'object' && selectedObjectId) setSelectedObjectId(null);
    else if (viewMode === 'family' && selectedFamilyId) setSelectedFamilyId(null);
    else setViewMode('main');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#252526', overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
          <input 
            placeholder={t.SEARCH_PLACEHOLDER_EXPR} 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333', color: '#fff', fontSize: '11px', padding: '8px 12px 8px 32px', borderRadius: '4px', outline: 'none' }} 
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '24px' }}>
          {(viewMode !== 'main' || searchQuery) && (
            <button 
              onClick={() => { setSearchQuery(''); handleBack(); }}
              style={{ background: 'none', border: 'none', color: '#007acc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '2px 4px', borderRadius: '4px' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,122,204,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ChevronLeft size={14} /> {t.BACK}
            </button>
          )}
          <div style={{ fontSize: '10px', color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{getHeader()}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {searchQuery ? renderSearch() : (() => {
          if (viewMode === 'object' && selectedObjectId) return renderObjectProperties(selectedObjectId);
          if (viewMode === 'family' && selectedFamilyId) return renderFamilyProperties(selectedFamilyId);
          
          switch (viewMode) {
            case 'object': return renderObjects();
            case 'family': return renderFamilies();
            case 'math': return mathFuncs.map(m => renderItem(<Calculator size={14} color="#9b59b6" />, m.name, () => onInsert(m.insert)));
            case 'system': return systemExpressions.map(s => renderItem(<Settings size={14} color="#95a5a6" />, s.name, () => onInsert(s.insert)));
            case 'globals': return globals.map(v => renderItem(<Variable size={14} color="#3498db" />, v.name, () => onInsert(v.name)));
            case 'locals': return locals.map(v => renderItem(<Variable size={14} color="#e67e22" />, v.name, () => onInsert(v.name)));
            case 'functions': {
              const names: string[] = [];
              project.eventSheets.forEach(es => {
                const find = (blocks: EventBlock[]) => {
                  blocks.forEach(b => {
                    if (b.type === 'function' && b.functionName) names.push(b.functionName);
                    find(b.children);
                  });
                };
                find(es.events);
              });
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {renderItem(<Zap size={14} color="#9b59b6" />, 'Function.ReturnValue', () => onInsert('Function.ReturnValue'))}
                  {renderItem(<Zap size={14} color="#9b59b6" />, 'Function.Param', () => onInsert('Function.Param('))}
                  <div style={{ padding: '16px 12px 8px', fontSize: '11px', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>{t.CUSTOM_FUNCTIONS}</div>
                  {names.map(n => renderItem(<Zap size={14} color="#9b59b6" />, n, () => onInsert(`Function.Call("${n}")`)))}
                </div>
              );
            }
            default: return renderMain();
          }
        })()}
      </div>
      
      <div style={{ padding: '12px', fontSize: '11px', color: '#666', borderTop: '1px solid #333', fontStyle: 'italic', backgroundColor: '#1e1e1e' }}>
        {t.TIP_DOUBLE_CLICK_INSERT}
      </div>
    </div>
  );
};
