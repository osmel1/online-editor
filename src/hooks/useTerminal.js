import { useRef, useEffect } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

/**
 * Hook to manage terminal setup and resize handling
 */
export default function useTerminal({ webcontainerInstance }) {
  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const shellProcess = useRef(null);
  const fitAddon = useRef(new FitAddon());

  // Setup terminal once webcontainer is ready
  useEffect(() => {
    if (!webcontainerInstance || !terminalRef.current || terminalInstance.current) return;

    const terminal = new Terminal({ convertEol: true });

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

  return { 
    terminalRef,
    terminalInstance,
    shellProcess,
    fitAddon
  };
}