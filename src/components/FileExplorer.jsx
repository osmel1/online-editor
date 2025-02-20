import React from 'react';
import './FileExplorer.css';

function FileExplorer({ fileSystem, openFolders, onToggleFolder, onSelectFile, currentFile }) {
  const renderFileTree = (fs, pathPrefix = '') => {
    return Object.keys(fs).map(name => {
      const fullPath = pathPrefix === '' ? `/${name}` : `${pathPrefix}/${name}`;
      
      if (fs[name].directory) {
        const isOpen = openFolders.has(fullPath);
        const depth = fullPath.split('/').filter(Boolean).length - 1;
        
        return (
          <div key={fullPath} className="directory-container">
            <div 
              className="directory-item"
              style={{ paddingLeft: `${depth * 16}px` }}
              onClick={() => onToggleFolder(fullPath)}
            >
              <span className="folder-icon">{isOpen ? '📂' : '📁'}</span> {name}
            </div>
            {isOpen && (
              <div className="folder-content">
                {renderFileTree(fs[name].directory, fullPath)}
              </div>
            )}
          </div>
        );
      } else {
        const depth = fullPath.split('/').filter(Boolean).length - 1;
        
        return (
          <div 
            key={fullPath}
            className={`file-item ${fullPath === currentFile ? 'active-file' : ''}`}
            style={{ paddingLeft: `${depth * 16}px` }}
            onClick={() => onSelectFile(fs[name].path)}
          >
            <span className="file-icon">📄</span> {name}
          </div>
        );
      }
    });
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">Explorer</div>
      <div className="file-tree">
        {renderFileTree(fileSystem)}
      </div>
    </div>
  );
}

export default FileExplorer;