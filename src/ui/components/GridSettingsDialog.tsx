import React from 'react';
import { X, Grid, Zap, Eye, EyeOff, Palette, Move } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { getTranslation } from '../../i18n';

interface GridSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GridSettingsDialog: React.FC<GridSettingsDialogProps> = ({ isOpen, onClose }) => {
  const { editorState, setGridSettings } = useEditorStore();
  const t = getTranslation(editorState.language);
  const { gridSizeW, gridSizeH, gridOffsetX, gridOffsetY, gridColor, gridOpacity, snapToGrid, showGrid } = editorState;

  const [w, setW] = React.useState(gridSizeW);
  const [h, setH] = React.useState(gridSizeH);
  const [ox, setOx] = React.useState(gridOffsetX);
  const [oy, setOy] = React.useState(gridOffsetY);
  const [color, setColor] = React.useState(gridColor);
  const [opacity, setOpacity] = React.useState(gridOpacity);

  // Sync with store if it changes externally
  React.useEffect(() => {
    setW(gridSizeW);
    setH(gridSizeH);
    setOx(gridOffsetX);
    setOy(gridOffsetY);
    setColor(gridColor);
    setOpacity(gridOpacity);
  }, [gridSizeW, gridSizeH, gridOffsetX, gridOffsetY, gridColor, gridOpacity]);

  if (!isOpen) return null;

  const presets = [8, 16, 32, 64, 128];

  const handleApply = () => {
    setGridSettings(w, h, snapToGrid, showGrid, ox, oy, color, opacity);
    onClose();
  };

  const handlePreset = (p: number) => {
    setW(p);
    setH(p);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(0, 122, 204, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <Grid size={18} color="#007acc" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>{t.GRID_SETTINGS}</span>
          </div>
          <button onClick={onClose} style={closeButtonStyle}><X size={18} /></button>
        </div>
        
        <div style={contentStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}><Grid size={14} /> <span>{t.GRID} {t.SIZE}</span></div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={inputGroupStyle}>
                    <input type="number" value={w} onChange={e => setW(Number(e.target.value))} style={inputStyle} min={1} />
                    <span style={inputLabelStyle}>{t.WIDTH}</span>
                  </div>
                  <div style={inputGroupStyle}>
                    <input type="number" value={h} onChange={e => setH(Number(e.target.value))} style={inputStyle} min={1} />
                    <span style={inputLabelStyle}>{t.HEIGHT}</span>
                  </div>
                </div>
              </div>

              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}><Move size={14} /> <span>{t.OFFSET}</span></div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={inputGroupStyle}>
                    <input type="number" value={ox} onChange={e => setOx(Number(e.target.value))} style={inputStyle} />
                    <span style={inputLabelStyle}>{t.X}</span>
                  </div>
                  <div style={inputGroupStyle}>
                    <input type="number" value={oy} onChange={e => setOy(Number(e.target.value))} style={inputStyle} />
                    <span style={inputLabelStyle}>{t.Y}</span>
                  </div>
                </div>
              </div>

              <div style={sectionStyle}>
                <div style={sectionHeaderStyle}><Palette size={14} /> <span>{t.APPEARANCE}</span></div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ ...inputGroupStyle, flex: '0 0 60px' }}>
                    <div style={{ position: 'relative', height: '32px' }}>
                      <input type="color" value={color} onChange={e => setColor(e.target.value)} style={colorInputStyle} />
                      <div style={{ ...colorPreviewStyle, backgroundColor: color }} />
                    </div>
                    <span style={inputLabelStyle}>{t.GRID_COLOR}</span>
                  </div>
                  <div style={inputGroupStyle}>
                    <input type="range" min="0" max="1" step="0.01" value={opacity} onChange={e => setOpacity(Number(e.target.value))} style={rangeInputStyle} />
                    <span style={inputLabelStyle}>{t.GRID_OPACITY} ({Math.round(opacity * 100)}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={sectionStyle}>
                <label style={labelStyle}>{t.PRESETS}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {presets.map(p => (
                    <button 
                      key={p} onClick={() => handlePreset(p)}
                      style={{
                        ...presetButtonStyle,
                        backgroundColor: (w === p && h === p) ? 'rgba(0, 122, 204, 0.2)' : 'rgba(255,255,255,0.03)',
                        borderColor: (w === p && h === p) ? '#007acc' : 'rgba(255,255,255,0.05)',
                        color: (w === p && h === p) ? '#007acc' : '#ccc'
                      }}
                    >
                      {p}x{p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ ...sectionStyle, borderBottom: 'none' }}>
                 <label style={labelStyle}>{t.OPTIONS}</label>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={toggleRowStyle} onClick={() => setGridSettings(undefined, undefined, !snapToGrid)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ ...iconCircleStyle, backgroundColor: snapToGrid ? 'rgba(255, 204, 0, 0.1)' : 'transparent' }}>
                          <Zap size={14} color={snapToGrid ? '#ffcc00' : '#666'} />
                        </div>
                        <span style={{ fontSize: '12px', color: snapToGrid ? '#fff' : '#888' }}>{t.SNAP_TO_GRID}</span>
                      </div>
                      <div style={{ ...toggleStyle, backgroundColor: snapToGrid ? '#007acc' : '#333' }}>
                        <div style={{ ...toggleHandleStyle, transform: snapToGrid ? 'translateX(14px)' : 'translateX(0)' }} />
                      </div>
                    </div>

                    <div style={toggleRowStyle} onClick={() => setGridSettings(undefined, undefined, undefined, !showGrid)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ ...iconCircleStyle, backgroundColor: showGrid ? 'rgba(76, 175, 80, 0.1)' : 'transparent' }}>
                          {showGrid ? <Eye size={14} color="#4caf50" /> : <EyeOff size={14} color="#666" />}
                        </div>
                        <span style={{ fontSize: '12px', color: showGrid ? '#fff' : '#888' }}>{t.SHOW_GRID}</span>
                      </div>
                      <div style={{ ...toggleStyle, backgroundColor: showGrid ? '#007acc' : '#333' }}>
                        <div style={{ ...toggleHandleStyle, transform: showGrid ? 'translateX(14px)' : 'translateX(0)' }} />
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
        
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelButtonStyle}>{t.CANCEL}</button>
          <button onClick={handleApply} style={confirmButtonStyle}>{t.APPLY}</button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10000, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e', borderRadius: '16px', width: '560px',
  boxShadow: '0 32px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
  border: '1px solid #333', display: 'flex', flexDirection: 'column', overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px', borderBottom: '1px solid #2d2d2d', display: 'flex',
  alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e1e1e'
};

