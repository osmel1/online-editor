import { RxDatabase } from "rxdb";
import { getDatabase } from "../db";

interface FileManagementService {
  insertIntoFile(filePath: string, content: string): Promise<void>;
}
abstract class FileManagementBase implements FileManagementService {
  async insertIntoFile(filePath: string, content: string): Promise<void> {
    const db = await getDatabase();
    if (!db) {
      console.error("Database is not defined !!!!");
      return;
    }
    await this.performUpsert(db, filePath, content);
  }
    protected abstract performUpsert(db: RxDatabase, filePath: string, content: string): Promise<void>;
}

class FileManagement extends FileManagementBase {
    protected async performUpsert(db: RxDatabase, filePath: string, content: string): Promise<void> {
        await db.files.upsert({
            path: filePath,
            content: content,
        });
    }
}

class FileManagementIncrementale extends FileManagementBase {
  protected async performUpsert(db: RxDatabase, filePath: string, content: string): Promise<void> {
        await db.files.incrementalUpsert({
            path: filePath,
            content: content,
        });
    }
}

export {  FileManagementBase, FileManagement, FileManagementIncrementale };
