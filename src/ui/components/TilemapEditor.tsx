import React from 'react';
import { LayoutGrid, MousePointer2, Paintbrush, Eraser, Move, Grid3X3, Layers } from 'lucide-react';
import { Project, ObjectType } from '../../model/project';
import { useEditorStore } from '../../store/useEditorStore';
import { getTranslation } from '../../i18n';

interface TilemapEditorProps {
  project: Project;
  objectType: ObjectType;
  onUpdate: (data: { width: number, height: number, tiles: number[][] }) => void;
  onClose: () => void;
}

export const TilemapEditor: React.FC<TilemapEditorProps> = ({ project, objectType, onUpdate, onClose }) => {
  const { editorState } = useEditorStore();
  const t = getTranslation(editorState.language);
  
  const [selectedTile, setSelectedTile] = React.useState(0);
  const [tool, setTool] = React.useState<'pencil' | 'eraser' | 'picker'>('pencil');
  const [zoom, setZoom] = React.useState(1);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const tileWidth = objectType.properties?.tileWidth || 32;
  const tileHeight = objectType.properties?.tileHeight || 32;
  
  // Initialize data if missing
  const data = objectType.tilemapData || {
    width: 20,
    height: 15,
    tiles: Array.from({ length: 15 }, () => Array(20).fill(-1))
  };

  const handleTileClick = (x: number, y: number) => {
    const newTiles = [...data.tiles.map(row => [...row])];
    if (tool === 'pencil') {
      newTiles[y][x] = selectedTile;
    } else if (tool === 'eraser') {
      newTiles[y][x] = -1;
    } else if (tool === 'picker') {
      setSelectedTile(newTiles[y][x]);
      setTool('pencil');
      return;
    }
    onUpdate({ ...data, tiles: newTiles });
  };

  const handleResize = (newW: number, newH: number) => {
    const newTiles = Array.from({ length: newH }, (_, y) => 
      Array.from({ length: newW }, (_, x) => (data.tiles[y]?.[x] ?? -1))
    );
    onUpdate({ width: newW, height: newH, tiles: newTiles });
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '350px',
      backgroundColor: '#252526',
      borderTop: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1500,
      boxShadow: '0 -5px 15px rgba(0,0,0,0.3)'
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LayoutGrid size={16} color="#3498db" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.TILEMAP_EDITOR}: {objectType.name}</span>
          <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
            <button 
              onClick={() => setTool('pencil')}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: tool === 'pencil' ? '#007acc' : 'transparent', color: '#fff', cursor: 'pointer' }}
              title={t.BRUSH}
            >
              <Paintbrush size={14} />
            </button>
            <button 
              onClick={() => setTool('eraser')}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: tool === 'eraser' ? '#007acc' : 'transparent', color: '#fff', cursor: 'pointer' }}
              title={t.ERASER}
            >
              <Eraser size={14} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#aaa' }}>
             {t.GRID}: {data.width} x {data.height}
             <button onClick={() => handleResize(data.width + 1, data.height)} style={{ background: '#333', border: 'none', color: '#fff', padding: '0 6px', borderRadius: '2px' }}>+</button>
             <button onClick={() => handleResize(Math.max(1, data.width - 1), data.height)} style={{ background: '#333', border: 'none', color: '#fff', padding: '0 6px', borderRadius: '2px' }}>-</button>
           </div>
           <button onClick={onClose} style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>{t.CLOSE}</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Tile Palette */}
        <div style={{ width: '200px', borderRight: '1px solid #333', padding: '12px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>{t.TILESET}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div 
                key={i}
                onClick={() => setSelectedTile(i)}
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  backgroundColor: i === 0 ? '#333' : '#555',
                  border: selectedTile === i ? '2px solid #007acc' : '1px solid #444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: '#aaa'
                }}
              >
                {i}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Drawing Area */}
        <div 
          ref={scrollContainerRef}
          style={{ flex: 1, backgroundColor: '#1e1e1e', overflow: 'auto', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${data.width}, ${tileWidth}px)`,
            gridTemplateRows: `repeat(${data.height}, ${tileHeight}px)`,
            border: '1px solid #333',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
          }}>
            {data.tiles.map((row, y) => row.map((tileIdx, x) => (
              <div 
                key={`${x}-${y}`}
                onMouseDown={() => handleTileClick(x, y)}
                onMouseEnter={(e) => { if (e.buttons === 1) handleTileClick(x, y); }}
                style={{
                  width: tileWidth,
                  height: tileHeight,
                  border: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: tileIdx === -1 ? 'transparent' : (tileIdx === 0 ? '#333' : '#555'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.2)',
                  cursor: tool === 'pencil' ? 'crosshair' : 'default'
                }}
              >
                {tileIdx !== -1 && tileIdx}
              </div>
            )))}
          </div>
        </div>
      </div>
    </div>
  );
};
