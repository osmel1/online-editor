import { FileSystemAPI } from "@webcontainer/api";
import { RxDatabase, RxDocument } from "rxdb";

export async function saveToRxDB(fs: FileSystemAPI, db: RxDatabase) {
  console.log("📁 Saving files to RxDB...");
  // Read all files in the directory
  const files = await fs.readdir("/my-docs2/docs/", {
    withFileTypes: true,
  });

  // Create an array to store all file save operations
  const saveOperations = [];

  // Process each file or directory
  for (const fileName of files) {
    const path = `/my-docs2/docs/${fileName.name}`;
    console.log(`Processing ${path}...`);
    try {
      // Get file stats to determine if it's a file or directory

      if (fileName.isDirectory()) {
        // For directories, recursively process all files within
        const dirFiles = await processDirectoryFiles(fs, path,db);
        saveOperations.push(...dirFiles);
      } else {
        // Handle file - read content
        const content = await fs.readFile(path, "utf8");

        const document: Promise<RxDocument> = db.files.upsert({
          path: path,
          content: content,
        });
        saveOperations.push(document);
      }
    } catch (error) {
      console.error(`Error processing ${path}:`, error);
    }
  }

  // Execute all save operations
  for (const op of saveOperations) {
    console.log("File to be saved it may or not !!!"+op);
      op.then((result) => {
        if (result) {
          console.log(`✅ File saved: ${result.get("path")}`);
        } else {
          console.error(`❌ Failed to save file: ${op}`);
        }
      });
      console.log("One file saved to RxDB" + op);
  }
  console.log(`✅ ${saveOperations.length} files processed and saved to RxDB`);
  console.log("📁 All files processed successfully");
  console.log("✅ Files saved to RxDB");
}

async function processDirectoryFiles(
  fs: FileSystemAPI,
  dirPath: string,
  db: RxDatabase
): Promise<Promise<RxDocument>[]> {
  const contents = await fs.readdir(dirPath, {
    withFileTypes: true,
  });
  const fileOperations = [];

  for (const item of contents) {
    const itemPath = `${dirPath}/${item.name}`;

    if (item.isDirectory()) {
      // Recursively process subdirectories
       processDirectoryFiles(fs, itemPath,db);
    } else {
      console.log(`Processing file ${itemPath}...`);
      // Create file document
      const content = await fs.readFile(itemPath, "utf-8");
      const document: Promise<RxDocument> = db.files.upsert({
          path: itemPath,
          content: content,
        });
      fileOperations.push(document);
    }
  }

  return fileOperations;
}

export async function restoreFromRxDB(fs: FileSystemAPI, db: RxDatabase) {
  const allFiles = await db.files.find().exec();
  console.log("Files restored  from RxDB:", allFiles);
  for (const file of allFiles) {
    try {
      // Ensure the directory exists
      const dirPath = file.path.substring(0, file.path.lastIndexOf("/"));
      await fs.mkdir(dirPath, { recursive: true });

      // Write the file content
      await fs.writeFile(file.path, file.content, "utf8");
      console.log(`✅ Restored file: ${file.path}`);
    } catch (error) {
      console.error(`Error restoring file ${file.path}:`, error);
      continue; // Skip to the next file if there's an error
    }
  }
  console.log("✅ Files restored from RxDB to WebContainer");
}
