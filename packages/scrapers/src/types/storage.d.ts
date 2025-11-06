declare module '@contact-scraper/storage' {
  export interface LocalStorageConfig {
    baseDir: string;
    publicUrl?: string;
  }

  export interface UploadFileOptions {
    folderPath?: string;
    fileName?: string;
    contentType?: string;
  }

  export interface FileInfo {
    url: string;
    path: string;
    id: string;
    size: number;
    fileType: string;
    uploadedAt: Date;
  }

  export class LocalStorage {
    constructor(config: LocalStorageConfig);

    ensureBaseDir(): Promise<void>;

    uploadFile(file: Buffer | Blob | File, options?: UploadFileOptions): Promise<FileInfo>;

    uploadFromUrl(imageUrl: string, options?: UploadFileOptions): Promise<FileInfo>;

    getFileInfo(filePath: string): Promise<FileInfo | null>;

    deleteFile(filePath: string): Promise<boolean>;

    deleteFolder(folderPath: string): Promise<boolean>;

    createReadStream(relativePath: string): NodeJS.ReadableStream;

    getAbsolutePath(relativePath: string): string;

    detectMimeType(relativePath: string): string;

    buildPublicUrl(relativePath: string): string;

    static fromEnv(overrides?: Partial<LocalStorageConfig>): LocalStorage;
  }
}
