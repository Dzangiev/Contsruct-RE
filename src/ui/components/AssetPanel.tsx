import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Image, Music, FileText, Plus, Trash2, Upload, Search, Film } from 'lucide-react';
import { generateId } from '../../utils/id';

export const AssetPanel: React.FC = () => {
  const { project, addAsset, removeAsset } = useEditorStore();
  const [filter, setFilter] = React.useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      const type = file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('audio/') ? 'audio' : 
                   file.type.startsWith('video/') ? 'video' : 'font';
      
      addAsset({
        id: generateId(),
        name: file.name,
        type,
        data
      });
    };
    reader.readAsDataURL(file);
  };

  const filteredAssets = project.assets.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', height: '100%', borderTop: '1px solid #111' }}>
      <div style={{ 
        height: '28px', 
        backgroundColor: '#2d2d2d', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 8px', 
        justifyContent: 'space-between',
        borderBottom: '1px solid #111'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ccc', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <Image size={12} /> Asset Library
        </div>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Plus size={14} color="#ccc" />
          <input type="file" hidden onChange={handleFileUpload} accept="image/*,audio/*,video/*" />
        </label>
      </div>

      <div style={{ padding: '6px', borderBottom: '1px solid #111' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={10} color="#666" style={{ position: 'absolute', left: '6px' }} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ 
              width: '100%', 
              backgroundColor: '#121212', 
              border: '1px solid #333', 
              borderRadius: '2px', 
              color: '#eee', 
              fontSize: '10px', 
              padding: '4px 6px 4px 20px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
        {filteredAssets.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '10px' }}>
            No assets found.<br/>Click + to upload.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '4px' }}>
            {filteredAssets.map(asset => (
              <AssetItem key={asset.id} asset={asset} onRemove={() => removeAsset(asset.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AssetItem: React.FC<{ asset: any, onRemove: () => void }> = ({ asset, onRemove }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('assetId', asset.id);
    e.dataTransfer.setData('assetType', asset.type);
    e.dataTransfer.setData('assetData', asset.data);
    e.dataTransfer.setData('assetName', asset.name);
  };

  const getIcon = () => {
    switch (asset.type) {
      case 'audio': return <Music size={24} color="#3498db" />;
      case 'video': return <Film size={24} color="#e67e22" />;
      default: return <Image size={24} color="#2ecc71" />;
    }
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        position: 'relative',
        backgroundColor: '#252526',
        borderRadius: '4px',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        cursor: 'grab',
        border: '1px solid #333',
        transition: 'all 0.2s',
        boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
        borderColor: isHovered ? '#007acc' : '#333'
      }}
    >
      <div style={{ 
        width: '48px', 
        height: '48px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#121212',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        {asset.type === 'image' ? (
          <img src={asset.data} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="" />
        ) : getIcon()}
      </div>
      <div style={{ 
        fontSize: '9px', 
        color: '#ccc', 
        width: '100%', 
        textAlign: 'center', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis', 
        whiteSpace: 'nowrap' 
      }}>
        {asset.name}
      </div>
      
      {isHovered && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#ff4444',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
};
