import { createRxDatabase, addRxPlugin } from 'rxdb';
// import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { fileSchema } from './Schema';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
// import { RxDBValidatePlugin } from 'rxdb/plugins/validate';
// import { getRxStoragePouch, addPouchPlugin } from 'rxdb/plugins/pouchdb';
// import * as PouchdbAdapterIdb from 'pouchdb-adapter-idb';

import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'; // Uses IndexedDB




import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
// Add plugins
// addRxPlugin(RxDBQueryBuilderPlugin);
// addRxPlugin(RxDBValidatePlugin);
// addPouchPlugin(PouchdbAdapterIdb);

addRxPlugin(RxDBDevModePlugin);

export async function initDatabase() {
  console.log('Creating database...');
  
  const db = await createRxDatabase({
    name: 'editorDB',
    storage: wrappedValidateAjvStorage({
        storage: getRxStorageDexie()
      })
});

  console.log('Database created');
  
  // Add collections
  await db.addCollections({
    files: {
      schema: fileSchema
    }
  });
  console.log('Collections added');
  
  return db;
}

// Create a singleton instance of the database
let dbPromise = null;
export const getDatabase = async () => {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
};
