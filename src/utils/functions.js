/**
 * Utility function to handle process output streams
 * @param {ReadableStream} stream - Stream to handle
 * @param {Terminal} terminal - Terminal to write to
 * @param {Function} callback - Optional callback with processed data
 * @param {boolean} isError - Whether this is an error stream
 * @returns {Promise} - Promise that resolves when the stream ends
 */
const handleProcessStream = (stream, terminal, callback = null, isError = false) => {
  return stream.pipeTo(
    new WritableStream({
      write(data) {
        // Log data
        //console.log(isError ? "Error data:" : "Data:", data);
        
        // Write to terminal with red color for errors
        if (isError) {
          terminal.write(`\x1b[31m${data}\x1b[0m`);
        } else {
          terminal.write(data);
        }
        
        // Call callback if provided
        if (callback) {
          callback(data);
        }
      },
    })
  ).catch(error => {
    console.error(`Stream error: ${error.message}`);
    terminal.write(`\r\n\x1b[31mStream error: ${error.message}\x1b[0m\r\n`);
  });
};

/**
 * Creates a new Docusaurus project
 */
export const createDocusaurusProject = async (
  instance,
  terminal,
  setLoadingStage,
  setSetupProgress
) => {
  try {
    setLoadingStage("Creating new Docusaurus project...");
    setSetupProgress(20);
    terminal.write("Creating new Docusaurus project...\r\n");

    const process = await instance.spawn("npx", [
      "--yes",
      "create-docusaurus@latest",
      "my-docs2",
      "classic",
      "--skip-install",
      "-j",
    ]);

    // Handle process output and errors
    handleProcessStream(process.output, terminal);
    handleProcessStream(process.stderr, terminal, null, true);

    // Wait for command to complete
    const exitCode = await process.exit;
    
    if (exitCode === 0) {
      terminal.write("\r\nDocusaurus project created successfully!\r\n");
      return true;
    } else {
      terminal.write(`\r\nError creating Docusaurus project (exit code: ${exitCode})\r\n`);
      return false;
    }
  } catch (error) {
    terminal.write(`\r\nError creating Docusaurus project: ${error.message}\r\n`);
    return false;
  }
};

/**
 * Changes to the project directory
 */
export const changeToProjectDirectory = async (
  instance,
  terminal,
  setLoadingStage,
  setSetupProgress
) => {
  try {
    setLoadingStage("Changing to project directory...");
    setSetupProgress(45);
    terminal.write("\r\nChanging to project directory...\r\n");
    
    const process = await instance.spawn("cd", ["my-docs2"]);
    await process.exit;
    
    console.log("Changed to project directory");
    return true;
  } catch (error) {
    terminal.write(`\r\nError changing directory: ${error.message}\r\n`);
    return false;
  }
};

/**
 * Installs project dependencies
 */
export const installDependencies = async (
  instance,
  terminal,
  setLoadingStage,
  setSetupProgress
) => {
  try {
    setLoadingStage("Installing dependencies (this may take a while)...");
    setSetupProgress(50);
    terminal.write("\r\nInstalling dependencies (this may take a while)...\r\n");
    
    const process = await instance.spawn("npm", ["install"], {
      cwd: "/my-docs2",
    });

    // Update progress when dependencies are being added
    const progressCallback = (data) => {
      if (data.includes("added")) {
        setSetupProgress(75);
      }
    };

    // Handle npm install output and errors
    handleProcessStream(process.output, terminal, progressCallback);
    handleProcessStream(process.stderr, terminal, null, true);

    const exitCode = await process.exit;
    
    if (exitCode === 0) {
      terminal.write("\r\nDependencies installed successfully!\r\n");
      setSetupProgress(80);
      return true;
    } else {
      terminal.write(`\r\nError installing dependencies (exit code: ${exitCode})\r\n`);
      return false;
    }
  } catch (error) {
    terminal.write(`\r\nError installing dependencies: ${error.message}\r\n`);
    return false;
  }
};

