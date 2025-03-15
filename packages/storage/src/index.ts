import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

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
  private supabaseClient;
  private bucketName: string;

  constructor(config: SupabaseStorageConfig) {
    this.supabaseClient = createClient(config.supabaseUrl, config.supabaseKey);
    this.bucketName = config.bucketName;
  }

  /**
   * Inicializuje bucket - vytvoří ho, pokud neexistuje
   */
  async initBucket(isPublic: boolean = true): Promise<void> {
    const { error } = await this.supabaseClient.storage.getBucket(this.bucketName);

    if (error && error.message.includes('The resource was not found')) {
      const { error: createError } = await this.supabaseClient.storage.createBucket(
        this.bucketName,
        { public: isPublic },
      );

      if (createError) {
        throw new Error(`Chyba při vytváření bucketu: ${createError.message}`);
      }
    } else if (error) {
      throw new Error(`Chyba při kontrole bucketu: ${error.message}`);
    }
  }

  /**
   * Nahraje soubor do S3 bucketu a vrátí informace o nahraném souboru
   */
  async uploadFile(file: Buffer | Blob | File, options: UploadFileOptions = {}): Promise<FileInfo> {
    const {
      folderPath = '',
      fileName = uuidv4(),
      contentType,
      metadata,
      cacheControl = '3600',
    } = options;

    const filePath = path.join(folderPath, fileName).replace(/\\/g, '/');

    const { data, error } = await this.supabaseClient.storage
      .from(this.bucketName)
      .upload(filePath, file, {
        contentType,
        cacheControl,
        upsert: true,
        ...(metadata ? { metadata } : {}),
      });

    if (error) {
      throw new Error(`Chyba při nahrávání souboru: ${error.message}`);
    }

    const { data: publicUrl } = this.supabaseClient.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return {
      url: publicUrl.publicUrl,
      path: filePath,
      id: data.id || fileName,
      size: 0,
      fileType: contentType || 'application/octet-stream',
      uploadedAt: new Date(),
    };
  }

  /**
   * Nahraje obrázek z URL přímo do S3 bucketu
   */
  async uploadFromUrl(imageUrl: string, options: UploadFileOptions = {}): Promise<FileInfo> {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`Chyba při stahování obrázku: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.arrayBuffer();

      // Pokud není zadán název souboru, vytvoříme ho z URL a přidáme příponu podle typu
      if (!options.fileName) {
        const urlObj = new URL(imageUrl);
        const urlPath = urlObj.pathname;
        const extension = path.extname(urlPath) || getExtensionFromContentType(contentType);
        const basename = path.basename(urlPath, path.extname(urlPath)) || uuidv4();
        options.fileName = `${basename}${extension}`;
      }

      // FIXME: špatný formát
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return this.uploadFile(new Uint8Array(buffer), { ...options, contentType });
    } catch (error: any) {
      throw new Error(`Chyba při nahrávání z URL: ${error.message}`);
    }
  }

  /**
   * Získá informace o souboru
   */
  async getFileInfo(filePath: string): Promise<FileInfo | null> {
    const { error } = await this.supabaseClient.storage.from(this.bucketName).download(filePath);

    if (error) {
      if (error.message.includes('The resource was not found')) {
        return null;
      }
      throw new Error(`Chyba při získávání souboru: ${error.message}`);
    }

    const { data: fileData } = await this.supabaseClient.storage
      .from(this.bucketName)
      .list(path.dirname(filePath), {
        search: path.basename(filePath),
      });

    const file = fileData?.[0];

    if (!file) {
      return null;
    }

    const { data: publicUrl } = this.supabaseClient.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return {
      url: publicUrl.publicUrl,
      path: filePath,
      id: file.id,
      size: file.metadata?.size || 0,
      fileType: file.metadata?.mimetype || 'application/octet-stream',
      uploadedAt: new Date(file.created_at),
    };
  }

  /**
   * Vymaže soubor z bucketu
   */
  async deleteFile(filePath: string): Promise<boolean> {
    const { error } = await this.supabaseClient.storage.from(this.bucketName).remove([filePath]);

    if (error) {
      throw new Error(`Chyba při mazání souboru: ${error.message}`);
    }

    return true;
  }

  /**
   * Vymaže soubory v daném adresáři
   */
  async deleteFolder(folderPath: string): Promise<boolean> {
    const { data, error } = await this.supabaseClient.storage
      .from(this.bucketName)
      .list(folderPath);

    if (error) {
      throw new Error(`Chyba při výpisu složky: ${error.message}`);
    }

    const filePaths = data.map((file) => `${folderPath}/${file.name}`);

    if (filePaths.length > 0) {
      const { error: deleteError } = await this.supabaseClient.storage
        .from(this.bucketName)
        .remove(filePaths);

      if (deleteError) {
        throw new Error(`Chyba při mazání souborů: ${deleteError.message}`);
      }
    }

    return true;
  }
}

// Pomocná funkce pro získání přípony souboru z MIME typu
function getExtensionFromContentType(contentType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
  };

  return mimeToExt[contentType] || '';
}
