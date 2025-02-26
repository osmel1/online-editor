// utils/functions.js

/**
 * Creates a new Docusaurus project
 * @param {WebContainer} instance - WebContainer instance
 * @param {Terminal} terminal - Terminal instance
 * @param {Function} setLoadingStage - Function to update loading stage text
 * @param {Function} setSetupProgress - Function to update progress percentage
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
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
        "--yes", // Skip npx's own installation prompt
        "create-docusaurus@latest",
        "my-docs2",
        "classic",
        "--skip-install",
        "-j",
      ]);
  
      // Handle process output
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
      const exitCode = await process.exit;
      
      if (exitCode === 0) {
        terminal.write("\r\nDocusaurus project created successfully!\r\n");
        return true;
      } else {
        terminal.write("\r\nError creating Docusaurus project\r\n");
        return false;
      }
    } catch (error) {
      terminal.write(`\r\nError creating Docusaurus project: ${error.message}\r\n`);
      return false;
    }
  };
  
  /**
   * Changes to the project directory
   * @param {WebContainer} instance - WebContainer instance
   * @param {Terminal} terminal - Terminal instance
   * @param {Function} setLoadingStage - Function to update loading stage text
   * @param {Function} setSetupProgress - Function to update progress percentage
   * @returns {Promise<boolean>} - Returns true if successful, false otherwise
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
   * @param {WebContainer} instance - WebContainer instance
   * @param {Terminal} terminal - Terminal instance
   * @param {Function} setLoadingStage - Function to update loading stage text
   * @param {Function} setSetupProgress - Function to update progress percentage
   * @returns {Promise<boolean>} - Returns true if successful, false otherwise
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
  
      // Handle npm install output
      process.output
        .pipeTo(
          new WritableStream({
            write(data) {
              console.log("Data from npm install", data);
              terminal.write(data);
              if (data.includes("added")) {
                setSetupProgress(75);
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
  
      const exitCode = await process.exit;
      
      if (exitCode === 0) {
        terminal.write("\r\nDependencies installed successfully!\r\n");
        setSetupProgress(80);
        return true;
      } else {
        terminal.write("\r\nError installing dependencies\r\n");
        return false;
      }
    } catch (error) {
      terminal.write(`\r\nError installing dependencies: ${error.message}\r\n`);
      return false;
    }
  };
  
  /**
   * Starts the development server
   * @param {WebContainer} instance - WebContainer instance
   * @param {Terminal} terminal - Terminal instance
   * @param {Function} setLoadingStage - Function to update loading stage text
   * @param {Function} setSetupProgress - Function to update progress percentage
   * @param {Function} setIframeUrl - Function to update iframe URL
   * @param {Object} serverStarted - Ref object to track if server has started
   * @param {Function} refreshFileTree - Function to refresh file tree
   * @param {Function} setIsLoading - Function to update loading state
   * @returns {Promise<boolean>} - Returns true if successful, false otherwise
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
  
      process.output
        .pipeTo(
          new WritableStream({
            write(data) {
              console.log("Data from npm start", data);
              terminal.write(data);
  
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
        
      return true;
    } catch (error) {
      terminal.write(`\r\nError starting development server: ${error.message}\r\n`);
      return false;
    }
  };
  
  /**
   * Sets up server-ready event listener
   * @param {WebContainer} instance - WebContainer instance
   * @param {Terminal} terminal - Terminal instance
   * @param {Function} setIframeUrl - Function to update iframe URL
   * @param {Object} serverStarted - Ref object to track if server has started
   * @param {Function} setLoadingStage - Function to update loading stage text
   * @param {Function} setSetupProgress - Function to update progress percentage
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
   * @param {WebContainer} instance - WebContainer instance
   * @param {Terminal} terminal - Terminal instance
   * @param {Function} setLoadingStage - Function to update loading stage text
   * @param {Function} setSetupProgress - Function to update progress percentage
   * @param {Function} setIframeUrl - Function to update iframe URL
   * @param {Object} serverStarted - Ref object to track if server has started
   * @param {Function} refreshFileTree - Function to refresh file tree
   * @param {Function} setIsLoading - Function to update loading state
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
      if (!projectCreated) return;
  
      // Step 2: Change to project directory
      const dirChanged = await changeToProjectDirectory(
        instance, 
        terminal, 
        setLoadingStage, 
        setSetupProgress
      );
      if (!dirChanged) return;
  
      // Step 3: Install dependencies
      const dependenciesInstalled = await installDependencies(
        instance, 
        terminal, 
        setLoadingStage, 
        setSetupProgress
      );
      if (!dependenciesInstalled) return;
  
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
      await startDevServer(
        instance,
        terminal,
        setLoadingStage,
        setSetupProgress,
        setIframeUrl,
        serverStarted,
        refreshFileTree,
        setIsLoading
      );
    } catch (error) {
      console.error("Error setting up Docusaurus project:", error);
      terminal.write(`\r\nError: ${error.message}\r\n`);
    }
  };