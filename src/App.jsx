import React, { useState, useEffect, useRef, useCallback } from "react";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { files } from "./files";
import FileExplorer from "./components/FileExplorer";
import Editor from "./components/Editor";
import DefaultEditor from "./components/DefaultEditor";
import Preview from "./components/Preview";
import "./App.css";
import LoadingScreen from "./components/LoadingScreen";
import { setupDocusaurusProject } from "./utils/functions";

function App() {
  const [webcontainerInstance, setWebcontainerInstance] = useState(null);
  const [currentFile, setCurrentFile] = useState("index.js");
  const [fileContent, setFileContent] = useState("");
  const [fileSystem, setFileSystem] = useState({});
  const [openFolders, setOpenFolders] = useState(new Set());
  const [iframeUrl, setIframeUrl] = useState("loading.html");
  const bootAttempted = useRef(false);
  const saveTimeout = useRef(null);
  const serverStarted = useRef(false);

  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const shellProcess = useRef(null);
  const fitAddon = useRef(new FitAddon());

  // create a file
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Initializing WebContainer...");
  const [setupProgress, setSetupProgress] = useState(0);
 
  const readDirectory = useCallback(
    async (path = "/my-docs2/docs/") => {
      if (!webcontainerInstance) return {};

      try {
        const entries = await webcontainerInstance.fs.readdir(path, {
          withFileTypes: true,
        });

        const result = {};

        for (const entry of entries) {
          if (entry.name.startsWith(".")) continue; // Skip hidden files

          const fullPath = `${path}${entry.name}`;

          if (entry.isDirectory()) {
            result[entry.name] = {
              directory: await readDirectory(`${fullPath}/`),
              path: fullPath,
            };
          } else {
            try {
              const contents = await webcontainerInstance.fs.readFile(
                fullPath,
                "utf-8"
              );
              result[entry.name] = {
                file: { contents },
                path: fullPath,
              };
            } catch (error) {
              console.error(`Error reading file ${fullPath}:`, error);
              result[entry.name] = {
                file: { contents: "" },
                path: fullPath,
              };
            }
          }
        }

        return result;
      } catch (error) {
        console.error(`Error reading directory ${path}:`, error);
        return {};
      }
    },
    [webcontainerInstance]
  );

  const refreshFileTree = useCallback(async () => {
    if (!webcontainerInstance) return;

    try {
      // Check if the folder exists
      await webcontainerInstance.fs.readdir("/my-docs2/docs/");
  
      // If the folder exists, read its contents
      const newFileSystem = await readDirectory("/my-docs2/docs/");
      setFileSystem(newFileSystem);
    } catch (error) {
      if (error) {
        console.warn("Folder does not exist yet:", "/my-docs2/docs/");
      }
    }
  }, [webcontainerInstance, readDirectory]);

  // Boot WebContainer
  useEffect(() => {
    if (webcontainerInstance) return;

    async function bootWebContainer() {
      if (bootAttempted.current) return;
      bootAttempted.current = true;

      try {
        setLoadingStage("Initializing WebContainer...");
        setSetupProgress(5);

        const instance = await WebContainer.boot();
        setWebcontainerInstance(instance);
        setSetupProgress(10);

        // Create terminal instance early
        const terminal = new Terminal({
          convertEol: true,
        });

        if (terminalRef.current) {
          console.log("Terminal created");
          terminal.loadAddon(fitAddon.current);
          terminal.open(terminalRef.current);
          fitAddon.current.fit();
          terminalInstance.current = terminal;
          
          // Use the extracted function to set up Docusaurus
          await setupDocusaurusProject(
            instance,
            terminal,
            setLoadingStage,
            setSetupProgress,
            setIframeUrl,
            serverStarted,
            refreshFileTree,
            setIsLoading
          );
        }
      } catch (error) {
        console.error("Failed to boot WebContainer:", error);
        // Reset boot flag to allow retry
        bootAttempted.current = false;
        if (terminalInstance.current) {
          terminalInstance.current.write(`\r\nError: ${error.message}\r\n`);
        }
      }
    }
    
    if (!webcontainerInstance && !bootAttempted.current) {
      bootWebContainer();
    }
    
    return () => {
      webcontainerInstance?.teardown();
    };
  }, [refreshFileTree]);

  // Setup terminal once webcontainer is ready
  useEffect(() => {
    if (!webcontainerInstance || !terminalRef.current || terminalInstance.current) return;

    const terminal = new Terminal({
      convertEol: true,
    });
    console.log("call Terminal creation");

    terminal.loadAddon(fitAddon.current);
    terminal.open(terminalRef.current);
    fitAddon.current.fit();
    terminalInstance.current = terminal;

    const handleResize = () => {
      fitAddon.current.fit();
      if (shellProcess.current) {
        shellProcess.current.resize({
          cols: terminal.cols,
          rows: terminal.rows,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [webcontainerInstance]);

  useEffect(() => {
    if (!webcontainerInstance) return;

    // Initial file tree load
    setTimeout(refreshFileTree, 1000);

    // Set up watching only the docs directory for changes
    const watchCleanup = webcontainerInstance.fs.watch(
      "/my-docs2/docs/",
      { recursive: true },
      async () => {
        await refreshFileTree();
      }
    );

    return () => {
      if (watchCleanup) watchCleanup();
    };
  }, [webcontainerInstance, refreshFileTree]);

  async function loadFile(path) {
    if (!webcontainerInstance) return;

    try {
      const content = await webcontainerInstance.fs.readFile(path, "utf-8");
      setFileContent(content);
      setCurrentFile(path);
    } catch (error) {
      console.error(`Error loading file ${path}:`, error);
    }
  }

  const saveFileChanges = useCallback(
    async (newContent) => {
      if (!webcontainerInstance || !currentFile) return;

      // Clear previous timeout if the user is still typing
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }

      // Set a new timeout to save only if no changes happen for 500ms
      saveTimeout.current = setTimeout(async () => {
        try {
          console.log(`Saving file ${currentFile}...`);
          await webcontainerInstance.fs.writeFile(currentFile, newContent);
          console.log("File saved successfully!");
        } catch (error) {
          console.error(`Error saving file ${currentFile}:`, error);
        }
      }, 500); // Delay before saving
    },
    [webcontainerInstance, currentFile]
  );
  
  const createFile = useCallback(
    async (path = "/my-docs2/docs/") => {
      if (!webcontainerInstance) return;

      try {
        const fileName = prompt("Enter file name:");
        if (!fileName) return;

        const basePath = "/my-docs2/docs/";
        const filePath = `${basePath}${fileName}`;
        console.log("Creating file:", filePath);
        // Create the file with empty content
        await webcontainerInstance.fs.writeFile(filePath, "");

        // Refresh the file tree to show the new file
        await refreshFileTree();

        // Load the new file in the editor
        await loadFile(filePath);

        // Write a message to the terminal
        if (terminalInstance.current) {
          terminalInstance.current.write(`\r\nCreated file: ${filePath}\r\n`);
        }
      } catch (error) {
        console.error("Error creating file:", error);
        if (terminalInstance.current) {
          terminalInstance.current.write(
            `\r\nError creating file: ${error.message}\r\n`
          );
        }
      }
    },
    [webcontainerInstance, refreshFileTree, loadFile]
  );

  const createFolder = useCallback(
    async (path = "/my-docs2/docs/") => {
      if (!webcontainerInstance) return;

      try {
        const folderName = prompt("Enter folder name:");
        if (!folderName) return;
        const basePath = "/my-docs2/docs/";
        const filePath = `${basePath}${folderName}`;
        console.log("Creating file:", filePath);

        // Create the directory
        await webcontainerInstance.fs.mkdir(filePath, { recursive: true });

        // Refresh the file tree to show the new folder
        await refreshFileTree();

        // Open the new folder in the file explorer
        setOpenFolders((prevOpenFolders) => {
          const newOpenFolders = new Set(prevOpenFolders);
          newOpenFolders.add(filePath);
          return newOpenFolders;
        });

        // Write a message to the terminal
        if (terminalInstance.current) {
          terminalInstance.current.write(
            `\r\nCreated folder: ${filePath}\r\n`
          );
        }
      } catch (error) {
        console.error("Error creating folder:", error);
        if (terminalInstance.current) {
          terminalInstance.current.write(
            `\r\nError creating folder: ${error.message}\r\n`
          );
        }
      }
    },
    [webcontainerInstance, refreshFileTree]
  );

  function toggleFolder(path) {
    setOpenFolders((prevOpenFolders) => {
      const newOpenFolders = new Set(prevOpenFolders);
      if (newOpenFolders.has(path)) {
        newOpenFolders.delete(path);
      } else {
        newOpenFolders.add(path);
      }
      return newOpenFolders;
    });
  }

  function checkIfMDFile() {
    if (
      currentFile.endsWith(".md") ||
      currentFile.endsWith(".mdx") ||
      currentFile.endsWith(".markdown")
    ) {
      return true;
    }
    return false;
  }

  function renderEditorBasedOnFileType() {
    const isMdFile = checkIfMDFile();
    if (isMdFile) {
      return (
        <Editor
          value={fileContent}
          onChange={(newContent) => {
            setFileContent(newContent);
            saveFileChanges(newContent);
          }}
        />
      );
    } else {
      return (
        <DefaultEditor
          fileName={currentFile}
          value={fileContent}
          onChange={(newContent) => {
            setFileContent(newContent);
            saveFileChanges(newContent);
          }}
        />
      );
    }
  }

  return (
    <div className="app-container">
      {isLoading && (
        <LoadingScreen stage={loadingStage} progress={setupProgress} />
      )}
      <div className="editor-container ">
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
      <div className="terminal-container" ref={terminalRef}></div>
    </div>
  );
}

export default App;