import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { 
  X, Plus, Trash2, Play, Pause, Image as ImageIcon, 
  Target, Upload, Clock, Repeat, Pencil, Eraser, 
  Droplet, FlipHorizontal, FlipVertical, RotateCw, 
  Crop, Crosshair, ZoomIn, ZoomOut, Eye, EyeOff, 
  Pentagon, MousePointer2, Move, Maximize2, Scissors, 
  Copy, Clipboard, MousePointer, Sparkles, Maximize
} from 'lucide-react';
import { generateId } from '../../utils/id';

type DrawingTool = 'brush' | 'eraser' | 'fill' | 'point' | 'collision' | 'select';

export const SpriteEditor: React.FC = () => {
  const { 
    project, editorState, closeSpriteEditor, updateObjectType 
  } = useEditorStore();

  const spriteEditor = editorState.spriteEditor;
  if (!spriteEditor || !spriteEditor.isOpen) return null;

  const objectType = project.objectTypes.find(ot => ot.id === spriteEditor.objectTypeId);
  if (!objectType) return null;

  const [selectedAnimId, setSelectedAnimId] = React.useState(objectType.animations[0]?.id || '');
  const [selectedFrameId, setSelectedFrameId] = React.useState(objectType.animations[0]?.frames[0]?.id || '');
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [previewFrameIdx, setPreviewFrameIdx] = React.useState(0);
  const [tool, setTool] = React.useState<DrawingTool>('brush');
  const [color, setColor] = React.useState('#ffffff');
  const [brushSize, setBrushSize] = React.useState(1);
  const [selectedPointId, setSelectedPointId] = React.useState<string | 'origin'>('origin');
  const [zoom, setZoom] = React.useState(1); // Default to 1, will auto-fit
  const [showOnionSkin, setShowOnionSkin] = React.useState(false);
  const [draggedPointIdx, setDraggedPointIdx] = React.useState<number | null>(null);
  const [mousePos, setMousePos] = React.useState<{ x: number, y: number } | null>(null);
  const [showResizeDialog, setShowResizeDialog] = React.useState(false);
  const [selection, setSelection] = React.useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [canvasSize, setCanvasSize] = React.useState({ w: 64, h: 64 });

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const canvasAreaRef = React.useRef<HTMLDivElement>(null);
  const onionRef = React.useRef<HTMLCanvasElement>(null);
  const selectedAnim = objectType.animations.find(a => a.id === selectedAnimId);
  const selectedFrame = selectedAnim?.frames.find(f => f.id === selectedFrameId);
  const prevFrame = selectedAnim && selectedFrame ? selectedAnim.frames[selectedAnim.frames.indexOf(selectedFrame) - 1] : null;

  const autoFitZoom = React.useCallback(() => {
    const area = canvasAreaRef.current;
    if (!area) return;
    const padding = 80;
    const areaW = area.clientWidth - padding;
    const areaH = area.clientHeight - padding;
    const zoomW = areaW / canvasSize.w;
    const zoomH = areaH / canvasSize.h;
    const newZoom = Math.floor(Math.min(zoomW, zoomH, 100));
    setZoom(Math.max(1, newZoom));
  }, [canvasSize]);

  // Initial auto-fit
  React.useEffect(() => {
    const timer = setTimeout(autoFitZoom, 50);
    return () => clearTimeout(timer);
  }, [autoFitZoom]);

  // Animation playback
  React.useEffect(() => {
    if (!isPlaying || !selectedAnim || selectedAnim.frames.length === 0) return;
    const interval = setInterval(() => {
      setPreviewFrameIdx(prev => {
        const next = prev + 1;
        return next >= selectedAnim.frames.length ? (selectedAnim.loop ? 0 : prev) : next;
      });
    }, 1000 / selectedAnim.speed);
    return () => clearInterval(interval);
  }, [isPlaying, selectedAnim]);

  // Load image into canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedFrame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (selectedFrame.assetId) {
      const img = new Image();
      img.onload = () => {
        setCanvasSize({ w: img.width, h: img.height });
        canvas.width = img.width; canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);
      };
      img.src = selectedFrame.assetId;
    } else {
      setCanvasSize({ w: 64, h: 64 });
      canvas.width = 64; canvas.height = 64;
      ctx.clearRect(0, 0, 64, 64);
    }
  }, [selectedFrameId, selectedFrame?.assetId]);

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const key = e.key.toLowerCase();
      if (key === 'b') setTool('brush');
      if (key === 'e') setTool('eraser');
      if (key === 'f') setTool('fill');
      if (key === 'g') { setTool('point'); setSelectedPointId('origin'); }
      if (key === 'c') setTool('collision');
      if (key === 's') setTool('select');
      if (key === '[') setBrushSize(Math.max(1, brushSize - 1));
      if (key === ']') setBrushSize(Math.min(10, brushSize + 1));
      if (key === 'delete' || key === 'backspace') {
        if (tool === 'select' && selection) {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
            const x = Math.min(selection.x1, selection.x2), y = Math.min(selection.y1, selection.y2);
            const w = Math.abs(selection.x1 - selection.x2) + 1, h = Math.abs(selection.y1 - selection.y2) + 1;
            ctx.clearRect(x, y, w, h); saveCanvas(); setSelection(null);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [brushSize, tool, selection]);

  const saveCanvas = () => {
    const canvas = canvasRef.current; if (!canvas || !selectedFrame) return;
    onUpdateFrame(selectedFrame.id, { assetId: canvas.toDataURL() });
  };

  const onUpdateFrame = (frameId: string, updates: any) => {
    if (!selectedAnim) return;
    const nextFrames = selectedAnim.frames.map(f => f.id === frameId ? { ...f, ...updates } : f);
    const nextAnims = objectType.animations.map(a => a.id === selectedAnimId ? { ...a, frames: nextFrames } : a);
    updateObjectType(objectType.id, { animations: nextAnims });
  };

  const onUpdateAnim = (updates: any) => {
    const nextAnims = objectType.animations.map(a => a.id === selectedAnimId ? { ...a, ...updates } : a);
    updateObjectType(objectType.id, { animations: nextAnims });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedFrame) {
      const url = URL.createObjectURL(file);
      onUpdateFrame(selectedFrame.id, { assetId: url });
    }
  };

  const transformImage = (action: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    action(ctx, canvas); saveCanvas();
  };

  const mirrorH = () => transformImage((ctx, canvas) => {
    const temp = document.createElement('canvas'); temp.width = canvas.width; temp.height = canvas.height;
    const tCtx = temp.getContext('2d')!; tCtx.scale(-1, 1); tCtx.drawImage(canvas, -canvas.width, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(temp, 0, 0);
  });
  const flipV = () => transformImage((ctx, canvas) => {
    const temp = document.createElement('canvas'); temp.width = canvas.width; temp.height = canvas.height;
    const tCtx = temp.getContext('2d')!; tCtx.scale(1, -1); tCtx.drawImage(canvas, 0, -canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(temp, 0, 0);
  });
  const rotate90 = () => transformImage((ctx, canvas) => {
    const temp = document.createElement('canvas'); temp.width = canvas.height; temp.height = canvas.width;
    const tCtx = temp.getContext('2d')!; tCtx.translate(temp.width/2, temp.height/2); tCtx.rotate(Math.PI/2); tCtx.drawImage(canvas, -canvas.width/2, -canvas.height/2);
    canvas.width = temp.width; canvas.height = temp.height; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(temp, 0, 0);
  });
  const crop = () => transformImage((ctx, canvas) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imageData.data;
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, hasPixels = false;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] > 0) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); hasPixels = true; }
    if (!hasPixels) return; const w = maxX - minX + 1, h = maxY - minY + 1;
    const cut = ctx.getImageData(minX, minY, w, h); canvas.width = w; canvas.height = h; ctx.putImageData(cut, 0, 0); setCanvasSize({ w, h });
  });

  const [isDrawing, setIsDrawing] = React.useState(false);
  const lastPos = React.useRef<{ x: number, y: number } | null>(null);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = Math.floor((clientX - rect.left) / (rect.width / canvas.width));
    const y = Math.floor((clientY - rect.top) / (rect.height / canvas.height));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasCoords(e);
    if (!pos || !selectedFrame) return;
    if (tool === 'select') { setSelection({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }); setIsDrawing(true); return; }
    if (tool === 'collision') {
      const poly = selectedFrame.collisionPolygon || [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
      const threshold = 15 / (zoom * canvasSize.w);
      const idx = poly.findIndex(p => Math.abs(p.x - pos.x / canvasSize.w) < threshold && Math.abs(p.y - pos.y / canvasSize.h) < threshold);
      if (idx !== -1) setDraggedPointIdx(idx);
      else onUpdateFrame(selectedFrame.id, { collisionPolygon: poly });
      return;
    }
    if (tool === 'point') {
      if (selectedPointId === 'origin') onUpdateFrame(selectedFrame.id, { originX: pos.x / canvasSize.w, originY: pos.y / canvasSize.h });
      else onUpdateFrame(selectedFrame.id, { imagePoints: selectedFrame.imagePoints.map(p => p.id === selectedPointId ? { ...p, x: pos.x / canvasSize.w, y: pos.y / canvasSize.h } : p) });
      return;
    }
    setIsDrawing(true); lastPos.current = pos; draw(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasCoords(e); if (!pos) { setMousePos(null); return; } setMousePos(pos);
    if (tool === 'select' && isDrawing) { setSelection(s => s ? { ...s, x2: pos.x, y2: pos.y } : null); return; }
    if (draggedPointIdx !== null && selectedFrame) {
      const poly = [...(selectedFrame.collisionPolygon || [])];
      poly[draggedPointIdx] = { x: pos.x / canvasSize.w, y: pos.y / canvasSize.h };
      onUpdateFrame(selectedFrame.id, { collisionPolygon: poly }); return;
    }
    if (!isDrawing) return; draw(pos.x, pos.y);
  };

  const handleMouseUp = () => { if (isDrawing) { setIsDrawing(false); lastPos.current = null; saveCanvas(); } setDraggedPointIdx(null); };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      setZoom(Math.max(1, Math.min(100, zoom + delta)));
    }
  };

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    if (tool === 'fill') { floodFill(ctx, x, y, color); setIsDrawing(false); saveCanvas(); return; }
    ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,0)' : color;
    ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,0)' : color;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    if (lastPos.current) {
      ctx.beginPath(); ctx.moveTo(lastPos.current.x + 0.5, lastPos.current.y + 0.5); ctx.lineTo(x + 0.5, y + 0.5);
      ctx.lineWidth = brushSize; ctx.lineCap = 'round'; ctx.stroke();
    } else { ctx.fillRect(x, y, brushSize, brushSize); }
    lastPos.current = { x, y };
  };

  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const canvas = ctx.canvas; const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imageData.data;
    const targetColor = getPixel(data, startX, startY, canvas.width); const fillRGBA = hexToRGBA(fillColor);
    if (colorsMatch(targetColor, fillRGBA)) return;
    const stack = [[startX, startY]];
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      if (!colorsMatch(getPixel(data, x, y, canvas.width), targetColor)) continue;
      setPixel(data, x, y, canvas.width, fillRGBA); stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const getPixel = (data: Uint8ClampedArray, x: number, y: number, width: number) => { const i = (y * width + x) * 4; return [data[i], data[i+1], data[i+2], data[i+3]]; };
  const setPixel = (data: Uint8ClampedArray, x: number, y: number, width: number, color: number[]) => { const i = (y * width + x) * 4; data[i] = color[0]; data[i+1] = color[1]; data[i+2] = color[2]; data[i+3] = color[3]; };
  const colorsMatch = (c1: number[], c2: number[]) => c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
  const hexToRGBA = (hex: string) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return [r, g, b, 255]; };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#ff4b2b', padding: '6px', borderRadius: '4px' }}><ImageIcon size={20} color="#fff" /></div>
            <span style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>Sprite Editor: {objectType.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={zoomContainerStyle}>
              <button onClick={() => setZoom(Math.max(1, zoom - 1))} style={zoomButtonStyle}><ZoomOut size={14}/></button>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#007acc', width: '50px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</div>
              <button onClick={() => setZoom(Math.min(100, zoom + 1))} style={zoomButtonStyle}><ZoomIn size={14}/></button>
              <button onClick={autoFitZoom} style={{ ...zoomButtonStyle, borderLeft: '1px solid #222' }} title="Auto Fit Zoom"><Maximize size={14} /></button>
            </div>
            <button onClick={closeSpriteEditor} style={closeButtonStyle}><X size={24} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={sidePanelStyle}>
            <div style={sectionHeaderStyle}>Animations</div>
            <div style={{ height: '140px', overflowY: 'auto', padding: '8px' }}>
              {objectType.animations.map(anim => (
                <div key={anim.id} onClick={() => { setSelectedAnimId(anim.id); setSelectedFrameId(anim.frames[0]?.id || ''); setPreviewFrameIdx(0); }}
                  style={{ ...animItemStyle, backgroundColor: selectedAnimId === anim.id ? '#3e3e42' : 'transparent', borderColor: selectedAnimId === anim.id ? '#007acc' : 'transparent' }}>
                  <span style={{ flex: 1 }}>{anim.name}</span>
                </div>
              ))}
            </div>
            <div style={sectionHeaderStyle}>Tools & Points</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              <ToolItem active={tool === 'select'} onClick={() => setTool('select')} icon={<MousePointer size={14}/>} label="Selection" shortcut="S" />
              <ToolItem active={tool === 'brush'} onClick={() => setTool('brush')} icon={<Pencil size={14}/>} label="Brush" shortcut="B" />
              <ToolItem active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={14}/>} label="Eraser" shortcut="E" />
              <ToolItem active={tool === 'fill'} onClick={() => setTool('fill')} icon={<Droplet size={14}/>} label="Fill" shortcut="F" />
              <div style={dividerHStyle} />
              <ToolItem active={tool === 'point' && selectedPointId === 'origin'} onClick={() => { setTool('point'); setSelectedPointId('origin'); }} icon={<Target size={14}/>} label="Origin" color="#3498db" shortcut="G" />
              <ToolItem active={tool === 'collision'} onClick={() => setTool('collision')} icon={<Pentagon size={14}/>} label="Collision" color="#2ecc71" shortcut="C" />
              <div style={dividerHStyle} />
              {selectedFrame?.imagePoints.map(p => (
                <ToolItem key={p.id} active={tool === 'point' && selectedPointId === p.id} onClick={() => { setTool('point'); setSelectedPointId(p.id); }} icon={<Crosshair size={14}/>} label={p.name} />
              ))}
              <button style={addPointBtnStyle} onClick={() => {
                if (!selectedFrame) return;
                const newPoint = { id: generateId(), name: `Point ${selectedFrame.imagePoints.length + 1}`, x: 0.5, y: 0.5 };
                onUpdateFrame(selectedFrame.id, { imagePoints: [...selectedFrame.imagePoints, newPoint] });
                setSelectedPointId(newPoint.id); setTool('point');
              }}><Plus size={14} /> Add Point</button>
            </div>
          </div>

          <div style={mainAreaStyle}>
            <div style={toolbarStyle}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <ToolBtn onClick={mirrorH} icon={<FlipHorizontal size={16}/>} title="Mirror H" />
                <ToolBtn onClick={flipV} icon={<FlipVertical size={16}/>} title="Flip V" />
                <ToolBtn onClick={rotate90} icon={<RotateCw size={16}/>} title="Rotate 90" />
                <ToolBtn onClick={crop} icon={<Crop size={16}/>} title="Crop" />
                <div style={dividerStyle} />
                <ToolBtn active={showOnionSkin} onClick={() => setShowOnionSkin(!showOnionSkin)} icon={showOnionSkin ? <Eye size={16}/> : <EyeOff size={16}/>} title="Onion Skinning" />
                <div style={dividerStyle} />
                <ToolBtn onClick={() => setShowResizeDialog(true)} icon={<Maximize2 size={16}/>} title="Resize Canvas" />
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={colorInputStyle} title="Select Color" />
                <label style={uploadButtonStyle}><Upload size={14} /> IMPORT <input type="file" hidden onChange={handleFileUpload} accept="image/*" /></label>
              </div>
            </div>

            <div ref={canvasAreaRef} style={canvasAreaStyle} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
              {selectedFrame ? (
                <div style={{ 
                  position: 'relative', boxShadow: '0 0 100px rgba(0,0,0,0.5)', 
                  width: `${canvasSize.w * zoom}px`,
                  height: `${canvasSize.h * zoom}px`,
                  transition: 'width 0.1s, height 0.1s'
                }}>
                   <div style={checkerboardStyle} />
                   {showOnionSkin && prevFrame && (
                     <canvas ref={onionRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', imageRendering: 'pixelated', opacity: 0.3 }} />
                   )}
                   <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', imageRendering: 'pixelated', cursor: tool === 'brush' ? 'crosshair' : tool === 'select' ? 'crosshair' : 'pointer' }} />
                   
                   <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                      {selection && (
                        <div style={{
                          position: 'absolute', left: `${(Math.min(selection.x1, selection.x2) / canvasSize.w) * 100}%`, top: `${(Math.min(selection.y1, selection.y2) / canvasSize.h) * 100}%`,
                          width: `${((Math.abs(selection.x1 - selection.x2) + 1) / canvasSize.w) * 100}%`, height: `${((Math.abs(selection.y1 - selection.y2) + 1) / canvasSize.h) * 100}%`,
                          border: '1px dashed #fff', backgroundColor: 'rgba(255,255,255,0.1)'
                        }} />
                      )}
                      
                      <Marker x={selectedFrame.originX} y={selectedFrame.originY} color="#3498db" active={selectedPointId === 'origin' && tool === 'point'} />
                      {selectedFrame.imagePoints.map(p => (
                        <Marker key={p.id} x={p.x} y={p.y} color="#e74c3c" active={selectedPointId === p.id && tool === 'point'} />
                      ))}

                      {selectedFrame.collisionPolygon && (
                        <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                          <polygon 
                            points={selectedFrame.collisionPolygon.map(p => `${p.x},${p.y}`).join(' ')} 
                            fill="rgba(46, 204, 113, 0.2)" stroke="#2ecc71" strokeWidth={1 / (zoom * canvasSize.w)} style={{ vectorEffect: 'non-scaling-stroke' }}
                          />
                          {tool === 'collision' && selectedFrame.collisionPolygon.map((p, idx) => (
                            <circle key={idx} cx={p.x} cy={p.y} r={4 / (zoom * canvasSize.w)} fill="#2ecc71" stroke="#fff" strokeWidth={1 / (zoom * canvasSize.w)} pointerEvents="none" />
                          ))}
                        </svg>
                      )}
                   </div>
                </div>
              ) : <div style={{ color: '#444' }}>SELECT A FRAME</div>}
            </div>

            <div style={editorStatusBarStyle}>
               <div style={{ display: 'flex', gap: '20px' }}>
                 <StatusItem label="SIZE" value={`${canvasSize.w} x ${canvasSize.h}`} />
                 <StatusItem label="POS" value={mousePos ? `${mousePos.x}, ${mousePos.y}` : '-'} />
                 <StatusItem label="ZOOM" value={`${Math.round(zoom * 100)}%`} />
               </div>
            </div>

            <div style={frameStripStyle}>
              <div style={playbackControlsStyle}>
                <button onClick={() => setIsPlaying(!isPlaying)} style={{ ...playButtonStyle, backgroundColor: isPlaying ? '#ff4b2b' : '#007acc' }}>
                  {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
                </button>
              </div>
              <div style={stripContainerStyle}>
                {selectedAnim?.frames.map((frame, idx) => (
                  <div key={frame.id} onClick={() => setSelectedFrameId(frame.id)}
                    style={{ ...frameBoxStyle, borderColor: selectedFrameId === frame.id ? '#007acc' : '#222', backgroundColor: selectedFrameId === frame.id ? '#1a1a1a' : '#0a0a0a' }}>
                    <div style={frameNumberStyle}>{idx}</div>
                    {frame.assetId ? <img src={frame.assetId} style={{ width: '80%', height: '80%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="F" /> : <ImageIcon size={20} color="#222" />}
                    <button onClick={(e) => { e.stopPropagation(); 
                      if (!selectedAnim || selectedAnim.frames.length <= 1) return;
                      const nextFrames = selectedAnim.frames.filter(f => f.id !== frame.id);
                      onUpdateAnim({ frames: nextFrames }); if (selectedFrameId === frame.id) setSelectedFrameId(nextFrames[0].id);
                    }} style={deleteFrameButtonStyle}><Trash2 size={12} /></button>
                  </div>
                ))}
                <button style={addFrameButtonStyle} onClick={() => {
                  if (!selectedAnim) return;
                  const newId = generateId();
                  const newFrame = { id: newId, assetId: selectedFrame?.assetId || '', duration: 1, originX: 0.5, originY: 0.5, imagePoints: [], collisionPolygon: selectedFrame?.collisionPolygon ? [...selectedFrame.collisionPolygon] : undefined };
                  onUpdateAnim({ frames: [...selectedAnim.frames, newFrame] }); setSelectedFrameId(newId);
                }}><Plus size={24} /></button>
              </div>
            </div>
          </div>

          <div style={sidePanelStyle}>
            <div style={sectionHeaderStyle}>Properties</div>
            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {selectedAnim && (
                <>
                  <div><label style={labelStyle}>Animation Name</label>
                    <input value={selectedAnim.name} onChange={e => onUpdateAnim({ name: e.target.value })} style={propInputStyle} />
                  </div>
                  <div><label style={labelStyle}>Speed (FPS)</label>
                    <input type="number" value={selectedAnim.speed} onChange={e => onUpdateAnim({ speed: Number(e.target.value) })} style={propInputStyle} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => onUpdateAnim({ loop: !selectedAnim.loop })}>
                    <div style={{ ...checkboxStyle, backgroundColor: selectedAnim.loop ? '#007acc' : '#000' }}>{selectedAnim.loop && <div style={{ width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '1px' }} />}</div>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>Loop</span>
                  </div>
                </>
              )}
              {tool === 'collision' && (
                <div style={propertyBlockStyle}>
                  <div style={sectionHeaderStyle}>Collision Editor</div>
                  <div style={infoTextStyle}>Drag the green dots to shape the hit mask.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 10px' }}>
                    <button onClick={() => {
                      onUpdateFrame(selectedFrame!.id, { collisionPolygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] });
                    }} style={secondaryButtonStyle}>Reset to Box</button>
                    <button onClick={() => {
                      const canvas = canvasRef.current; if (!canvas) return;
                      const ctx = canvas.getContext('2d'); if (!ctx) return;
                      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                      const data = imageData.data;
                      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, hasPixels = false;
                      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] > 0) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); hasPixels = true; }
                      if (hasPixels) {
                        onUpdateFrame(selectedFrame!.id, { collisionPolygon: [{ x: minX/canvas.width, y: minY/canvas.height }, { x: (maxX+1)/canvas.width, y: minY/canvas.height }, { x: (maxX+1)/canvas.width, y: (maxY+1)/canvas.height }, { x: minX/canvas.width, y: (maxY+1)/canvas.height }] });
                      }
                    }} style={primaryButtonStyle}><Sparkles size={12}/> Guess Shape</button>
                  </div>
                </div>
              )}
            </div>
            <div style={miniPreviewStyle}>
              <div style={sectionHeaderStyle}>Preview</div>
              <div style={miniPreviewContentStyle}>
                {selectedAnim && selectedAnim.frames[previewFrameIdx]?.assetId ? (
                  <img src={selectedAnim.frames[previewFrameIdx].assetId} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="P" />
                ) : <span style={{ color: '#222', fontSize: '10px' }}>IDLE</span>}
              </div>
            </div>
          </div>
        </div>

        {showResizeDialog && (
          <div style={dialogOverlayStyle}>
            <div style={dialogStyle}>
              <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>RESIZE CANVAS</div>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>WIDTH</label><input id="resize-w" type="number" defaultValue={canvasSize.w} style={propInputStyle} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>HEIGHT</label><input id="resize-h" type="number" defaultValue={canvasSize.h} style={propInputStyle} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setShowResizeDialog(false)} style={secondaryButtonStyle}>CANCEL</button>
                <button onClick={() => {
                  const w = Number((document.getElementById('resize-w') as HTMLInputElement).value);
                  const h = Number((document.getElementById('resize-h') as HTMLInputElement).value);
                  transformImage((ctx, canvas) => {
                    const temp = document.createElement('canvas'); temp.width = canvas.width; temp.height = canvas.height;
                    temp.getContext('2d')?.drawImage(canvas, 0, 0);
                    canvas.width = w; canvas.height = h; ctx.clearRect(0, 0, w, h); ctx.drawImage(temp, 0, 0);
                    setCanvasSize({ w, h });
                  });
                  setShowResizeDialog(false);
                }} style={primaryButtonStyle}>APPLY</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatusItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
    <span style={{ fontSize: '10px', color: '#444', fontWeight: 800 }}>{label}</span>
    <span style={{ fontSize: '10px', color: '#888', fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
  </div>
);

const ToolItem: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color?: string, shortcut?: string }> = ({ active, onClick, icon, label, color, shortcut }) => (
  <div onClick={onClick} style={{ ...animItemStyle, backgroundColor: active ? '#007acc22' : 'transparent', border: active ? '1px solid #007acc' : '1px solid transparent', color: active ? '#fff' : (color || '#888') }}>
    {icon} <span style={{ flex: 1 }}>{label}</span>
    {shortcut && <span style={{ fontSize: '9px', opacity: 0.5 }}>{shortcut}</span>}
  </div>
);

const ToolBtn: React.FC<{ active?: boolean, onClick: () => void, icon: React.ReactNode, title: string }> = ({ active, onClick, icon, title }) => (
  <button onClick={onClick} title={title} style={{ padding: '8px', backgroundColor: active ? '#007acc' : '#1a1a1b', border: '1px solid #333', borderRadius: '4px', color: active ? '#fff' : '#666', cursor: 'pointer' }}>{icon}</button>
);

const Marker: React.FC<{ x: number, y: number, color: string, active: boolean }> = ({ x, y, color, active }) => (
  <div style={{
    position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`,
    width: '4px', height: '4px', border: `1px solid ${active ? '#fff' : color}`, borderRadius: '50%', transform: 'translate(-50%, -50%)',
    boxShadow: active ? `0 0 0 2px ${color}` : '0 0 0 1px rgba(0,0,0,0.5)', zIndex: active ? 10 : 1, backgroundColor: active ? color : 'rgba(0,0,0,0.5)',
    pointerEvents: 'none'
  }} />
);

const checkerboardStyle: React.CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px', backgroundColor: '#080808' };
const zoomContainerStyle: React.CSSProperties = { display: 'flex', gap: '4px', backgroundColor: '#111', padding: '4px 8px', borderRadius: '20px', border: '1px solid #333' };
const zoomButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '2px 8px' };
const dividerStyle: React.CSSProperties = { width: '1px', height: '20px', backgroundColor: '#333', margin: '0 8px' };
const dividerHStyle: React.CSSProperties = { height: '1px', backgroundColor: '#1a1a1a', margin: '8px 4px' };
const colorInputStyle: React.CSSProperties = { width: '28px', height: '28px', padding: '0', border: '2px solid #333', borderRadius: '4px', background: 'none', cursor: 'pointer' };

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 };
const modalStyle: React.CSSProperties = { width: '98%', height: '98%', backgroundColor: '#0c0c0d', borderRadius: '4px', display: 'flex', flexDirection: 'column', border: '1px solid #222', color: '#d4d4d4' };
const headerStyle: React.CSSProperties = { padding: '8px 20px', backgroundColor: '#1a1a1b', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const closeButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#444', cursor: 'pointer' };
const sidePanelStyle: React.CSSProperties = { width: '220px', backgroundColor: '#121213', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' };
const mainAreaStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#252526' };
const sectionHeaderStyle: React.CSSProperties = { padding: '10px 15px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#444', backgroundColor: '#1a1a1b' };
const animItemStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: '4px', marginBottom: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', border: '1px solid transparent' };
const addPointBtnStyle: React.CSSProperties = { padding: '8px', backgroundColor: 'transparent', border: '1px dashed #333', margin: '8px', color: '#444', cursor: 'pointer', fontSize: '11px', borderRadius: '4px' };
const toolbarStyle: React.CSSProperties = { padding: '8px 15px', backgroundColor: '#1a1a1b', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '12px' };
const uploadButtonStyle: React.CSSProperties = { backgroundColor: '#333', color: '#eee', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' };
const canvasAreaStyle: React.CSSProperties = { flex: 1, backgroundColor: '#252526', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', userSelect: 'none' };
const editorStatusBarStyle: React.CSSProperties = { height: '24px', backgroundColor: '#1a1a1b', borderTop: '1px solid #222', display: 'flex', alignItems: 'center', padding: '0 15px' };
const playbackControlsStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px', borderRight: '1px solid #222', backgroundColor: '#121213' };
const frameStripStyle: React.CSSProperties = { height: '100px', backgroundColor: '#121213', borderTop: '1px solid #222', display: 'flex', overflow: 'hidden' };
const playButtonStyle: React.CSSProperties = { width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const stripContainerStyle: React.CSSProperties = { flex: 1, padding: '10px', display: 'flex', gap: '10px', overflowX: 'auto' };
const frameBoxStyle: React.CSSProperties = { width: '70px', height: '70px', borderRadius: '4px', border: '2px solid #222', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const frameNumberStyle: React.CSSProperties = { position: 'absolute', top: '2px', left: '4px', fontSize: '9px', color: '#444' };
const deleteFrameButtonStyle: React.CSSProperties = { position: 'absolute', top: '2px', right: '2px', background: 'none', border: 'none', color: '#333', cursor: 'pointer' };
const addFrameButtonStyle: React.CSSProperties = { width: '70px', height: '70px', border: '2px dashed #222', backgroundColor: 'transparent', color: '#222', cursor: 'pointer', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const propInputStyle: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px', padding: '6px 8px', color: '#fff', fontSize: '12px' };
const labelStyle: React.CSSProperties = { fontSize: '10px', color: '#444', marginBottom: '6px', display: 'block', fontWeight: 900 };
const checkboxStyle: React.CSSProperties = { width: '18px', height: '18px', border: '1px solid #333', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const miniPreviewStyle: React.CSSProperties = { marginTop: 'auto', borderTop: '1px solid #222' };
const miniPreviewContentStyle: React.CSSProperties = { height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' };

const dialogOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 };
const dialogStyle: React.CSSProperties = { backgroundColor: '#1a1a1b', padding: '32px', borderRadius: '8px', border: '1px solid #333', width: '320px' };
const primaryButtonStyle: React.CSSProperties = { backgroundColor: '#007acc', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const secondaryButtonStyle: React.CSSProperties = { backgroundColor: 'transparent', color: '#666', border: '1px solid #333', padding: '8px 24px', borderRadius: '4px', fontWeight: 800, cursor: 'pointer' };
const infoTextStyle: React.CSSProperties = { fontSize: '11px', color: '#444', padding: '10px', fontStyle: 'italic' };
const propertyBlockStyle: React.CSSProperties = { marginTop: '10px', borderTop: '1px solid #222', paddingTop: '10px' };
