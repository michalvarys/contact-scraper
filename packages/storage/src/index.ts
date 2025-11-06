import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { ReadStream, createReadStream } from 'fs';

export interface LocalStorageConfig {
  /**
   * Cesta ke kořenové složce, kam se budou soubory ukládat
   */
  baseDir: string;
  /**
   * Veřejná URL cesta (např. `/storage`), která se vrací klientovi
   */
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

type BlobLike = { arrayBuffer: () => Promise<ArrayBuffer> };
type FileLike = Buffer | Uint8Array | BlobLike;

/**
 * Jednoduchá implementace ukládání souborů na lokální disk.
 */
export class LocalStorage {
  private readonly baseDir: string;
  private readonly publicUrl: string;

  constructor(config: LocalStorageConfig) {
    this.baseDir = this.resolveBaseDir(config.baseDir);
    this.publicUrl = (config.publicUrl || '/storage').replace(/\/+$/, '');
  }

  /**
   * Zajistí, že základní složka existuje.
   */
  async ensureBaseDir(): Promise<void> {
    await fsPromises.mkdir(this.baseDir, { recursive: true });
  }

  /**
   * Nahraje soubor na disk a vrátí informace o uloženém souboru.
   */
  async uploadFile(file: FileLike, options: UploadFileOptions = {}): Promise<FileInfo> {
    const folder = options.folderPath ? this.sanitizeRelativePath(options.folderPath) : '';
    const fileName = options.fileName || randomUUID();
    const normalizedFileName = this.sanitizeFileName(fileName);
    const relativePath = path.posix.join(folder, normalizedFileName);
    const absolutePath = this.resolveAbsolutePath(relativePath);

    await fsPromises.mkdir(path.dirname(absolutePath), { recursive: true });

    const buffer = await this.toBuffer(file);
    await fsPromises.writeFile(absolutePath, buffer);

    const stats = await fsPromises.stat(absolutePath);
    const fileType = options.contentType || this.detectMimeType(relativePath);

    return {
      url: this.buildPublicUrl(relativePath),
      path: relativePath,
      id: normalizedFileName,
      size: stats.size,
      fileType,
      uploadedAt: stats.mtime,
    };
  }

  /**
   * Stáhne soubor z URL a uloží ho na disk.
   */
  async uploadFromUrl(url: string, options: UploadFileOptions = {}): Promise<FileInfo> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Chyba při stahování souboru z ${url}: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || undefined;
    const arrayBuffer = await response.arrayBuffer();

    if (!options.fileName) {
      const inferredName = this.inferFileNameFromUrl(url, contentType);
      options.fileName = inferredName;
    }

    return this.uploadFile(Buffer.from(arrayBuffer), {
      ...options,
      contentType,
    });
  }

  /**
   * Vrátí informace o souboru, pokud existuje.
   */
  async getFileInfo(relativePath: string): Promise<FileInfo | null> {
    const sanitized = this.sanitizeRelativePath(relativePath);
    const absolutePath = this.resolveAbsolutePath(sanitized);

    try {
      const stats = await fsPromises.stat(absolutePath);
      const fileType = this.detectMimeType(sanitized);

      return {
        url: this.buildPublicUrl(sanitized),
        path: sanitized,
        id: path.posix.basename(sanitized),
        size: stats.size,
        fileType,
        uploadedAt: stats.mtime,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Odstraní konkrétní soubor.
   */
  async deleteFile(relativePath: string): Promise<boolean> {
    const sanitized = this.sanitizeRelativePath(relativePath);
    const absolutePath = this.resolveAbsolutePath(sanitized);

    try {
      await fsPromises.unlink(absolutePath);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Odstraní celou složku se soubory.
   */
  async deleteFolder(folderPath: string): Promise<boolean> {
    const sanitized = this.sanitizeRelativePath(folderPath);
    const absolutePath = this.resolveAbsolutePath(sanitized);

    try {
      await fsPromises.rm(absolutePath, { recursive: true, force: true });
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Vrátí ReadStream pro daný soubor.
   */
  createReadStream(relativePath: string): ReadStream {
    const sanitized = this.sanitizeRelativePath(relativePath);
    const absolutePath = this.resolveAbsolutePath(sanitized);

    if (!fs.existsSync(absolutePath)) {
      throw new Error('Soubor nebyl nalezen');
    }

    return createReadStream(absolutePath);
  }

  /**
   * Vrátí absolutní cestu k souboru (bez kontroly existence).
   */
  getAbsolutePath(relativePath: string): string {
    const sanitized = this.sanitizeRelativePath(relativePath);
    return this.resolveAbsolutePath(sanitized);
  }

  /**
   * Vrátí MIME typ odvozený z přípony souboru.
   */
  detectMimeType(relativePath: string): string {
    const extension = path.posix.extname(relativePath).toLowerCase();
    return extensionToMime[extension] || 'application/octet-stream';
  }

  /**
   * Pomocná metoda pro vytvoření veřejné URL.
   */
  buildPublicUrl(relativePath: string): string {
    const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
    return `${this.publicUrl}/${encodedPath}`.replace(/\/+/g, '/');
  }

  /**
   * Vytvoří instanci LocalStorage na základě prostředí.
   */
  static fromEnv(overrides: Partial<LocalStorageConfig> = {}): LocalStorage {
    const baseDir = overrides.baseDir || process.env.STORAGE_BASE_DIR || '../storage-data';
    const publicUrl = overrides.publicUrl || process.env.STORAGE_PUBLIC_URL || '/storage';

    const resolvedBaseDir = path.isAbsolute(baseDir)
      ? baseDir
      : path.resolve(process.cwd(), baseDir);

    return new LocalStorage({
      baseDir: resolvedBaseDir,
      publicUrl,
    });
  }

  private resolveBaseDir(baseDir: string): string {
    if (path.isAbsolute(baseDir)) {
      return baseDir;
    }
    return path.resolve(process.cwd(), baseDir);
  }

  private resolveAbsolutePath(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }

  private sanitizeRelativePath(p: string): string {
    const sanitizedInput = p.replace(/\\/g, '/');
    const normalized = path.posix.normalize(sanitizedInput).replace(/^(\.\.\/)+/, '');
    return normalized.replace(/^\//, '');
  }

  private sanitizeFileName(name: string): string {
    const baseName = path.posix.basename(name);
    return baseName.replace(/[^\w.\-]/g, '_');
  }

  private async toBuffer(file: FileLike): Promise<Buffer> {
    if (Buffer.isBuffer(file)) {
      return file;
    }

    if (file instanceof Uint8Array) {
      return Buffer.from(file);
    }

    if (file && typeof (file as BlobLike).arrayBuffer === 'function') {
      const arrayBuffer = await (file as BlobLike).arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw new Error('Nepodporovaný typ souboru pro nahrání');
  }

  private inferFileNameFromUrl(fileUrl: string, contentType?: string | null): string {
    try {
      const parsed = new URL(fileUrl);
      const fileName = path.posix.basename(parsed.pathname);

      if (fileName && fileName !== '/') {
        return fileName;
      }
    } catch (error) {
      // Ignorujeme chybu, použijeme fallback níže
    }

    const extension = contentType ? mimeToExtension[contentType] : '';
    return `${randomUUID()}${extension}`;
  }
}

const mimeToExtension: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'application/pdf': '.pdf',
  'application/json': '.json',
  'text/plain': '.txt',
};

const extensionToMime: Record<string, string> = Object.entries(mimeToExtension).reduce<
  Record<string, string>
>((acc, [mime, ext]) => {
  acc[ext] = mime;
  return acc;
}, {});

extensionToMime['.jpeg'] = 'image/jpeg';
