import { useState, useCallback, useEffect } from "react";
import { saveIntoFile } from "../db";
/**
 * Hook to manage file system operations
 */
export default function useFileSystem({ webcontainerInstance }) {
  const [fileSystem, setFileSystem] = useState({});
  const [openFolders, setOpenFolders] = useState(new Set());

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
        console.log("Files Data");
        console.log(result);

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
      console.warn("Folder does not exist yet:", "/my-docs2/docs/");
    }
  }, [webcontainerInstance, readDirectory]);

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

  const toggleFolder = useCallback((path) => {
    setOpenFolders((prevOpenFolders) => {
      const newOpenFolders = new Set(prevOpenFolders);
      if (newOpenFolders.has(path)) {
        newOpenFolders.delete(path);
      } else {
        newOpenFolders.add(path);
      }
      return newOpenFolders;
    });
  }, []);

  const createFile = useCallback(
    async (path = "/my-docs2/docs/") => {
      if (!webcontainerInstance) return;

      try {
        const fileName = prompt("Enter file name:");
        if (!fileName) return;

        const basePath = "/my-docs2/docs/";
        const filePath = `${basePath}${fileName}`;

        // Create the file with empty content
        await webcontainerInstance.fs.writeFile(filePath, "");
        saveIntoFile(filePath, "");
        // Refresh the file tree to show the new file
        await refreshFileTree();

        return filePath;
      } catch (error) {
        console.error("Error creating file:", error);
        return null;
      }
    },
    [webcontainerInstance, refreshFileTree]
  );

  const createFolder = useCallback(
    async (path = "/my-docs2/docs/") => {
      if (!webcontainerInstance) return;

      try {
        const folderName = prompt("Enter folder name:");
        if (!folderName) return;

        const basePath = "/my-docs2/docs/";
        const folderPath = `${basePath}${folderName}`;

        // Create the directory
        await webcontainerInstance.fs.mkdir(folderPath, { recursive: true });

        // Refresh the file tree to show the new folder
        await refreshFileTree();

        // Open the new folder in the file explorer
        setOpenFolders((prevOpenFolders) => {
          const newOpenFolders = new Set(prevOpenFolders);
          newOpenFolders.add(folderPath);
          return newOpenFolders;
        });

        return folderPath;
      } catch (error) {
        console.error("Error creating folder:", error);
        return null;
      }
    },
    [webcontainerInstance, refreshFileTree]
  );

  return {
    fileSystem,
    openFolders,
    toggleFolder,
    createFile,
    createFolder,
    refreshFileTree,
  };
}
