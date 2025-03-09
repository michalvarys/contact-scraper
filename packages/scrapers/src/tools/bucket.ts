import { SupabaseStorage, FileInfo } from '@contact-scraper/storage';
import { BusinessImage } from '@contact-scraper/types';
import path from 'path';
import dotenv from 'dotenv';

// Načtení proměnných prostředí
dotenv.config();

// Kontrola, zda jsou nastaveny potřebné proměnné prostředí
if (!process.env.SUPABASE_URL) {
  console.error('Chyba: Proměnná prostředí SUPABASE_URL není nastavena');
  console.error('Ujistěte se, že máte správně nakonfigurovaný .env soubor');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('Chyba: Proměnná prostředí SUPABASE_SERVICE_KEY není nastavena');
  console.error('Ujistěte se, že máte správně nakonfigurovaný .env soubor');
}

export const supabaseStorage = new SupabaseStorage({
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
  bucketName: 'images',
});

// Inicializace bucketu (pouze pokud jsou nastaveny proměnné prostředí)
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabaseStorage.initBucket(true).catch(console.error);
}

/**
 * Nahraje soubor do Supabase Storage a vrátí informace o obrázku
 *
 * @param file Buffer nebo Blob souboru k nahrání
 * @param options Možnosti nahrávání
 * @returns Informace o nahraném obrázku
 */
export async function uploadFile(
  file: Buffer | Blob | File,
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
      metadata,
    } = options;

    // Nahrání souboru pomocí SupabaseStorage
    const fileInfo: FileInfo = await supabaseStorage.uploadFile(file, {
      folderPath,
      fileName,
      contentType,
      metadata: {
        ...metadata,
        imageType,
      },
    });

    // Převod na BusinessImage
    return {
      url: fileInfo.url,
      path: fileInfo.path,
      type: imageType,
      uploadedAt: fileInfo.uploadedAt,
    };
  } catch (error) {
    console.error('Chyba při nahrávání souboru:', error);
    throw error;
  }
}

/**
 * Nahraje obrázek z URL do Supabase Storage
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
    const { folderPath = 'businesses', fileName, imageType = 'photo', metadata } = options;

    // Nahrání souboru z URL pomocí SupabaseStorage
    const fileInfo: FileInfo = await supabaseStorage.uploadFromUrl(imageUrl, {
      folderPath,
      fileName,
      metadata: {
        ...metadata,
        imageType,
      },
    });

    // Převod na BusinessImage
    return {
      url: fileInfo.url,
      path: fileInfo.path,
      type: imageType,
      uploadedAt: fileInfo.uploadedAt,
    };
  } catch (error) {
    console.error('Chyba při nahrávání obrázku z URL:', error);
    throw error;
  }
}

/**
 * Nahraje screenshot z Puppeteer do Supabase Storage
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
 * Nahraje náhled webové stránky do Supabase Storage
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
        metadata: {
          businessId,
        },
      });
    } else {
      // Jinak použijeme uploadFile s Buffer
      return uploadFile(thumbnail as Buffer, {
        folderPath,
        fileName,
        imageType: 'thumbnail',
        contentType: 'image/png',
        metadata: {
          businessId,
        },
      });
    }
  } catch (error) {
    console.error('Chyba při nahrávání náhledu webu:', error);
    throw error;
  }
}

/**
 * Smaže obrázek z Supabase Storage
 *
 * @param imagePath Cesta k obrázku v bucketu
 * @returns true pokud byl obrázek úspěšně smazán
 */
export async function deleteImage(imagePath: string): Promise<boolean> {
  try {
    return await supabaseStorage.deleteFile(imagePath);
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
    return await supabaseStorage.deleteFolder(folderPath);
  } catch (error) {
    console.error('Chyba při mazání obrázků firmy:', error);
    throw error;
  }
}
