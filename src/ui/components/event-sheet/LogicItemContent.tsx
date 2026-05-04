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
  searchTerm: string,
  isSelected?: boolean
}> = ({ item, def, project, type, searchTerm, isSelected }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const ot = project.objectTypes.find(o => o.id === item.targetObjectTypeId);

  const renderFormattedLogic = () => {
    if (!def) return <HighlightText text={item.type} highlight={searchTerm} />;
    const p = item.params;
    const txtColor = isSelected ? '#121212' : '#e0e0e0';
    const subColor = isSelected ? 'rgba(0,0,0,0.6)' : '#999';
    const paramColor = isSelected ? '#004b7e' : '#3498db';
    
    const formatParam = (val: any) => {
      const targetOt = project.objectTypes.find(o => o.id === val);
      if (targetOt) return <span style={{ color: isSelected ? '#121212' : '#2ecc71', fontWeight: 700 }}>{targetOt.name}</span>;
      const targetFamily = project.families.find(f => f.id === val);
      if (targetFamily) return <span style={{ color: isSelected ? '#121212' : '#f1c40f', fontWeight: 700 }}>{targetFamily.name}</span>;
      
      const isString = typeof val === 'string' && val.startsWith('"') && val.endsWith('"');
      const displayVal = typeof val === 'string' && val.length > 25 ? val.substring(0, 22) + '...' : val;
      
      return <span style={{ color: isSelected ? '#121212' : (isString ? '#e67e22' : paramColor), fontWeight: 700 }}>{displayVal}</span>;
    };

    switch (item.type) {
      case 'always':
        return <span style={{ color: txtColor, fontWeight: 500 }}>Every tick</span>;
      case 'onStartOfLayout':
        return <span style={{ color: txtColor, fontWeight: 500 }}>On start of layout</span>;
      case 'else':
        return <span style={{ color: txtColor, fontWeight: 700, fontStyle: 'italic' }}>Else</span>;
      
      case 'compareInstanceVariable':
      case 'compareVariable': {
        const op = p[1] === '==' ? 'is equal to' : 
                   p[1] === '!=' ? 'is not equal to' :
                   p[1] === '<' ? 'is less than' :
                   p[1] === '<=' ? 'is less or equal' :
                   p[1] === '>' ? 'is greater than' :
                   p[1] === '>=' ? 'is greater or equal' : p[1];
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: txtColor }}>Variable</span>
          {formatParam(p[0])}
          <span style={{ color: subColor }}>{op}</span>
          {formatParam(p[2])}
        </div>;
      }
      case 'setInstanceVariable':
      case 'setVariable':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: subColor }}>Set</span>
          {formatParam(p[0])}
          <span style={{ color: subColor }}>to</span>
          {formatParam(p[1])}
        </div>;
      case 'addInstanceVariable':
      case 'addVariable':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: subColor }}>Add</span>
          {formatParam(p[1])}
          <span style={{ color: subColor }}>to</span>
          {formatParam(p[0])}
        </div>;
      case 'subtractInstanceVariable':
      case 'subtractVariable':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: subColor }}>Subtract</span>
          {formatParam(p[1])}
          <span style={{ color: subColor }}>from</span>
          {formatParam(p[0])}
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

        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: subColor }}>Call</span>
          <span style={{ fontWeight: 700, color: paramColor }}>{funcName}</span>
          {foundParams.length > 0 && (
            <span style={{ color: subColor, fontSize: '11px' }}>
              ({foundParams.map((pInfo, idx) => (
                <React.Fragment key={idx}>
                  <span style={{ color: '#777' }}>{pInfo.name}: </span>
                  {formatParam(p[idx + 1] ?? '0')}
                  {idx < foundParams.length - 1 ? ', ' : ''}
                </React.Fragment>
              ))})
            </span>
          )}
        </div>;
      }
      case 'destroy':
        return <span style={{ color: txtColor, fontWeight: 600 }}>Destroy</span>;
      case 'isVisible':
        return <span style={{ color: txtColor }}>Is visible</span>;
      case 'setVisible':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ color: subColor }}>Set</span>
          <span style={{ color: txtColor }}>visible</span>
          <span style={{ color: subColor }}>to</span>
          {formatParam(p[0])}
        </div>;
      case 'setPosition':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ color: subColor }}>Set position to</span>
          <span style={{ color: subColor }}>(</span>
          {formatParam(p[0])}
          <span style={{ color: subColor }}>,</span>
          {formatParam(p[1])}
          <span style={{ color: subColor }}>)</span>
        </div>;
      case 'createInstance':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: subColor }}>Create</span>
          {formatParam(p[0])}
          <span style={{ color: subColor }}>at (</span>
          {formatParam(p[1])}
          <span style={{ color: subColor }}>,</span>
          {formatParam(p[2])}
          <span style={{ color: subColor }}>) on layer</span>
          {formatParam(p[3])}
        </div>;
      case 'onPointerPressedOnObject':
        return <span style={{ color: txtColor }}>On clicked</span>;
      default:
        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ color: txtColor, fontWeight: 500 }}><HighlightText text={def.name} highlight={searchTerm} /></span>
            {p.length > 0 && (
              <span style={{ color: subColor, fontSize: '11px' }}>
                ({p.map((val: any, idx: number) => (
                  <React.Fragment key={idx}>
                    {formatParam(val)}
                    {idx < p.length - 1 ? ', ' : ''}
                  </React.Fragment>
                ))})
              </span>
            )}
          </div>
        );
    }
  };


  const getBgColor = () => {
    if (isSelected) return '#ccc';
    if (isHovered) return type === 'condition' ? '#3e3e3e' : '#2e2e2e';
    return type === 'condition' ? '#353535' : 'transparent';
  };

  const getTextColor = () => {
    if (isSelected) return '#121212';
    return '#bbb';
  };

  return (
    <div
      className="logic-row-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        minHeight: '26px',
        fontSize: '12px',
        width: '100%',
        backgroundColor: getBgColor(),
        color: getTextColor(),
        borderBottom: 'none',
        padding: '1px 0',
        opacity: item.disabled ? 0.35 : 1,
        transition: 'background-color 0.1s, color 0.1s'
      }}
    >
      <div style={{
        width: '120px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRight: type === 'condition' ? '2px solid #2b2b2b' : '2px solid #333',
        backgroundColor: 'transparent',
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
        {type === 'condition' && item.inverted && <span style={{ color: isSelected ? '#121212' : '#bbb', fontWeight: 800, marginRight: '2px' }}>!</span>}
        {type === 'condition' && def?.isTrigger && <Zap size={10} fill={isSelected ? '#121212' : '#2ecc71'} color={isSelected ? '#121212' : '#2ecc71'} style={{ marginRight: '4px' }} />}
        {renderFormattedLogic()}
      </div>
    </div>
  );
};
