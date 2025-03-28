
async function initializeProject(fs) {
    const  db = await getDatabase();
    // 1️⃣ Check if the project already exists in RxDB
    const existingFiles = await db.files.find().exec();
    
    if (existingFiles.length === 0) {
        console.log("🚀 First-time setup: Initializing project...");

        await setupDefaultProject(fs);

        await saveToRxDB(fs);
    } else {
        console.log("🔄 Restoring project from RxDB...");
        await restoreFromRxDB(fs);
    }
}



export async function saveToRxDB(fs, db) {
    console.log('📁 Saving files to RxDB...');
    // Read all files in the directory
    const files = await fs.readdir("/my-docs2/docs/" , {
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
          const dirFiles = await processDirectoryFiles(fs, path);
          saveOperations.push(...dirFiles);
        } else {
          // Handle file - read content
          const content = await fs.readFile(path, 'utf8');
          
          // Create document compatible with schema
          saveOperations.push(
            db.files.upsert({
              path: path,
              content: content,
            })
          );
        }
      } catch (error) {
        console.error(`Error processing ${path}:`, error);
      }
    }
    
    // Execute all save operations
    await Promise.all(saveOperations);

    console.log('✅ Files saved to RxDB');
  }
  
  async function processDirectoryFiles(fs, dirPath) {
    const contents = await fs.readdir(dirPath , {
        withFileTypes: true,
    });
    const fileOperations = [];
    
    for (const item of contents) {
      const itemPath = `${dirPath}/${item.name}`;
      
      if (item.isDirectory()) {
        // Recursively process subdirectories
        const subDirFiles = await processDirectoryFiles(fs, itemPath);
        fileOperations.push(...subDirFiles);
      } else {
        console.log(`Processing file ${itemPath}...`);
        // Create file document
        const content = await fs.readFile(itemPath, 'utf-8');
        
        fileOperations.push({
          path: itemPath,
          content: content,
        });
      }
    }
    
    return fileOperations;
  }

export async function restoreFromRxDB(fs,db) {
    const allFiles = await db.files.find().exec();
    for (const file of allFiles) {
        await fs.writeFile(file.path, file.content, 'utf8');
    }
    console.log('✅ Files restored from RxDB to WebContainer');
}
