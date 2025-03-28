import { useState, useRef, useEffect } from "react";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { setupDocusaurusProject } from "../utils/functions";
import { getDatabase } from "../db";
import { restoreFromRxDB, saveToRxDB } from "../Database";


/**
 * Hook to manage WebContainer instance and setup
 */
export default function useWebContainer({ setLoadingStage, setSetupProgress, setIsLoading }) {
  const [webcontainerInstance, setWebcontainerInstance] = useState(null);
  const [iframeUrl, setIframeUrl] = useState("loading.html");
  
  const bootAttempted = useRef(false);
  const serverStarted = useRef(false);
  const terminalInstance = useRef(null);

  // Boot WebContainer
  useEffect(() => {
    if (webcontainerInstance || bootAttempted.current) return;

    async function bootWebContainer() {
      bootAttempted.current = true;

      try {
        setLoadingStage("Initializing WebContainer...");
        setSetupProgress(5);

        const instance = await WebContainer.boot();
        setWebcontainerInstance(instance);
        setSetupProgress(10);

        // Create terminal instance early
        const terminal = new Terminal({ convertEol: true });
        const fitAddon = new FitAddon();
        
        terminal.loadAddon(fitAddon);
        terminalInstance.current = terminal;
        
        // Set up refreshFileTree function that will be passed to setupDocusaurusProject
        const refreshFileTree = async () => {
          try {
            // Check if the folder exists before trying to read it
           const res =  await instance.fs.readdir("/my-docs2/docs/");
           console.log("readdir result :  ",res)
            // Additional file system logic would go here
          } catch (error) {
            console.warn("Folder does not exist yet:", "/my-docs2/docs/");
          }
        };

        return { instance, terminal, fitAddon, refreshFileTree };
      } catch (error) {
        console.error("Failed to boot WebContainer:", error);
        bootAttempted.current = false;
        throw error;
      }
    }
    // should call it only in the first time
    bootWebContainer()
      .then(async ({ instance, terminal, fitAddon, refreshFileTree }) => {
        // setup only if the project is not already saved in the database
        const db = await getDatabase();
        const existingFiles = await db.files.find().exec();
    
    if (existingFiles.length === 0) {
        console.log("🚀 First-time setup: Initializing project...")
        await setupDocusaurusProject(
          instance,
          terminal,
          setLoadingStage,
          setSetupProgress,
          setIframeUrl,
          serverStarted,
          refreshFileTree,
          setIsLoading
        ).then(
          async ()=>{
            await saveToRxDB(instance.fs,db);
          }
        ).catch((error) => {
          console.error("WebContainer setup failed 2 :", error);
        }
        );
      }else {
        console.log("🔄 Restoring project from RxDB...");
        await restoreFromRxDB(instance.fs,db);
      }
      })
      .catch((error) => {
        console.error("WebContainer setup failed:", error);
        if (terminalInstance.current) {
          terminalInstance.current.write(`\r\nError: ${error.message}\r\n`);
        }
      });
    
    return () => {
      webcontainerInstance?.teardown();
    };
  }, [webcontainerInstance, setLoadingStage, setSetupProgress, setIframeUrl, setIsLoading]);

  return { webcontainerInstance, iframeUrl };
}