import React from 'react';
import { ChevronUp, Settings, Search, Terminal, Box, Users, Layout, Code, Variable, Zap, AlertCircle } from 'lucide-react';
import { Project, EventBlock } from '../../../model/project';
import { LogicDefinition } from '../../../model/definitions';

import { ExpressionParser } from '../../../model/expressionParser';
import { ExpressionBuilder } from './ExpressionBuilder';

interface ParamEditorProps {
  project: Project;
  mode: 'condition' | 'action';
  eventSheetId: string;
  blockId: string;
  def: LogicDefinition;
  initialParams: any[];
  targetObjectTypeId?: string;
  onSave: (p: any[]) => void;
  onBack: () => void;
  onCancel: () => void;
}

/**
 * Finds all variables in scope for a specific block.
 */
function getInScopeVariables(project: Project, eventSheetId: string, blockId: string) {
  const sheet = project.eventSheets.find(es => es.id === eventSheetId);
  if (!sheet) return { globals: project.globalVariables, locals: [] };

  const globals = [...project.globalVariables];
  const locals: any[] = [];

  project.eventSheets.forEach(es => {
    es.events.forEach(b => {
      if (b.type === 'variable' && b.variable) {
        if (!globals.some(g => g.id === b.variable?.id)) {
          globals.push(b.variable);
        }
      }
    });
  });

  const collectInScope = (blocks: EventBlock[], targetId: string): boolean => {
    for (const b of blocks) {
      if (b.id === targetId) {
        b.children.forEach(child => {
          if (child.type === 'variable' && child.variable) {
            locals.push(child.variable);
          }
        });
        return true;
      }
      if (b.type === 'variable' && b.variable) {
        locals.push(b.variable);
      }
      if (collectInScope(b.children, targetId)) return true;
      if (b.type === 'variable' && b.variable) {
        const idx = locals.findIndex(v => v.id === b.variable?.id);
        if (idx !== -1) locals.splice(idx, 1);
      }
      const clearChildren = (list: EventBlock[]) => {
        list.forEach(child => {
          if (child.type === 'variable' && child.variable) {
            const idx = locals.findIndex(v => v.id === child.variable?.id);
            if (idx !== -1) locals.splice(idx, 1);
          }
          clearChildren(child.children);
        });
      };
      clearChildren(b.children);
    }
    return false;
  };

  collectInScope(sheet.events, blockId);
  return { globals, locals };
}

