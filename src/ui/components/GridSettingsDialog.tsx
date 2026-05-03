import React from 'react';
import { X, Grid, Zap, Eye, EyeOff } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

interface GridSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GridSettingsDialog: React.FC<GridSettingsDialogProps> = ({ isOpen, onClose }) => {
  const { editorState, setGridSettings } = useEditorStore();
  const { gridSizeW, gridSizeH, snapToGrid, showGrid } = editorState;

  const [w, setW] = React.useState(gridSizeW);
  const [h, setH] = React.useState(gridSizeH);

  // Sync with store if it changes externally
  React.useEffect(() => {
    setW(gridSizeW);
    setH(gridSizeH);
  }, [gridSizeW, gridSizeH]);

  if (!isOpen) return null;

  const presets = [8, 16, 32, 64, 128];

  const handleApply = () => {
    setGridSettings(w, h, snapToGrid, showGrid);
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
            <Grid size={18} color="#007acc" />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Grid Settings</span>
          </div>
          <button onClick={onClose} style={closeButtonStyle}><X size={18} /></button>
        </div>
        
        <div style={contentStyle}>
          <div style={sectionStyle}>
            <label style={labelStyle}>Grid Size</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={inputGroupStyle}>
                <span style={inputLabelStyle}>Width</span>
                <input 
                  type="number" 
                  value={w} 
                  onChange={e => setW(Number(e.target.value))} 
                  style={inputStyle}
                  min={1}
                />
              </div>
              <div style={inputGroupStyle}>
                <span style={inputLabelStyle}>Height</span>
                <input 
                  type="number" 
                  value={h} 
                  onChange={e => setH(Number(e.target.value))} 
                  style={inputStyle}
                  min={1}
                />
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Presets</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {presets.map(p => (
                <button 
                  key={p} 
                  onClick={() => handlePreset(p)}
                  style={{
                    ...presetButtonStyle,
                    backgroundColor: (w === p && h === p) ? '#007acc' : '#3e3e42',
                    borderColor: (w === p && h === p) ? '#40a9ff' : 'transparent'
                  }}
                >
                  {p}x{p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...sectionStyle, borderBottom: 'none', paddingBottom: 0 }}>
             <label style={labelStyle}>Options</label>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div 
                  style={toggleRowStyle} 
                  onClick={() => setGridSettings(undefined, undefined, !snapToGrid)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Zap size={16} color={snapToGrid ? '#ffcc00' : '#888'} />
                    <span style={{ fontSize: '13px', color: snapToGrid ? '#fff' : '#aaa' }}>Snap to grid</span>
                  </div>
                  <div style={{ ...toggleStyle, backgroundColor: snapToGrid ? '#007acc' : '#444' }}>
                    <div style={{ ...toggleHandleStyle, transform: snapToGrid ? 'translateX(14px)' : 'translateX(0)' }} />
                  </div>
                </div>

                <div 
                  style={toggleRowStyle} 
                  onClick={() => setGridSettings(undefined, undefined, undefined, !showGrid)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {showGrid ? <Eye size={16} color="#4caf50" /> : <EyeOff size={16} color="#888" />}
                    <span style={{ fontSize: '13px', color: showGrid ? '#fff' : '#aaa' }}>Show grid</span>
                  </div>
                  <div style={{ ...toggleStyle, backgroundColor: showGrid ? '#007acc' : '#444' }}>
                    <div style={{ ...toggleHandleStyle, transform: showGrid ? 'translateX(14px)' : 'translateX(0)' }} />
                  </div>
                </div>
             </div>
          </div>
        </div>
        
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelButtonStyle}>Close</button>
          <button onClick={handleApply} style={confirmButtonStyle}>Apply Settings</button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10000, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#252526', borderRadius: '12px', width: '360px',
  boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255,255,255,0.1)',
  border: '1px solid #454545', display: 'flex', flexDirection: 'column',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex',
  alignItems: 'center', justifyContent: 'space-between', color: '#fff'
};

const contentStyle: React.CSSProperties = {
  padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px'
};

const sectionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '10px',
  paddingBottom: '16px', borderBottom: '1px solid #333'
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em'
};

const inputGroupStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: '6px'
};

const inputLabelStyle: React.CSSProperties = {
  fontSize: '11px', color: '#888'
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e', border: '1px solid #3e3e42', borderRadius: '4px',
  padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none', width: '100%'
};

const presetButtonStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: '#fff',
  border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  cursor: 'pointer', padding: '4px 0'
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
  padding: '16px 20px', backgroundColor: '#1e1e1e', borderTop: '1px solid #333',
  display: 'flex', justifyContent: 'flex-end', gap: '10px'
};

const confirmButtonStyle: React.CSSProperties = {
  backgroundColor: '#007acc', color: '#fff', border: 'none', borderRadius: '6px',
  padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
};

const cancelButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444',
  borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#666', cursor: 'pointer',
  padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px'
};
