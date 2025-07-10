import { useState, useRef, useCallback } from "react";
import Editor from "../components/Editor";
import DefaultEditor from "../components/DefaultEditor";
import { getDatabase, saveIntoFile } from "../db";
/**
 * Hook to manage editor state and operations
 */
export default function useEditor({ webcontainerInstance }) {
  const [currentFile, setCurrentFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const saveTimeout = useRef(null);

  // Load file content
  const loadFile = useCallback(
    async (path) => {
      if (!webcontainerInstance) return;

      try {
        const content = await webcontainerInstance.fs.readFile(path, "utf-8");
        setFileContent(content);
        setCurrentFile(path);
      } catch (error) {
        console.error(`Error loading file ${path}:`, error);
      }
    },
    [webcontainerInstance]
  );

  // Save file changes with debounce
  const saveFileChanges = useCallback(
    async (newContent) => {
      if (!webcontainerInstance || !currentFile) return;

      // Clear previous timeout if the user is still typing
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }

      saveTimeout.current = setTimeout(async () => {
        try {
          await webcontainerInstance.fs.writeFile(currentFile, newContent);
         saveIntoFile(currentFile, newContent, true); 
          console.log("File saved successfully!");
        } catch (error) {
          console.error(`Error saving file ${currentFile}:`, error);
        }
      }, 500); // Delay before saving
    },
    [webcontainerInstance, currentFile]
  );

  // Check if the current file is a markdown file
  const isMdFile = useCallback(() => {
    return (
      currentFile.endsWith(".md") ||
      currentFile.endsWith(".mdx") ||
      currentFile.endsWith(".markdown")
    );
  }, [currentFile]);

  // Render the appropriate editor based on file type
  const renderEditorBasedOnFileType = useCallback(() => {
    if (isMdFile()) {
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
  }, [currentFile, isMdFile]);

  return {
    currentFile,
    fileContent,
    setFileContent,
    loadFile,
    saveFileChanges,
    renderEditorBasedOnFileType,
  };
}
