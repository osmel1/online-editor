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

function App() {
  const [webcontainerInstance, setWebcontainerInstance] = useState(null);
  const [currentFile, setCurrentFile] = useState("index.js");
  const [fileContent, setFileContent] = useState("");
  const [fileSystem, setFileSystem] = useState({});
  const [openFolders, setOpenFolders] = useState(new Set());
  const [iframeUrl, setIframeUrl] = useState("loading.html");
  const saveTimeout = useRef(null);
  const serverStarted = useRef(false);

  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const shellProcess = useRef(null);
  const fitAddon = useRef(new FitAddon());

  // create a file

  // Only show docs directory in file explorer
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
      const newFileSystem = await readDirectory("/my-docs2/docs/");
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
          terminal.write("Creating new Docusaurus project...\r\n");
          let process = await instance.spawn("npx", [
            "--yes", // Skip npx's own installation prompt
            "create-docusaurus@latest",
            "my-docs2",
            "classic",
            "--skip-install",
            "-j",
          ]);

          // Handle process output correctly
          process.output
            .pipeTo(
              new WritableStream({
                write(data) {
                  console.log("Data", data);
                  terminal.write(data);
                },
              })
            )
            .catch(console.error);

          // Handle process errors
          process.stderr
            .pipeTo(
              new WritableStream({
                write(data) {
                  console.log("Data", data);
                  terminal.write(`\x1b[31m${data}\x1b[0m`); // Write errors in red
                },
              })
            )
            .catch(console.error);

          // Wait for command to complete
          try {
            const exitCode = await process.exit;

            if (exitCode === 0) {
              terminal.write(
                "\r\nDocusaurus project created successfully!\r\n"
              );

              terminal.write("\r\nChanging to project directory...\r\n");
              process = await instance.spawn("cd", ["my-docs2"]);
              await process.exit;

              console.log("Changing to project directory");
              console.log("Installing dependencies");
              terminal.write(
                "\r\nInstalling dependencies (this may take a while)...\r\n"
              );
              process = await instance.spawn("npm", ["install"], {
                cwd: "/my-docs2",
              });

              // Handle npm install output
              process.output
                .pipeTo(
                  new WritableStream({
                    write(data) {
                      console.log("Data from npm install", data);
                      terminal.write(data);
                    },
                  })
                )
                .catch(console.error);

              process.stderr
                .pipeTo(
                  new WritableStream({
                    write(data) {
                      terminal.write(`\x1b[31m${data}\x1b[0m`);
                    },
                  })
                )
                .catch(console.error);

              await process.exit;

              terminal.write("\r\nDependencies installed successfully!\r\n");

              // Setup server ready listener BEFORE starting the server
              instance.on("server-ready", (port, url) => {
                console.log(`Server ready at port: ${port}, url: ${url}`);
                setIframeUrl(url);
                serverStarted.current = true;
                terminal.write(`\r\nServer started successfully at ${url}\r\n`);
              });

              // Step 4: Start the development server
              terminal.write("\r\nStarting development server...\r\n");
              process = await instance.spawn("npm", ["start"], {
                cwd: "/my-docs2",
              });

              process.output
                .pipeTo(
                  new WritableStream({
                    write(data) {
                      console.log("Data from npm start", data);
                      terminal.write(data);

                      // Check if server started from output
                      if (
                        data.includes("Docusaurus website is running at") &&
                        !serverStarted.current
                      ) {
                        const match = data.match(/http:\/\/localhost:(\d+)/);
                        if (match && match[0]) {
                          setIframeUrl(match[0]);
                          serverStarted.current = true;
                          console.log(
                            `Detected server URL from output: ${match[0]}`
                          );

                          // Now that the server is running, refresh the file tree to show the docs directory
                          refreshFileTree();
                        }
                      }
                    },
                  })
                )
                .catch(console.error);

              process.stderr
                .pipeTo(
                  new WritableStream({
                    write(data) {
                      terminal.write(`\x1b[31m${data}\x1b[0m`);
                    },
                  })
                )
                .catch(console.error);
            } else {
              terminal.write("\r\nError creating Docusaurus project\r\n");
            }
          } catch (error) {
            terminal.write(`\r\nError: ${error.message}\r\n`);
          }

          // Start the interactive shell
          // await startShell(terminal);
        }

        // Initial file content
        // if (files["index.js"]?.file?.contents) {
        //   setFileContent(files["index.js"].file.contents);
        // }
      } catch (error) {
        console.error("Failed to boot WebContainer:", error);
        if (terminalInstance.current) {
          terminalInstance.current.write(`\r\nError: ${error.message}\r\n`);
        }
      }
    }

    bootWebContainer();
    return () => {
      webcontainerInstance?.teardown();
    };
  }, [refreshFileTree]);

  const startShell = useCallback(
    async (terminal) => {
      if (!webcontainerInstance) return;

      try {
        const process = await webcontainerInstance.spawn("jsh", {
          terminal: {
            cols: terminal.cols,
            rows: terminal.rows,
          },
          cwd: "/my-docs2/docs/", // Start shell in the docs directory
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

//    startShell(terminal);

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
