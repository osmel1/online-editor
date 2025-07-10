import { createRxDatabase, addRxPlugin, RxDatabase } from "rxdb";
// import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { fileSchema } from "./Schema";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
// import { RxDBValidatePlugin } from 'rxdb/plugins/validate';
// import { getRxStoragePouch, addPouchPlugin } from 'rxdb/plugins/pouchdb';
// import * as PouchdbAdapterIdb from 'pouchdb-adapter-idb';

import { getRxStorageDexie } from "rxdb/plugins/storage-dexie"; // Uses IndexedDB

import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";
import { FileManagement, FileManagementBase, FileManagementIncrementale } from "./services/fileManagement";
// Add plugins
// addRxPlugin(RxDBQueryBuilderPlugin);
// addRxPlugin(RxDBValidatePlugin);
// addPouchPlugin(PouchdbAdapterIdb);

addRxPlugin(RxDBDevModePlugin);

export async function initDatabase(): Promise<RxDatabase> {
  console.log("Creating database...");

  const db = await createRxDatabase({
    name: "editorDB",
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie(),
    }),
  });

  console.log("Database created");

  // Add collections
  await db.addCollections({
    files: {
      schema: fileSchema,
    },
  });
  console.log("Collections added");

  return db;
}

// Create a singleton instance of the database
let dbPromise: RxDatabase | null = null;
export const getDatabase = async () => {
  if (dbPromise) {
    console.log("Returning existing database instance");
    return dbPromise;
  }
  await initDatabase().then((db) => {
    dbPromise = db;
    console.log("Database initialized and ready to use");
  });

  return dbPromise;
};

export async function closeDatabase() {
  if (dbPromise) {
    console.log("Closing database...");
    await dbPromise.close();
    dbPromise = null;
    console.log("Database closed");
  } else {
    console.warn("No database instance to close");
  }
}

export async function saveIntoFile(filePath: string , content: string , incrementalUpsert: boolean = false) {
  const  fileManagementService : FileManagementBase =  incrementalUpsert ? new FileManagementIncrementale() : new FileManagement();
  if(!incrementalUpsert){
    fileManagementService.insertIntoFile(filePath, content);
  }else{
    fileManagementService.insertIntoFile(filePath, content);
  }
}