const contentStyle: React.CSSProperties = {
  padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px'
};

const sectionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '12px'
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em'
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px'
};

const inputGroupStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: '4px'
};

const inputLabelStyle: React.CSSProperties = {
  fontSize: '10px', color: '#444', textAlign: 'center'
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#252526', border: '1px solid #333', borderRadius: '6px',
  padding: '8px 10px', color: '#fff', fontSize: '13px', outline: 'none', width: '100%', textAlign: 'center'
};

const colorInputStyle: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2
};

const colorPreviewStyle: React.CSSProperties = {
  width: '100%', height: '100%', borderRadius: '6px', border: '1px solid #333'
};

const rangeInputStyle: React.CSSProperties = {
  width: '100%', cursor: 'pointer', height: '32px'
};

const presetButtonStyle: React.CSSProperties = {
  padding: '8px', borderRadius: '8px', fontSize: '11px', 
  border: '1px solid', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', transition: 'background-color 0.2s',
  backgroundColor: 'rgba(255,255,255,0.02)'
};

const iconCircleStyle: React.CSSProperties = {
  width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const toggleStyle: React.CSSProperties = {
  width: '32px', height: '18px', borderRadius: '9px', padding: '2px',
  transition: 'background-color 0.2s'
};

const toggleHandleStyle: React.CSSProperties = {
  width: '14px', height: '14px', backgroundColor: '#fff', borderRadius: '50%',
  transition: 'transform 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
};

const footerStyle: React.CSSProperties = {
  padding: '20px 24px', backgroundColor: '#181818', borderTop: '1px solid #2d2d2d',
  display: 'flex', justifyContent: 'flex-end', gap: '12px'
};

const confirmButtonStyle: React.CSSProperties = {
  backgroundColor: '#007acc', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '10px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 122, 204, 0.3)'
};

const cancelButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent', color: '#888', border: '1px solid #333',
  borderRadius: '8px', padding: '10px 24px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#444', cursor: 'pointer',
  padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', transition: 'color 0.2s'
};
