import React, { memo } from 'react';
import { Instance, ObjectTypeKind, Project } from '../../model/project';
import { getEffectsFilter } from '../../utils/renderUtils';

interface ViewportInstanceProps {
  inst: Instance;
  isSelected: boolean;
  isHighlighted: boolean;
  project: Project;
  zoom: number;
  onMouseDown: (e: React.MouseEvent, instanceId: string) => void;
  onHandleMouseDown: (e: React.MouseEvent, ids: string[], handle: string) => void;
  getHandleCursor: (handle: string, angle: number) => string;
  selectedInstanceIdsCount: number;
}

const ViewportInstanceComponent: React.FC<ViewportInstanceProps> = ({
  inst,
  isSelected,
  isHighlighted,
  project,
  zoom,
  onMouseDown,
  onHandleMouseDown,
  getHandleCursor,
  selectedInstanceIdsCount
}) => {
  const objectType = project.objectTypes?.find(ot => ot.id === inst.objectTypeId);
  const kind = objectType?.kind || ObjectTypeKind.Sprite;

  const renderContent = () => {
    switch (kind) {
      case ObjectTypeKind.Text: {
        const textValue = inst.properties.text || objectType?.properties.text || 'Text';
        const color = inst.properties.color || objectType?.properties.color || '#ffffff';
        const fontSize = (inst.properties.fontSize || objectType?.properties.fontSize || 12);
        const fontFace = inst.properties.fontFace || objectType?.properties.fontFace || 'Arial';
        const hAlign = inst.properties.horizontalAlign || objectType?.properties.horizontalAlign || 'left';
        const vAlign = inst.properties.verticalAlign || objectType?.properties.verticalAlign || 'top';

        let textAnchor: any = 'start';
        let tx = 2;
        if (hAlign === 'center') { textAnchor = 'middle'; tx = inst.width / 2; }
        else if (hAlign === 'right') { textAnchor = 'end'; tx = inst.width - 2; }

        let domBaseline: any = 'hanging';
        let ty = 2;
        if (vAlign === 'center') { domBaseline = 'central'; ty = inst.height / 2; }
        else if (vAlign === 'bottom') { domBaseline = 'auto'; ty = inst.height - 2; }

        return (
          <g>
            <rect width={inst.width} height={inst.height} fill="transparent" stroke={isSelected ? "#0099ff" : "rgba(255,255,255,0.1)"} strokeWidth={1/zoom} style={{ vectorEffect: 'non-scaling-stroke' }} />
            <text 
              x={tx} y={ty} 
              fontSize={fontSize} 
              fill={color} 
              fontFamily={fontFace}
              textAnchor={textAnchor}
              dominantBaseline={domBaseline}
              pointerEvents="none"
              style={{ userSelect: 'none' }}
            >
              {textValue}
            </text>
          </g>
        );
      }
      case ObjectTypeKind.TiledBackground: {
        const tileW = inst.properties.tileWidth || 32;
        const tileH = inst.properties.tileHeight || 32;
        const bgColor = inst.properties.color || '#2d2d2d';
        return (
          <g>
            <defs>
              <pattern id={`tiled-${inst.id}`} width={tileW} height={tileH} patternUnits="userSpaceOnUse">
                <rect width={tileW} height={tileH} fill={bgColor} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                <path d={`M 0 ${tileH/2} L ${tileW} ${tileH/2} M ${tileW/2} 0 L ${tileW/2} ${tileH}`} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" opacity="0.3" />
              </pattern>
            </defs>
            <rect width={inst.width} height={inst.height} fill={`url(#tiled-${inst.id})`} stroke={isSelected ? "#0099ff" : "#444"} strokeWidth={isSelected ? 2 / zoom : 1 / zoom} style={{ vectorEffect: 'non-scaling-stroke' }} />
            <text x={inst.width/2} y={inst.height/2} fontSize={Math.max(10 / zoom, 2)} fill="rgba(255,255,255,0.2)" textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ userSelect: 'none' }}>Tiled</text>
          </g>
        );
      }
      case ObjectTypeKind.Sprite:
      default: {
        const defaultFrame = objectType?.animations?.[0]?.frames?.[0];
        const assetId = defaultFrame?.assetId;
        
        if (assetId) {
          return (
            <image 
              width={inst.width} height={inst.height} 
              href={assetId} 
              preserveAspectRatio="none"
              style={{ imageRendering: 'pixelated', opacity: inst.visible ? 1 : 0.3 }}
            />
          );
        }

        const spriteColor = inst.properties.color || '#4a4a4a';
        return (
          <g>
            <rect width={inst.width} height={inst.height} fill={spriteColor} stroke={isSelected ? "#0099ff" : "#555"} strokeWidth={isSelected ? 2 / zoom : 1 / zoom} style={{ vectorEffect: 'non-scaling-stroke', opacity: inst.visible ? 1 : 0.3 }} />
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              transform={`translate(${inst.width/2 - 12}, ${inst.height/2 - 12}) scale(${Math.min(inst.width, inst.height)/48})`}
              fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}
            />
            <text x={inst.width/2} y={inst.height - (isSelected ? 10/zoom : 5/zoom)} fontSize={Math.max(8 / zoom, 2)} fill="#888" textAnchor="middle" pointerEvents="none" style={{ userSelect: 'none' }}>{objectType?.name || 'Sprite'}</text>
          </g>
        );
      }
    }
  };

  return (
    <g 
      transform={`translate(${inst.x}, ${inst.y}) rotate(${inst.angle})`} 
      onMouseDown={(e) => onMouseDown(e, inst.id)} 
      opacity={inst.opacity}
      style={{ filter: getEffectsFilter([...(objectType?.effects || []), ...(inst.effects || [])]) }}
    >
      {renderContent()}
      {isHighlighted && !isSelected && (
        <rect 
          width={inst.width} height={inst.height} 
          fill="none" 
          stroke="#f1c40f" 
          strokeWidth={2 / zoom} 
          strokeDasharray={`${6/zoom} ${4/zoom}`}
          style={{ vectorEffect: 'non-scaling-stroke', animation: 'pulse 1s infinite' }}
        />
      )}
      {isSelected && (
        <g>
          <rect width={inst.width} height={inst.height} fill="rgba(0, 153, 255, 0.1)" pointerEvents="none" />
          {selectedInstanceIdsCount === 1 && (
            <g>
              {[
                { h: 'tl', x: 0, y: 0 }, { h: 't', x: inst.width / 2, y: 0 }, { h: 'tr', x: inst.width, y: 0 },
                { h: 'r', x: inst.width, y: inst.height / 2 }, { h: 'br', x: inst.width, y: inst.height },
                { h: 'b', x: inst.width / 2, y: inst.height }, { h: 'bl', x: 0, y: inst.height }, { h: 'l', x: 0, y: inst.height / 2 },
              ].map(handle => (
                <rect 
                  key={handle.h} x={handle.x - 5 / zoom} y={handle.y - 5 / zoom} 
                  width={10 / zoom} height={10 / zoom} fill="white" stroke="#0099ff" 
                  strokeWidth={1.5 / zoom} rx={1 / zoom} ry={1 / zoom}
                  filter="url(#handleShadow)"
                  style={{ cursor: getHandleCursor(handle.h, inst.angle), vectorEffect: 'non-scaling-stroke' }} 
                  onMouseDown={(e) => onHandleMouseDown(e, [inst.id], handle.h)} 
                />
              ))}
              <line x1={inst.width / 2} y1={0} x2={inst.width / 2} y2={-25 / zoom} stroke="#0099ff" strokeWidth={2 / zoom} strokeLinecap="round" />
              <circle 
                cx={inst.width / 2} cy={-25 / zoom} r={6 / zoom} 
                fill="white" stroke="#0099ff" strokeWidth={1.5 / zoom} 
                filter="url(#handleShadow)"
                style={{ cursor: 'alias', vectorEffect: 'non-scaling-stroke' }} 
                onMouseDown={(e) => onHandleMouseDown(e, [inst.id], 'rotate')} 
              />
            </g>
          )}
        </g>
      )}
    </g>
  );
};

export const ViewportInstance = memo(ViewportInstanceComponent);
