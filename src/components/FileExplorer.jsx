import React, { useState, useEffect } from "react";

import "./FileExplorer.css";
import { EyeClosed, File, Folder, ExternalLink } from "lucide-react";

function FileExplorer({
  fileSystem,
  openFolders,
  onToggleFolder,
  onSelectFile,
  currentFile,
  onCreateFile,
  onCreateFolder,
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentFolderPath, setCurrentFolderPath] = useState("/my-docs2/docs/");
  useEffect(() => {
    if (currentFile) {
      // Extract the directory path from the current file path
      const lastSlashIndex = currentFile.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        const folderPath = currentFile.substring(0, lastSlashIndex + 1);
        setCurrentFolderPath(folderPath);
      }
    }
  }, [currentFile]);

  const handleFolderClick = (folderPath) => {
    // Update the current folder path and toggle folder open/closed
    setCurrentFolderPath(folderPath + '/');
    console.log(folderPath);
    onToggleFolder(folderPath);
  };


  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };
  const renderFileTree = (fs, pathPrefix = "") => {
    return Object.keys(fs).map((name) => {
      const fullPath = pathPrefix === "" ? `/${name}` : `${pathPrefix}/${name}`;

      if (fs[name].directory) {
        const isOpen = openFolders.has(fullPath);
        const depth = fullPath.split("/").filter(Boolean).length - 1;

        return (
          <div key={fullPath} className="directory-container">
            <div
              className="directory-item"
              style={{ paddingLeft: `${depth * 16}px` }}
              onClick={() => handleFolderClick(fullPath)}
            >
              <span className="folder-icon">{isOpen ? "📂" : "📁"}</span> {name}
            </div>
            {isOpen && (
              <div className="folder-content">
                {renderFileTree(fs[name].directory, fullPath)}
              </div>
            )}
          </div>
        );
      } else {
        const depth = fullPath.split("/").filter(Boolean).length - 1;

        return (
          <div
            key={fullPath}
            className={`file-item ${
              fullPath === currentFile ? "active-file" : ""
            }`}
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
    <div>
      <button className="toggle-button" onClick={toggleVisibility}>
        {!isVisible ? <EyeClosed /> : <ExternalLink />}
      </button>
      <button className="toggle-button" onClick={onCreateFile}>
        <File />
      </button>
      <button className="toggle-button" onClick={onCreateFolder}>
        <Folder />
      </button>

      <div className={`file-explorer ${!isVisible ? "collapsed" : ""}`}>
        <div className="file-explorer-header"></div>
        {isVisible && (
          <div className="file-tree">{renderFileTree(fileSystem)}</div>
        )}
      </div>
    </div>
  );
}

export default FileExplorer;
