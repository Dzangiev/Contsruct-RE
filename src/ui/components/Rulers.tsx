import React from 'react';

interface RulersProps {
  zoom: number;
  panX: number;
  panY: number;
  layoutWidth: number;
  layoutHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  mouseX: number;
  mouseY: number;
  containerWidth: number;
  containerHeight: number;
}

export const Rulers: React.FC<RulersProps> = ({ 
  zoom, panX, panY, layoutWidth, layoutHeight, viewportWidth, viewportHeight, mouseX, mouseY, containerWidth, containerHeight 
}) => {
  const rulerSize = 22;
  const tickColor = '#333';
  const majorTickColor = '#555';
  const textColor = '#888';
  const bgColor = '#1a1a1a';
  const highlightColor = 'rgba(0, 153, 255, 0.15)';
  const mouseLineColor = '#0099ff';
  const viewportLineColor = 'rgba(255, 255, 255, 0.3)';

  // Mouse indicator position in ruler space
  const mouseRulerX = mouseX * zoom + panX;
  const mouseRulerY = mouseY * zoom + panY;

  // Horizontal ruler ticks
  const hTicks = [];
  const startX = Math.floor(-panX / zoom / 100) * 100;
  const endX = Math.ceil((containerWidth - panX) / zoom / 100) * 100;
  
  for (let x = startX - 200; x < endX + 200; x += 10) {
    const isMajor = x % 100 === 0;
    const isMedium = x % 50 === 0;
    const pos = x * zoom + panX;
    
    if (pos >= 0 && pos <= containerWidth) {
      hTicks.push(
        <g key={`h-${x}`}>
          <line 
            x1={pos} y1={isMajor ? 0 : isMedium ? 12 : 16} 
            x2={pos} y2={rulerSize} 
            stroke={isMajor ? majorTickColor : tickColor} strokeWidth="1" 
          />
          {isMajor && (
            <text 
              x={pos + 4} y={12} fontSize="9" fill={textColor} 
              style={{ userSelect: 'none', fontFamily: 'monospace', fontWeight: 'bold' }}
            >
              {x}
            </text>
          )}
        </g>
      );
    }
  }

  // Vertical ruler ticks
  const vTicks = [];
  const startY = Math.floor(-panY / zoom / 100) * 100;
  const endY = Math.ceil((containerHeight - panY) / zoom / 100) * 100;

  for (let y = startY - 200; y < endY + 200; y += 10) {
    const isMajor = y % 100 === 0;
    const isMedium = y % 50 === 0;
    const pos = y * zoom + panY;
    
    if (pos >= 0 && pos <= containerHeight) {
      vTicks.push(
        <g key={`v-${y}`}>
          <line 
            x1={isMajor ? 0 : isMedium ? 12 : 16} y1={pos} 
            x2={rulerSize} y2={pos} 
            stroke={isMajor ? majorTickColor : tickColor} strokeWidth="1" 
          />
          {isMajor && (
            <text 
              x={12} y={pos - 4} fontSize="9" fill={textColor} 
              transform={`rotate(-90, 12, ${pos - 4})`}
              style={{ userSelect: 'none', fontFamily: 'monospace', fontWeight: 'bold' }}
            >
              {y}
            </text>
          )}
        </g>
      );
    }
  }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}>
      {/* Horizontal Ruler */}
      <div style={{ position: 'absolute', top: 0, left: rulerSize, right: 0, height: rulerSize, backgroundColor: bgColor, borderBottom: '1px solid #333', overflow: 'hidden' }}>
        <svg width="100%" height={rulerSize}>
          {/* Layout Area Highlight */}
          <rect 
            x={panX - rulerSize} 
            y={0} 
            width={layoutWidth * zoom} 
            height={rulerSize} 
            fill={highlightColor} 
          />
          {/* Viewport Boundary Indicator */}
          <rect 
            x={panX - rulerSize} 
            y={rulerSize - 3} 
            width={viewportWidth * zoom} 
            height={3} 
            fill="none"
            stroke={viewportLineColor}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <g transform={`translate(${-rulerSize}, 0)`}>
            {hTicks}
          </g>
          {/* Mouse Tracker */}
          <line 
            x1={mouseRulerX - rulerSize} y1={0} 
            x2={mouseRulerX - rulerSize} y2={rulerSize} 
            stroke={mouseLineColor} strokeWidth="1" 
          />
        </svg>
      </div>
      
      {/* Vertical Ruler */}
      <div style={{ position: 'absolute', top: rulerSize, left: 0, width: rulerSize, bottom: 0, backgroundColor: bgColor, borderRight: '1px solid #333', overflow: 'hidden' }}>
        <svg width={rulerSize} height="100%">
          {/* Layout Area Highlight */}
          <rect 
            x={0} 
            y={panY - rulerSize} 
            width={rulerSize} 
            height={layoutHeight * zoom} 
            fill={highlightColor} 
          />
          {/* Viewport Boundary Indicator */}
          <rect 
            x={rulerSize - 3} 
            y={panY - rulerSize} 
            width={3} 
            height={viewportHeight * zoom} 
            fill="none"
            stroke={viewportLineColor}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <g transform={`translate(0, ${-rulerSize})`}>
            {vTicks}
          </g>
          {/* Mouse Tracker */}
          <line 
            x1={0} y1={mouseRulerY - rulerSize} 
            x2={rulerSize} y2={mouseRulerY - rulerSize} 
            stroke={mouseLineColor} strokeWidth="1" 
          />
        </svg>
      </div>

      {/* Corner Box */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, width: rulerSize, height: rulerSize, 
        backgroundColor: '#252526', borderRight: '1px solid #333', borderBottom: '1px solid #333',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace', zIndex: 101
      }}>
        PX
      </div>
    </div>
  );
};
