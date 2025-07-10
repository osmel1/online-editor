import React, { useState, useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import "./App.css";

// Components
import FileExplorer from "./components/FileExplorer";
import Preview from "./components/Preview";
import LoadingScreen from "./components/LoadingScreen";

// Hooks
import useWebContainer from "./hooks/useWebContainer";
import useTerminal from "./hooks/useTerminal";
import useFileSystem from "./hooks/useFileSystem";
import useEditor from "./hooks/useEditor";

//TODO: Compatibiliy beetween docusaurus and MdxEditor

function App() {
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Initializing WebContainer...");
  const [setupProgress, setSetupProgress] = useState(0);
  
  // WebContainer and Terminal setup
  const { webcontainerInstance, iframeUrl } = useWebContainer({
    setLoadingStage,
    setSetupProgress,
    setIsLoading
  });
  
  const { terminalRef } = useTerminal({ webcontainerInstance });
  
  // File system management
  const { 
    fileSystem, 
    openFolders, 
    toggleFolder,
    createFile,
    createFolder
  } = useFileSystem({ webcontainerInstance });
  
  // Editor state management
  const {
    currentFile,
    fileContent,
    loadFile,
    saveFileChanges,
    renderEditorBasedOnFileType
  } = useEditor({ webcontainerInstance });

  return (
    <div className="app-container">
      {isLoading && (
        <LoadingScreen stage={loadingStage} progress={setupProgress} />
      )}
      <div className="editor-container">
        <FileExplorer
          fileSystem={fileSystem}
          openFolders={openFolders}
          onToggleFolder={toggleFolder}
          onSelectFile={loadFile}
          currentFile={currentFile}
          onCreateFile={createFile}
          onCreateFolder={createFolder}
        />

        {renderEditorBasedOnFileType()}
        <Preview url={iframeUrl} />
        
      </div>
    </div>
  );
}

export default App;