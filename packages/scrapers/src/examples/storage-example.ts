/**
 * Příklad použití lokálního úložiště souborů
 */
import { BusinessImage } from '@contact-scraper/types';
import {
  uploadFile,
  uploadImageFromUrl,
  uploadScreenshot,
  uploadWebsiteThumbnail,
  deleteImage,
  deleteBusinessImages,
} from '../tools/bucket';
import { prisma } from '@contact-scraper/db';
import * as fs from 'fs/promises';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    console.log('Spouštím příklad použití lokálního úložiště...');

    // ID firmy pro testování
    const businessId = 'test-business-123';

    // 1. Nahrání obrázku z lokálního souboru
    console.log('\n1. Nahrávání obrázku z lokálního souboru...');
    try {
      // Vytvoření testovacího obrázku, pokud neexistuje
      const testImagePath = path.join(__dirname, 'test-image.png');
      try {
        await fs.access(testImagePath);
      } catch (e) {
        // Vytvoření jednoduchého textového souboru jako náhrada za obrázek pro testování
        console.log('Vytvářím testovací obrázek...');

        // V Node.js prostředí nemůžeme použít DOM API, proto vytvoříme jednoduchý buffer
        // V reálném použití by zde byl skutečný obrázek z Puppeteer nebo jiného zdroje
        const buffer = Buffer.from('Test image content');
        await fs.writeFile(testImagePath, buffer);

        console.log('Testovací obrázek vytvořen');
      }

      // Načtení testovacího obrázku
      const imageBuffer = await fs.readFile(testImagePath);

      // Nahrání obrázku do lokálního úložiště
      const uploadedImage: BusinessImage = await uploadFile(imageBuffer, {
        folderPath: `websites/${businessId}/images`,
        fileName: 'test-image.png',
        imageType: 'logo',
        contentType: 'image/png',
      });

      console.log('Obrázek úspěšně nahrán:', uploadedImage);

      // 2. Nahrání obrázku z URL
      console.log('\n2. Nahrávání obrázku z URL...');
      const imageUrl = 'https://picsum.photos/200/300'; // Náhodný obrázek z Lorem Picsum
      const uploadedImageFromUrl: BusinessImage = await uploadImageFromUrl(imageUrl, {
        folderPath: `businesses/${businessId}/images`,
        fileName: 'image-from-url.jpg',
        imageType: 'photo',
      });

      console.log('Obrázek z URL úspěšně nahrán:', uploadedImageFromUrl);

      // 3. Simulace nahrání screenshotu
      console.log('\n3. Nahrávání screenshotu...');
      const screenshotBuffer = imageBuffer; // Pro testování použijeme stejný buffer
      const uploadedScreenshot: BusinessImage = await uploadScreenshot(
        screenshotBuffer,
        businessId,
        {
          imageType: 'screenshot',
          suffix: 'homepage',
        },
      );

      console.log('Screenshot úspěšně nahrán:', uploadedScreenshot);

      // 4. Simulace nahrání náhledu webové stránky
      console.log('\n4. Nahrávání náhledu webové stránky...');
      const thumbnailBuffer = imageBuffer; // Pro testování použijeme stejný buffer
      const uploadedThumbnail: BusinessImage = await uploadWebsiteThumbnail(
        thumbnailBuffer,
        businessId,
      );

      console.log('Náhled webu úspěšně nahrán:', uploadedThumbnail);

      // 5. Ukázka, jak by se aktualizovala metadata firmy v databázi
      console.log('\n5. Ukázka aktualizace metadat firmy v databázi...');
      console.log('V reálném použití by se provedla aktualizace metadat firmy v databázi.');
      console.log('Například:');
      console.log(`
// Příklad kódu pro aktualizaci metadat firmy
const company = await prisma.company.update({
  where: { id: "${businessId}" },
  data: {
    metadata: {
      upsert: {
        create: {
          data: JSON.stringify({
            images: [
              ${JSON.stringify(uploadedImage, null, 2)},
              // další obrázky...
            ]
          }),
          website: {
            create: {
              link: "https://example.com",
              thumbnail: "${uploadedThumbnail.url}"
            }
          }
        },
        update: {
          data: JSON.stringify({
            images: [
              ${JSON.stringify(uploadedImage, null, 2)},
              // další obrázky...
            ]
          }),
          website: {
            upsert: {
              create: {
                link: "https://example.com",
                thumbnail: "${uploadedThumbnail.url}"
              },
              update: {
                thumbnail: "${uploadedThumbnail.url}"
              }
            }
          }
        }
      }
    }
  }
});
      `);

      console.log('Ukázka aktualizace metadat dokončena');

      // 6. Smazání jednoho obrázku
      console.log('\n6. Mazání jednoho obrázku...');
      const deleted = await deleteImage(uploadedImageFromUrl.path);
      console.log(`Obrázek ${deleted ? 'byl' : 'nebyl'} úspěšně smazán`);

      // 7. Smazání všech obrázků firmy
      // Zakomentováno, aby se nesmazaly všechny obrázky při testování
      /*
      console.log('\n7. Mazání všech obrázků firmy...');
      const allDeleted = await deleteBusinessImages(businessId);
      console.log(`Všechny obrázky firmy ${allDeleted ? 'byly' : 'nebyly'} úspěšně smazány`);
      */
    } catch (error) {
      console.error('Chyba při nahrávání obrázku:', error);
    }
  } catch (error) {
    console.error('Chyba při spuštění příkladu:', error);
  } finally {
    // Ukončení Prisma klienta
    await prisma.$disconnect();
  }
}

// Spuštění příkladu
main().catch(console.error);