export const ParamEditor: React.FC<ParamEditorProps> = ({ project, mode, eventSheetId, blockId, def, initialParams, targetObjectTypeId, onSave, onBack, onCancel }) => {
  const [params, setParams] = React.useState([...initialParams]);

  React.useEffect(() => {
    const newParams = [...params];
    let changed = false;
    def.params.forEach((pDef: any, i: number) => {
      if (pDef.type === 'globalVariable' && (!newParams[i] || !project.globalVariables.find(v => v.name === newParams[i]))) {
        if (project.globalVariables.length > 0) {
          newParams[i] = project.globalVariables[0].name;
          changed = true;
        }
      } else if (pDef.type === 'instanceVariable' && (!newParams[i] || !project.objectTypes.find(o => o.id === targetObjectTypeId)?.instanceVariables.find(v => v.name === newParams[i]))) {
        const ot = project.objectTypes.find(o => o.id === targetObjectTypeId);
        if (ot && ot.instanceVariables.length > 0) {
          newParams[i] = ot.instanceVariables[0].name;
          changed = true;
        }
      } else if (pDef.type === 'objectType' && !newParams[i]) {
        if (project.objectTypes.length > 0) {
          newParams[i] = project.objectTypes[0].id;
          changed = true;
        }
      } else if ((pDef.type as string) === 'layer' && !newParams[i]) {
        const layout = project.layouts.find(l => l.eventSheetId === eventSheetId) || project.layouts[0];
        if (layout && layout.layers.length > 0) {
          newParams[i] = layout.layers[0].id;
          changed = true;
        }
      }
    });
    if (changed) setParams(newParams);
  }, [def, project, targetObjectTypeId, eventSheetId]);

  const [activeParamIndex, setActiveParamIndex] = React.useState(0);
  const [filter, setFilter] = React.useState('');
  const [suggestionState, setSuggestionState] = React.useState<{ isOpen: boolean, items: any[], activeIndex: number, rect: DOMRect | null, cursorPosition: number } | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<Record<number, { syntax: string, warnings: string[] }>>({});

  const { globals: inScopeGlobals, locals: inScopeLocals } = getInScopeVariables(project, eventSheetId, blockId);

  const assistantItems = [
    ...[
      ...inScopeGlobals.map((v: any) => ({ name: v.name, type: 'variable', category: 'Global Variables', icon: <Variable size={12} color="#3498db" /> })),
      ...inScopeLocals.map((v: any) => ({ name: v.name, type: 'variable', category: 'Local Variables', icon: <Variable size={12} color="#e67e22" /> }))
    ].filter((v, i, a) => a.findIndex(t => t.name === v.name) === i), 
    ...project.objectTypes.map((ot: any) => ({ name: ot.name, type: 'object', category: 'Objects', icon: <Box size={12} color="#2ecc71" /> })), 
    ...project.objectTypes.flatMap((ot: any) => ot.instanceVariables.map((v: any) => ({ name: `${ot.name}.${v.name}`, type: 'instance-variable', category: 'Instance Variables', icon: <Terminal size={12} color="#e67e22" /> }))), 
    ...project.families.map((f: any) => ({ name: f.name, type: 'family', category: 'Families', icon: <Users size={12} color="#f1c40f" /> })),
    ...project.families.flatMap((f: any) => f.instanceVariables.map((v: any) => ({ name: `${f.name}.${v.name}`, type: 'instance-variable', category: 'Family Variables', icon: <Terminal size={12} color="#f1c40f" /> }))),
    ...project.layouts.map((l: any) => ({ name: `LayoutName("${l.name}")`, type: 'layout', category: 'Layouts', icon: <Layout size={12} color="#3498db" /> })),
    { name: 'dt', type: 'system', category: 'System', icon: <Settings size={12} color="#95a5a6" /> }, 
    { name: 'fps', type: 'system', category: 'System', icon: <Settings size={12} color="#95a5a6" /> },
    { name: 'time', type: 'system', category: 'System', icon: <Settings size={12} color="#95a5a6" /> },
    { name: 'random(max)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'random(min, max)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'abs(x)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'floor(x)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'ceil(x)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'round(x)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'sqrt(x)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'pow(x, y)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'sin(x)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'cos(x)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'tan(x)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'min(a, b)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'max(a, b)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'clamp(x, min, max)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'lerp(a, b, t)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'unlerp(a, b, x)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'distance(x1, y1, x2, y2)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'angle(x1, y1, x2, y2)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'pi', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'Function.ReturnValue', type: 'function', category: 'Functions', icon: <Zap size={12} color="#9b59b6" /> },
    { name: 'Function.Param(0)', type: 'function', category: 'Functions', icon: <Zap size={12} color="#9b59b6" /> },
    ...(() => {
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
      return names.map(n => ({ name: `Function.Call("${n}")`, type: 'function', category: 'Functions', icon: <Zap size={12} color="#9b59b6" /> }));
    })()
  ].filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) || i.category.toLowerCase().includes(filter.toLowerCase()));

  const categories = Array.from(new Set(assistantItems.map(i => i.category)));
  
  const performValidation = (val: string) => {
    const { globals, locals } = getInScopeVariables(project, eventSheetId, blockId);
    const context = {
      variables: Object.fromEntries(globals.map(v => [v.name, v.initialValue])),
      locals: Object.fromEntries(locals.map(v => [v.name, v.initialValue])),
      objects: Object.fromEntries(project.objectTypes.map(ot => [ot.name, ot])),
      system: { dt: 0.016, time: 0, fps: 60, pointerx: 0, pointery: 0, functionparams: [], returnvalue: 0 }
    };

    const pDef = def.params[activeParamIndex];
    const expectedType = (pDef as any)?.type || 'any';
    
    import('../../../model/expressionParser').then(m => {
      const result = m.validateExpression(val, expectedType, context);
      setValidationErrors(prev => ({
        ...prev,
        [activeParamIndex]: {
          syntax: result.syntaxError || '',
          warnings: result.typeWarnings || []
        }
      }));
    });
  };

  const updateSuggestions = (val: string, cursorPosition: number, rect: DOMRect) => {
    performValidation(val);

    // Context-aware suggestions based on cursor
    const beforeCursor = val.slice(0, cursorPosition);
    
    // Check if we are typing a property (Object.Prop)
    const memberMatch = beforeCursor.match(/([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z0-9_]*)$/);
    if (memberMatch) {
      const [_, objName, search] = memberMatch;
      const ot = project.objectTypes.find(o => o.name.toLowerCase() === objName!.toLowerCase());
      if (ot) {
        const props = [
          { name: 'X', type: 'property', category: 'Properties', icon: <Settings size={12} color="#3498db" /> },
          { name: 'Y', type: 'property', category: 'Properties', icon: <Settings size={12} color="#3498db" /> },
          { name: 'Width', type: 'property', category: 'Properties', icon: <Settings size={12} color="#3498db" /> },
          { name: 'Height', type: 'property', category: 'Properties', icon: <Settings size={12} color="#3498db" /> },
          { name: 'Angle', type: 'property', category: 'Properties', icon: <Settings size={12} color="#3498db" /> },
          { name: 'Opacity', type: 'property', category: 'Properties', icon: <Settings size={12} color="#3498db" /> },
          ...ot.instanceVariables.map(v => ({ name: v.name, type: 'variable', category: 'Instance Variables', icon: <Terminal size={12} color="#e67e22" /> }))
        ];
        const filtered = props.filter(p => p.name.toLowerCase().startsWith(search!.toLowerCase()));
        if (filtered.length > 0) {
          setSuggestionState({ isOpen: true, items: filtered.map(p => ({ ...p, insertText: p.name })), activeIndex: 0, rect, cursorPosition });
          return;
        }
      }
    }

    const parts = beforeCursor.split(/[\s+\-*/(),]/);
    const lastPart = parts.pop() || '';
    if (lastPart.length < 1) { setSuggestionState(null); return; }
    
    const filtered = assistantItems.filter(i => i.name.toLowerCase().includes(lastPart.toLowerCase())).slice(0, 10);
    if (filtered.length > 0) {
      setSuggestionState({ isOpen: true, items: filtered.map(i => ({ ...i, insertText: i.name })), activeIndex: 0, rect, cursorPosition });
    } else {
      setSuggestionState(null);
    }
  };

  const insertAtCaret = (text: string, stateOverride?: any) => {
    const state = stateOverride || suggestionState;
    if (!state) return;

    const n = [...params];
    const current = String(n[activeParamIndex] || '');
    const pos = state.cursorPosition;
    const before = current.slice(0, pos);
    const after = current.slice(pos);
    
    // If it's a property insert (after a dot)
    const memberMatch = before.match(/([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z0-9_]*)$/);
    if (memberMatch) {
      const [fullMatch, objName] = memberMatch;
      const base = before.slice(0, before.length - fullMatch!.length);
      n[activeParamIndex] = base + objName + '.' + text + after;
    } else {
      const parts = before.split(/([\s+\-*/(),])/);
      if (parts.length > 0) {
        parts[parts.length - 1] = text;
        n[activeParamIndex] = parts.join('') + after;
      } else {
        n[activeParamIndex] = text + after;
      }
    }
    const newVal = n[activeParamIndex];
    setParams(n);
    setSuggestionState(null);
    performValidation(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestionState?.isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionState(prev => prev ? { ...prev, activeIndex: (prev.activeIndex + 1) % prev.items.length } : null);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionState(prev => prev ? { ...prev, activeIndex: (prev.activeIndex - 1 + prev.items.length) % prev.items.length } : null);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const activeItem = suggestionState.items[suggestionState.activeIndex];
        if (activeItem) insertAtCaret(activeItem.insertText || activeItem.name);
      } else if (e.key === 'Escape') {
        setSuggestionState(null);
      }
    } else if (e.key === 'Enter' && e.ctrlKey) {
      onSave(params);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const [mouseDownOnOverlay, setMouseDownOnOverlay] = React.useState(false);
  const handleOverlayMouseDown = (e: React.MouseEvent) => { if (e.target === e.currentTarget) setMouseDownOnOverlay(true); else setMouseDownOnOverlay(false); };
  const handleOverlayMouseUp = (e: React.MouseEvent) => { if (e.target === e.currentTarget && mouseDownOnOverlay) onCancel(); setMouseDownOnOverlay(false); };

  const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 };
  const modalStyle: React.CSSProperties = { backgroundColor: '#2d2d2d', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #444', color: '#d4d4d4', overflow: 'hidden' };
  const modalHeaderStyle: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #444' };
  const modalFooterStyle: React.CSSProperties = { padding: '12px 16px', borderTop: '1px solid #444', display: 'flex', justifyContent: 'flex-end', gap: '10px' };
  const paramInputStyle: React.CSSProperties = { backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '6px 10px', color: '#fff', fontSize: '13px', outline: 'none' };
  const saveButtonStyle: React.CSSProperties = { backgroundColor: '#007acc', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
  const cancelButtonStyle: React.CSSProperties = { backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
  const iconButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' };

  return (
    <div style={overlayStyle} onMouseDown={handleOverlayMouseDown} onMouseUp={handleOverlayMouseUp}>
      <div style={{ ...modalStyle, width: '900px', height: '650px', flexDirection: 'row' }} onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', borderRight: '1px solid #333' }}>
          <div style={{ ...modalHeaderStyle, backgroundColor: '#252526', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
            <button onClick={onBack} style={{ ...iconButtonStyle, width: '32px', height: '32px', border: '1px solid #444', borderRadius: '6px' }} title="Back to logic selection">
              <ChevronUp size={18} style={{ transform: 'rotate(-90deg)' }} />
            </button>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#007acc', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={18} color="#fff" /></div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Parameters: {def.name}</h3>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{def.description}</div>
            </div>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto' }}>
            {def.params.map((pDef: any, i: number) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{pDef.name}</label>
                  <span style={{ fontSize: '9px', color: '#444', fontWeight: 'bold' }}>{pDef.type.toUpperCase()}</span>
                </div>
                {pDef.type === 'enum' ? (
                  <select value={params[i]} onFocus={() => setActiveParamIndex(i)} onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }} style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}>
                    {pDef.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : pDef.type === 'functionName' ? (
                  <select value={params[i]} onFocus={() => setActiveParamIndex(i)} onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }} style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}>
                    <option value="">Select a function...</option>
                    {project.eventSheets.flatMap(es => {
                      const findFuncs = (blocks: EventBlock[]): string[] => {
                        let names: string[] = [];
                        blocks.forEach(b => {
                          if (b.type === 'function' && b.functionName) names.push(b.functionName);
                          names = [...names, ...findFuncs(b.children)];
                        });
                        return names;
                      };
                      return findFuncs(es.events);
                    }).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                ) : pDef.type === 'objectType' ? (
                  <select value={params[i]} onFocus={() => setActiveParamIndex(i)} onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }} style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}>
                    <optgroup label="Object Types">
                      {project.objectTypes.map(ot => <option key={ot.id} value={ot.id}>{ot.name}</option>)}
                    </optgroup>
                    {project.families && project.families.length > 0 && (
                      <optgroup label="Families">
                        {project.families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                ) : (pDef.type as any) === 'boolean' ? (
                  <select value={params[i] === true || params[i] === 'true' ? 'true' : 'false'} onFocus={() => setActiveParamIndex(i)} onChange={(e) => { const n = [...params]; n[i] = e.target.value === 'true'; setParams(n); }} style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (pDef.type as any) === 'color' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="color" value={String(params[i] || '#ffffff').replace(/"/g, '')} onFocus={() => setActiveParamIndex(i)} onChange={(e) => { const n = [...params]; n[i] = `"${e.target.value}"`; setParams(n); }} style={{ width: '40px', height: '32px', padding: 0, border: '1px solid #333', background: 'none', cursor: 'pointer' }} />
                    <input type="text" value={params[i]} onFocus={() => setActiveParamIndex(i)} onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }} style={{ ...paramInputStyle, flex: 1, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }} />
                  </div>
                ) : (pDef.type as any) === 'layer' ? (
                  <select value={params[i]} onFocus={() => setActiveParamIndex(i)} onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }} style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}>
                    {(() => {
                      const layout = project.layouts.find(l => l.eventSheetId === eventSheetId) || project.layouts[0];
                      return layout?.layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>);
                    })()}
                  </select>
                ) : (pDef.type as any) === 'number' || (pDef.type as any) === 'string' ? (
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      onFocus={(e) => { setActiveParamIndex(i); updateSuggestions(e.target.value, e.target.selectionStart || 0, e.target.getBoundingClientRect()); }} 
                      value={params[i]} 
                      onChange={(e) => { 
                        const n = [...params]; n[i] = e.target.value; 
                        setParams(n); 
                        updateSuggestions(e.target.value, e.target.selectionStart || 0, e.target.getBoundingClientRect()); 
                      }} 
                      onKeyDown={handleKeyDown}
                      onBlur={() => setTimeout(() => setSuggestionState(null), 200)} 
                      style={{ 
                        ...paramInputStyle, 
                        width: '100%', 
                        border: validationErrors[i]?.syntax ? '1px solid #e74c3c' : (validationErrors[i]?.warnings?.length > 0 ? '1px solid #f1c40f' : (activeParamIndex === i ? '1px solid #007acc' : '1px solid #333')),
                        borderLeft: activeParamIndex === i ? '4px solid #007acc' : '1px solid #333'
                      }} 
                    />
                    {validationErrors[i]?.syntax && (
                      <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#e74c3c', fontSize: '10px', pointerEvents: 'none' }}>
                        {validationErrors[i].syntax}
                      </div>
                    )}
                    {validationErrors[i]?.warnings?.length > 0 && !validationErrors[i]?.syntax && (
                      <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#f1c40f', fontSize: '10px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={10} /> {validationErrors[i].warnings[0]}
                      </div>
                    )}
                    {suggestionState?.isOpen && activeParamIndex === i && (
                      <div style={{ position: 'fixed', top: (suggestionState.rect?.bottom || 0) + 4, left: suggestionState.rect?.left || 0, width: suggestionState.rect?.width || 200, backgroundColor: '#252526', border: '1px solid #444', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 3000, maxHeight: '200px', overflowY: 'auto' }}>
                        {suggestionState.items.map((item, idx) => (
                          <div key={idx} onClick={() => { insertAtCaret(item.insertText || item.name); setSuggestionState(null); }} style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', backgroundColor: suggestionState.activeIndex === idx ? '#007acc' : 'transparent', color: suggestionState.activeIndex === idx ? '#fff' : '#ccc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ opacity: 0.7 }}>{item.icon}</div>
                            <span>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <input type="text" onFocus={() => setActiveParamIndex(i)} value={params[i]} onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }} style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333', borderLeft: activeParamIndex === i ? '4px solid #007acc' : '1px solid #333' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ ...modalFooterStyle, backgroundColor: '#252526', borderTop: '1px solid #333', padding: '16px 24px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>Tip: Ctrl+Enter to Save, Esc to Cancel</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onSave(params)} style={{ ...saveButtonStyle, padding: '8px 24px' }}>Done</button>
              <button onClick={onCancel} style={{ ...cancelButtonStyle, padding: '8px 24px' }}>Cancel</button>
            </div>
          </div>
        </div>
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', backgroundColor: '#252526' }}>
          <ExpressionBuilder 
            project={project}
            eventSheetId={eventSheetId}
            blockId={blockId}
            onInsert={(text) => insertAtCaret(text)}
          />
        </div>
      </div>
    </div>
  );
};