/**
 * Starts the development server
 */
export const startDevServer = async (
  instance,
  terminal,
  setLoadingStage,
  setSetupProgress,
  setIframeUrl,
  serverStarted,
  refreshFileTree,
  setIsLoading
) => {
  try {
    setLoadingStage("Starting development server...");
    setSetupProgress(85);
    terminal.write("\r\nStarting development server...\r\n");
    
    const process = await instance.spawn("npm", ["start"], {
      cwd: "/my-docs2",
    });

    // Process server output to detect when it's ready
    const serverOutputCallback = (data) => {
      // Check if server started from output
      if (data.includes("Docusaurus website is running at") && !serverStarted.current) {
        const match = data.match(/http:\/\/localhost:(\d+)/);
        if (match && match[0]) {
          setIframeUrl(match[0]);
          serverStarted.current = true;
          console.log(`Detected server URL from output: ${match[0]}`);
          setLoadingStage("Loading website...");
          setSetupProgress(95);
          
          // Now that the server is running, refresh the file tree to show the docs directory
          refreshFileTree();

          setTimeout(() => {
            setIsLoading(false);
            setSetupProgress(100);
          }, 2000);
        }
      }
    };

    // Handle server output and errors
    handleProcessStream(process.output, terminal, serverOutputCallback);
    handleProcessStream(process.stderr, terminal, null, true);
      
    return true;
  } catch (error) {
    terminal.write(`\r\nError starting development server: ${error.message}\r\n`);
    return false;
  }
};

/**
 * Sets up server-ready event listener
 */
export const setupServerReadyListener = (
  instance,
  terminal,
  setIframeUrl,
  serverStarted,
  setLoadingStage,
  setSetupProgress
) => {
  instance.on("server-ready", (port, url) => {
    console.log(`Server ready at port: ${port}, url: ${url}`);
    setIframeUrl(url);
    serverStarted.current = true;
    terminal.write(`\r\nServer started successfully at ${url}\r\n`);
    setLoadingStage("Setup complete!");
    setSetupProgress(100);
  });
};

/**
 * Main function to setup a Docusaurus project
 */
export const setupDocusaurusProject = async (
  instance,
  terminal,
  setLoadingStage,
  setSetupProgress,
  setIframeUrl,
  serverStarted,
  refreshFileTree,
  setIsLoading
) => {
  try {
    // Step 1: Create Docusaurus project
    const projectCreated = await createDocusaurusProject(
      instance, 
      terminal, 
      setLoadingStage, 
      setSetupProgress
    );
    if (!projectCreated) {
      throw new Error("Failed to create Docusaurus project");
    }

    // Step 2: Change to project directory
    const dirChanged = await changeToProjectDirectory(
      instance, 
      terminal, 
      setLoadingStage, 
      setSetupProgress
    );
    if (!dirChanged) {
      throw new Error("Failed to change to project directory");
    }

    // Step 3: Install dependencies
    const dependenciesInstalled = await installDependencies(
      instance, 
      terminal, 
      setLoadingStage, 
      setSetupProgress
    );
    if (!dependenciesInstalled) {
      throw new Error("Failed to install dependencies");
    }

    // Setup server ready listener BEFORE starting the server
    setupServerReadyListener(
      instance, 
      terminal, 
      setIframeUrl, 
      serverStarted, 
      setLoadingStage, 
      setSetupProgress
    );

    // Step 4: Start development server
    const serverStartedSuccessfully = await startDevServer(
      instance,
      terminal,
      setLoadingStage,
      setSetupProgress,
      setIframeUrl,
      serverStarted,
      refreshFileTree,
      setIsLoading
    );
    if (!serverStartedSuccessfully) {
      throw new Error("Failed to start development server");
    }
  } catch (error) {
    console.error("Error setting up Docusaurus project:", error);
    terminal.write(`\r\n\x1b[31mSetup error: ${error.message}\x1b[0m\r\n`);
    setLoadingStage("Setup failed: " + error.message);
  }
};