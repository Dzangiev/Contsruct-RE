import React from 'react';
import { Box, Settings, Zap } from 'lucide-react';
import { Project, EventBlock } from '../../../model/project';

export const HighlightText: React.FC<{ text: string, highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? <mark key={i} style={{ backgroundColor: '#f1c40f', color: '#000', borderRadius: '2px', padding: '0 2px' }}>{part}</mark> : part
      )}
    </span>
  );
};

export const LogicItemContent: React.FC<{ 
  item: any, 
  def?: any, 
  project: Project,
  type: 'condition' | 'action',
  searchTerm: string
}> = ({ item, def, project, type, searchTerm }) => {
  const ot = project.objectTypes.find(o => o.id === item.targetObjectTypeId);
  
  const renderFormattedLogic = () => {
    if (!def) return <HighlightText text={item.type} highlight={searchTerm} />;
    const p = item.params;
    
    switch (item.type) {
      case 'compareInstanceVariable':
      case 'compareVariable': {
        const op = p[1] === '==' ? '=' : p[1];
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#eee', letterSpacing: '0.2px' }}><HighlightText text={String(p[0])} highlight={searchTerm} /></span>
          <span style={{ color: '#888', fontSize: '11px', marginTop: '1px' }}>{op}</span>
          <span style={{ color: '#f1c40f', fontWeight: 600 }}>{p[2]}</span>
        </div>;
      }
      case 'setInstanceVariable':
      case 'setVariable':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#eee', letterSpacing: '0.2px' }}><HighlightText text={String(p[0])} highlight={searchTerm} /></span>
          <span style={{ color: '#888', fontSize: '11px', marginTop: '1px' }}>=</span>
          <span style={{ color: '#f1c40f', fontWeight: 600 }}>{p[1]}</span>
        </div>;
      case 'subtractInstanceVariable':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#eee', letterSpacing: '0.2px' }}><HighlightText text={String(p[0])} highlight={searchTerm} /></span>
          <span style={{ color: '#888', fontSize: '11px', marginTop: '1px' }}>-=</span>
          <span style={{ color: '#f1c40f', fontWeight: 600 }}>{p[1]}</span>
        </div>;
      case 'addInstanceVariable':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#eee', letterSpacing: '0.2px' }}><HighlightText text={String(p[0])} highlight={searchTerm} /></span>
          <span style={{ color: '#888', fontSize: '11px', marginTop: '1px' }}>+=</span>
          <span style={{ color: '#f1c40f', fontWeight: 600 }}>{p[1]}</span>
        </div>;
      case 'callFunction': {
        const funcName = p[0];
        let foundParams: { name: string, type: string, defaultValue: any }[] = [];
        project.eventSheets.forEach(es => {
          const findFunc = (blocks: EventBlock[]) => {
            blocks.forEach(b => {
              if (b.type === 'function' && b.functionName === funcName) foundParams = (b.functionParams || []) as any;
              findFunc(b.children);
            });
          };
          findFunc(es.events);
        });

        const formattedParams = foundParams.map((pInfo, idx) => {
          const val = p[idx + 1] ?? '0';
          return `${pInfo.name || `Param${idx}`}: ${val}`;
        }).join(', ');

        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ color: '#aaa' }}>Call</span>
          <span style={{ fontWeight: 700, color: '#9b59b6', letterSpacing: '0.2px' }}>{funcName}</span>
          {formattedParams && <span style={{ color: '#888', fontStyle: 'italic', fontSize: '11px' }}>({formattedParams})</span>}
        </div>;
      }
      case 'destroy':
        return <span style={{ color: '#ddd' }}>Destroy</span>;
      case 'onPointerPressedOnObject':
        return <span style={{ color: '#ddd' }}>On clicked</span>;
      default:
        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ color: '#ccc', fontWeight: 500 }}><HighlightText text={def.name} highlight={searchTerm} /></span>
            {p.length > 0 && (
              <span style={{ color: '#f1c40f', fontSize: '10px', fontWeight: 700 }}>
                ({p.map((val: any) => {
                  const targetOt = project.objectTypes.find(o => o.id === val);
                  if (targetOt) return targetOt.name;
                  const targetFamily = project.families.find(f => f.id === val);
                  if (targetFamily) return targetFamily.name;
                  return typeof val === 'string' && val.length > 15 ? val.substring(0, 12) + '...' : val;
                }).join(', ')})
              </span>
            )}
          </div>
        );
    }
  };

  return (
    <div className="logic-row-container" style={{ display: 'flex', alignItems: 'stretch', minHeight: '26px', fontSize: '13px', width: '100%', borderBottom: '1px solid #111', opacity: item.disabled ? 0.35 : 1 }}>
      <div style={{ 
        width: '120px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        padding: '4px 8px',
        borderRight: '1px solid #1a1a1a',
        backgroundColor: '#2d2d2d',
        flexShrink: 0
      }}>
        {ot ? (
          <>
            <Box size={12} color="#2ecc71" />
            <span style={{ color: '#2ecc71', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <HighlightText text={ot.name} highlight={searchTerm} />
            </span>
          </>
        ) : (
          <>
            <Settings size={12} color="#3498db" />
            <span style={{ color: '#3498db', fontWeight: 600 }}>System</span>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px', overflow: 'hidden', lineHeight: '1.4' }}>
        {type === 'condition' && item.inverted && <span style={{ color: '#e67e22', fontWeight: 800, marginRight: '2px' }}>!</span>}
        {type === 'condition' && def?.isTrigger && <Zap size={10} fill="#2ecc71" color="#2ecc71" style={{ marginRight: '4px' }} />}
        {renderFormattedLogic()}
      </div>
    </div>
  );
};
