declare module '@contact-scraper/storage' {
  export interface SupabaseStorageConfig {
    supabaseUrl: string;
    supabaseKey: string;
    bucketName: string;
  }

  export interface UploadFileOptions {
    folderPath?: string;
    fileName?: string;
    contentType?: string;
    metadata?: Record<string, string>;
    cacheControl?: string;
  }

  export interface FileInfo {
    url: string;
    path: string;
    id: string;
    size: number;
    fileType: string;
    uploadedAt: Date;
  }

  export class SupabaseStorage {
    constructor(config: SupabaseStorageConfig);

    initBucket(isPublic?: boolean): Promise<void>;

    uploadFile(file: Buffer | Blob | File, options?: UploadFileOptions): Promise<FileInfo>;

    uploadFromUrl(imageUrl: string, options?: UploadFileOptions): Promise<FileInfo>;

    getFileInfo(filePath: string): Promise<FileInfo | null>;

    deleteFile(filePath: string): Promise<boolean>;

    deleteFolder(folderPath: string): Promise<boolean>;
  }
}
