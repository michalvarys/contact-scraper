import { LocalStorage, FileInfo } from '@contact-scraper/storage';
import { BusinessImage } from '@contact-scraper/types';
import path from 'path';
import dotenv from 'dotenv';

type UploadableFile = Buffer | Uint8Array | { arrayBuffer: () => Promise<ArrayBuffer> };

// Načtení proměnných prostředí
dotenv.config();

const storageBaseDir = process.env.STORAGE_BASE_DIR || '../storage-data';
const storagePublicUrl = process.env.STORAGE_PUBLIC_URL || '/storage';

export const localStorage = LocalStorage.fromEnv({
  baseDir: storageBaseDir,
  publicUrl: storagePublicUrl,
});

localStorage.ensureBaseDir().catch((error) => {
  console.error('Chyba při vytváření lokálního úložiště:', error);
});

function toBusinessImage(fileInfo: FileInfo, imageType: string): BusinessImage {
  return {
    url: fileInfo.url,
    path: fileInfo.path,
    type: imageType,
    uploadedAt: fileInfo.uploadedAt,
  };
}

/**
 * Nahraje soubor do lokálního úložiště a vrátí informace o obrázku
 *
 * @param file Buffer nebo Blob souboru k nahrání
 * @param options Možnosti nahrávání
 * @returns Informace o nahraném obrázku
 */
export async function uploadFile(
  file: UploadableFile,
  options: {
    folderPath?: string;
    fileName?: string;
    imageType?: string;
    contentType?: string;
    metadata?: Record<string, string>;
  } = {},
): Promise<BusinessImage> {
  try {
    const {
      folderPath = 'businesses',
      fileName,
      imageType = 'photo',
      contentType,
    } = options;

    const fileInfo: FileInfo = await localStorage.uploadFile(file, {
      folderPath,
      fileName,
      contentType,
    });

    return toBusinessImage(fileInfo, imageType);
  } catch (error) {
    console.error('Chyba při nahrávání souboru:', error);
    throw error;
  }
}

/**
 * Nahraje obrázek z URL do lokálního úložiště
 *
 * @param imageUrl URL obrázku k nahrání
 * @param options Možnosti nahrávání
 * @returns Informace o nahraném obrázku
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  options: {
    folderPath?: string;
    fileName?: string;
    imageType?: string;
    metadata?: Record<string, string>;
  } = {},
): Promise<BusinessImage> {
  try {
    const { folderPath = 'businesses', fileName, imageType = 'photo' } = options;

    const fileInfo: FileInfo = await localStorage.uploadFromUrl(imageUrl, {
      folderPath,
      fileName,
    });

    return toBusinessImage(fileInfo, imageType);
  } catch (error) {
    console.error('Chyba při nahrávání obrázku z URL:', error);
    throw error;
  }
}

/**
 * Nahraje screenshot z Puppeteer do lokálního úložiště
 *
 * @param screenshot Buffer screenshotu
 * @param businessId ID firmy
 * @param options Možnosti nahrávání
 * @returns Informace o nahraném obrázku
 */
export async function uploadScreenshot(
  screenshot: Buffer,
  businessId: string,
  options: {
    imageType?: string;
    suffix?: string;
  } = {},
): Promise<BusinessImage> {
  const { imageType = 'screenshot', suffix = '' } = options;

  const fileName = `${businessId}${suffix ? '-' + suffix : ''}.png`;
  const folderPath = path.join('businesses', businessId, 'screenshots');

  return uploadFile(screenshot, {
    folderPath,
    fileName,
    imageType,
    contentType: 'image/png',
    metadata: {
      businessId,
    },
  });
}

/**
 * Nahraje náhled webové stránky do lokálního úložiště
 *
 * @param thumbnail Buffer nebo URL náhledu
 * @param businessId ID firmy
 * @returns Informace o nahraném obrázku
 */
export async function uploadWebsiteThumbnail(
  thumbnail: Buffer | string,
  businessId: string,
): Promise<BusinessImage> {
  try {
    const folderPath = path.join('businesses', businessId, 'website');
    const fileName = 'thumbnail.png';

    if (typeof thumbnail === 'string' && thumbnail.startsWith('http')) {
      // Pokud je thumbnail URL, použijeme uploadImageFromUrl
      return uploadImageFromUrl(thumbnail, {
        folderPath,
        fileName,
        imageType: 'thumbnail',
      });
    } else {
      // Jinak použijeme uploadFile s Buffer
      return uploadFile(thumbnail as Buffer, {
        folderPath,
        fileName,
        imageType: 'thumbnail',
        contentType: 'image/png',
      });
    }
  } catch (error) {
    console.error('Chyba při nahrávání náhledu webu:', error);
    throw error;
  }
}

/**
 * Smaže obrázek z lokálního úložiště
 *
 * @param imagePath Cesta k obrázku v bucketu
 * @returns true pokud byl obrázek úspěšně smazán
 */
export async function deleteImage(imagePath: string): Promise<boolean> {
  try {
    return await localStorage.deleteFile(imagePath);
  } catch (error) {
    console.error('Chyba při mazání obrázku:', error);
    throw error;
  }
}

/**
 * Smaže všechny obrázky firmy
 *
 * @param businessId ID firmy
 * @returns true pokud byly obrázky úspěšně smazány
 */
export async function deleteBusinessImages(businessId: string): Promise<boolean> {
  try {
    const folderPath = path.join('businesses', businessId);
    return await localStorage.deleteFolder(folderPath);
  } catch (error) {
    console.error('Chyba při mazání obrázků firmy:', error);
    throw error;
  }
}
