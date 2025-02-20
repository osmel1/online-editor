import React, { useState, useEffect, useRef, useCallback } from "react";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { files } from "./files";
import FileExplorer from "./components/FileExplorer";
import Editor from "./components/Editor";
import Preview from "./components/Preview";
import "./App.css";

function App() {
  const [webcontainerInstance, setWebcontainerInstance] = useState(null);
  const [currentFile, setCurrentFile] = useState("index.js");
  const [fileContent, setFileContent] = useState("");
  const [fileSystem, setFileSystem] = useState({});
  const [openFolders, setOpenFolders] = useState(new Set());
  const [iframeUrl, setIframeUrl] = useState("loading.html");
  const saveTimeout = useRef(null);

  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const shellProcess = useRef(null);
  const fitAddon = useRef(new FitAddon());

  const readDirectory = useCallback(
    async (path = "/") => {
      if (!webcontainerInstance) return {};

      try {
        const entries = await webcontainerInstance.fs.readdir(path, {
          withFileTypes: true,
        });
        const result = {};

        for (const entry of entries) {
          if (entry.name.startsWith(".")) continue; // Skip hidden files

          const fullPath =
            path === "/" ? `/${entry.name}` : `${path}/${entry.name}`;

          if (entry.isDirectory()) {
            result[entry.name] = {
              directory: await readDirectory(fullPath),
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
      const newFileSystem = await readDirectory("/");
      setFileSystem(newFileSystem);
    } catch (error) {
      console.error("Error refreshing file tree:", error);
    }
  }, [webcontainerInstance, readDirectory]);
  // Boot WebContainer
  useEffect(() => {
    if (webcontainerInstance) return;
    async function bootWebContainer() {
      try {
        const instance = await WebContainer.boot();
        setWebcontainerInstance(instance);
        await instance.mount(files);

        // Setup server ready listener
        instance.on("server-ready", (port, url) => {
          setIframeUrl(url);
        });

        // Initial file content
        if (files["index.js"]?.file?.contents) {
          setFileContent(files["index.js"].file.contents);
        }
      } catch (error) {
        console.error("Failed to boot WebContainer:", error);
      }
    }

    bootWebContainer();
    return () => {
      webcontainerInstance?.teardown(); // Cleanup memory when component unmounts
    };
  }, []);
  const startShell = useCallback(
    async (terminal) => {
      if (!webcontainerInstance) return;

      try {
        const process = await webcontainerInstance.spawn("jsh", {
          terminal: {
            cols: terminal.cols,
            rows: terminal.rows,
          },
        });

        if (shellProcess.current) {
          await shellProcess.current.kill();
        }

        shellProcess.current = process;

        process.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);

              // Check for commands that modify the file system
              if (
                data.includes("mkdir") ||
                data.includes("touch") ||
                data.includes("npm") ||
                data.includes("yarn") ||
                data.includes("rm") ||
                data.includes("cp") ||
                data.includes("mv")
              ) {
                setTimeout(refreshFileTree, 500);
              }
            },
          })
        );

        const input = process.input.getWriter();

        terminal.onData((data) => {
          input.write(data);

          // Check for Enter key to potentially run a command
          if (data === "\r") {
            setTimeout(refreshFileTree, 1000);
          }
        });
      } catch (error) {
        console.error("Failed to start shell:", error);
      }
    },
    [webcontainerInstance, refreshFileTree]
  );
  // Setup terminal once webcontainer is ready
  useEffect(() => {
    if (!webcontainerInstance || !terminalRef.current) return;

    const terminal = new Terminal({
      convertEol: true,
    });

    terminal.loadAddon(fitAddon.current);
    terminal.open(terminalRef.current);
    fitAddon.current.fit();
    terminalInstance.current = terminal;

    startShell(terminal);

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
  }, [webcontainerInstance, startShell]);

  // Refresh file system data when webcontainer is ready
  useEffect(() => {
    if (!webcontainerInstance) return;

    refreshFileTree();

    // Set up polling for file system changes
    webcontainerInstance.fs.watch("/", async () => {
      await refreshFileTree();
    });
  }, [webcontainerInstance, refreshFileTree]);

  async function loadFile(path) {
    if (!webcontainerInstance) return;

    try {
      if (fileSystem[path]?.file?.contents) {
        setFileContent(fileSystem[path].file.contents);
      } else {
        const content = await webcontainerInstance.fs.readFile(path, "utf-8");
        setFileContent(content);
      }
      setCurrentFile(path);
    } catch (error) {
      console.error(`Error loading file ${path}:`, error);
    }
  }

  // Save file changes
  async function saveFileChanges(content) {
    if (!webcontainerInstance || !currentFile) return;

    // Clear previous timeout if the user is still typing
    clearTimeout(saveTimeout.current);

    // Set a new timeout to save only if no changes happen for 1 second
    saveTimeout.current = setTimeout(async () => {
      try {
        await webcontainerInstance.fs.writeFile(currentFile, content);
        setFileContent(content);
        console.log("File saved successfully!");
      } catch (error) {
        console.error(`Error saving changes to ${currentFile}:`, error);
      }
    }, 1000); // Wait 1s after the last keystroke before saving
  }

  // Toggle folder open/closed state
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

  return (
    <div className="app-container">
      <div className="editor-container">
        <FileExplorer
          fileSystem={fileSystem}
          openFolders={openFolders}
          onToggleFolder={toggleFolder}
          onSelectFile={loadFile}
          currentFile={currentFile}
        />
        <Editor
          value={fileContent}
          onChange={(newContent) => {
            setFileContent(newContent); // Update state immediately for UI feedback
            saveFileChanges(newContent); // Debounced save
          }}
        />
        <Preview url={iframeUrl} />
      </div>
      <div className="terminal-container" ref={terminalRef}></div>
    </div>
  );
}

export default App;
