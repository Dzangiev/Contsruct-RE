import React from 'react';
import { PLUGIN_DEFINITIONS, PluginDefinition } from '../../model/definitions';
import { Image, Grid, Type, Search, X } from 'lucide-react';
import { ObjectTypeKind } from '../../model/project';

interface InsertObjectDialogProps {
  onSelect: (kind: ObjectTypeKind, name: string) => void;
  onClose: () => void;
}

export const InsertObjectDialog: React.FC<InsertObjectDialogProps> = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedPlugin, setSelectedPlugin] = React.useState<PluginDefinition | null>(null);
  const [objectName, setObjectName] = React.useState('');

  const filteredPlugins = PLUGIN_DEFINITIONS.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'image': return <Image size={32} />;
      case 'grid': return <Grid size={32} />;
      case 'type': return <Type size={32} />;
      default: return <Image size={32} />;
    }
  };

  const handleConfirm = () => {
    if (selectedPlugin && objectName.trim()) {
      onSelect(selectedPlugin.kind as ObjectTypeKind, objectName.trim());
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Create New Object Type</h3>
          <button onClick={onClose} style={closeButtonStyle}><X size={20} /></button>
        </div>

        <div style={contentStyle}>
          <div style={leftPanelStyle}>
            <div style={searchContainerStyle}>
              <Search size={14} style={searchIconStyle} />
              <input 
                autoFocus
                placeholder="Search plugins..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={searchInputStyle}
              />
            </div>
            
            <div style={pluginGridStyle}>
              {filteredPlugins.map(plugin => (
                <div 
                  key={plugin.kind}
                  onClick={() => {
                    setSelectedPlugin(plugin);
                    setObjectName(plugin.name);
                  }}
                  style={{
                    ...pluginCardStyle,
                    borderColor: selectedPlugin?.kind === plugin.kind ? '#007acc' : '#444',
                    backgroundColor: selectedPlugin?.kind === plugin.kind ? 'rgba(0, 122, 204, 0.1)' : 'transparent'
                  }}
                >
                  <div style={{ color: selectedPlugin?.kind === plugin.kind ? '#007acc' : '#888' }}>
                    {getIcon(plugin.icon)}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '8px' }}>{plugin.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={rightPanelStyle}>
            {selectedPlugin ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <div style={labelStyle}>Plugin</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{selectedPlugin.name}</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '5px', lineHeight: '1.4' }}>{selectedPlugin.description}</div>
                </div>

                <div>
                  <div style={labelStyle}>Object Name</div>
                  <input 
                    value={objectName}
                    onChange={e => setObjectName(e.target.value)}
                    style={nameInputStyle}
                    placeholder="Enter name..."
                  />
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <button 
                    disabled={!objectName.trim()}
                    onClick={handleConfirm}
                    style={{
                      ...confirmButtonStyle,
                      opacity: objectName.trim() ? 1 : 0.5,
                      cursor: objectName.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Insert
                  </button>
                </div>
              </div>
            ) : (
              <div style={emptyRightStyle}>
                <Image size={48} style={{ opacity: 0.1, marginBottom: '10px' }} />
                <div>Select an object type to see details</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3000
};

const modalStyle: React.CSSProperties = {
  width: '700px',
  height: '500px',
  backgroundColor: '#1e1e1e',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  border: '1px solid #333',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '15px 20px',
  borderBottom: '1px solid #333',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#252526',
  color: '#fff'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '5px'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden'
};

const leftPanelStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #333',
  padding: '20px'
};

const rightPanelStyle: React.CSSProperties = {
  width: '250px',
  padding: '20px',
  backgroundColor: '#252526',
  display: 'flex',
  flexDirection: 'column'
};

const searchContainerStyle: React.CSSProperties = {
  position: 'relative',
  marginBottom: '20px'
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#666'
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#2d2d2d',
  border: '1px solid #444',
  borderRadius: '4px',
  padding: '8px 12px 8px 32px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none'
};

const pluginGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: '12px',
  overflowY: 'auto'
};

const pluginCardStyle: React.CSSProperties = {
  border: '1px solid #444',
  borderRadius: '6px',
  padding: '15px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'center',
  color: '#d4d4d4'
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  textTransform: 'uppercase',
  color: '#888',
  fontWeight: 'bold',
  marginBottom: '5px'
};

const nameInputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1e1e1e',
  border: '1px solid #444',
  borderRadius: '4px',
  padding: '8px 10px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none'
};

const confirmButtonStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#007acc',
  color: '#fff',
  border: 'none',
  padding: '12px',
  borderRadius: '4px',
  fontWeight: 'bold',
  fontSize: '14px',
  marginTop: '20px'
};

const emptyRightStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#666',
  fontSize: '12px',
  textAlign: 'center'
};
