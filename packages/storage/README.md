# @contact-scraper/storage

Knihovna pro manipulaci s S3 buckets od Supabase. Umožňuje nahrávání obrázků a souborů do Supabase Storage a jejich správu.

## Instalace

```bash
pnpm add @contact-scraper/storage
```

## Konfigurace

Knihovna vyžaduje nastavení následujících proměnných prostředí:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

## Použití

### Inicializace

```typescript
import { SupabaseStorage } from '@contact-scraper/storage';

// Vytvoření instance
const storage = new SupabaseStorage({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY!,
  bucketName: 'images',
});

// Inicializace bucketu (vytvoří ho, pokud neexistuje)
await storage.initBucket(true); // true = veřejný bucket
```

### Nahrání souboru

```typescript
// Nahrání souboru z Buffer, Blob nebo File
const fileInfo = await storage.uploadFile(buffer, {
  folderPath: 'businesses/123/images', // volitelná cesta složky
  fileName: 'logo.png', // volitelný název souboru (jinak se vygeneruje UUID)
  contentType: 'image/png', // volitelný MIME typ
  metadata: { businessId: '123' }, // volitelná metadata
});

console.log(fileInfo);
// {
//   url: 'https://your-project.supabase.co/storage/v1/object/public/images/businesses/123/images/logo.png',
//   path: 'businesses/123/images/logo.png',
//   id: 'logo.png',
//   size: 12345,
//   fileType: 'image/png',
//   uploadedAt: Date
// }
```

### Nahrání obrázku z URL

```typescript
// Nahrání obrázku z URL
const fileInfo = await storage.uploadFromUrl('https://example.com/image.jpg', {
  folderPath: 'businesses/123/images',
  fileName: 'image-from-url.jpg', // volitelné, jinak se použije název z URL
});

console.log(fileInfo);
```

### Získání informací o souboru

```typescript
// Získání informací o souboru
const fileInfo = await storage.getFileInfo('businesses/123/images/logo.png');

if (fileInfo) {
  console.log(fileInfo);
} else {
  console.log('Soubor nenalezen');
}
```

### Smazání souboru

```typescript
// Smazání souboru
const deleted = await storage.deleteFile('businesses/123/images/logo.png');
console.log(`Soubor ${deleted ? 'byl' : 'nebyl'} smazán`);
```

### Smazání složky

```typescript
// Smazání všech souborů ve složce
const deleted = await storage.deleteFolder('businesses/123/images');
console.log(`Složka ${deleted ? 'byla' : 'nebyla'} smazána`);
```

## Pomocné funkce pro scrapery

V balíčku `@contact-scraper/scrapers` jsou k dispozici pomocné funkce pro práci s obrázky v scraperech:

```typescript
import {
  uploadFile,
  uploadImageFromUrl,
  uploadScreenshot,
  uploadWebsiteThumbnail,
  deleteImage,
  deleteBusinessImages,
} from '@contact-scraper/scrapers/src/tools/bucket';
```

### Nahrání screenshotu

```typescript
// Nahrání screenshotu z Puppeteer
const screenshot = await page.screenshot();
const imageInfo = await uploadScreenshot(screenshot, businessId, {
  imageType: 'screenshot',
  suffix: 'homepage', // volitelný suffix pro název souboru
});

console.log(imageInfo);
```

### Nahrání náhledu webové stránky

```typescript
// Nahrání náhledu webové stránky (z Buffer nebo URL)
const imageInfo = await uploadWebsiteThumbnail(thumbnailBuffer, businessId);
// nebo
const imageInfo = await uploadWebsiteThumbnail('https://example.com/thumbnail.png', businessId);

console.log(imageInfo);
```

### Smazání obrázků firmy

```typescript
// Smazání všech obrázků firmy
const deleted = await deleteBusinessImages(businessId);
console.log(`Obrázky firmy ${deleted ? 'byly' : 'nebyly'} smazány`);
```

## Integrace s Prisma

Příklad uložení odkazů na obrázky do Prisma databáze:

```typescript
import { prisma } from '@contact-scraper/db';
import { BusinessImage } from '@contact-scraper/types';

// Nahrání obrázku
const uploadedImage: BusinessImage = await uploadScreenshot(screenshot, businessId);

// Uložení odkazu do databáze
await prisma.company.update({
  where: { id: businessId },
  data: {
    metadata: {
      upsert: {
        create: {
          data: JSON.stringify({
            images: [uploadedImage],
          }),
          website: {
            create: {
              link: 'https://example.com',
              thumbnail: uploadedImage.url,
            },
          },
        },
        update: {
          data: JSON.stringify({
            images: [uploadedImage],
          }),
        },
      },
    },
  },
});
```

## Příklad použití

Kompletní příklad použití najdete v souboru `packages/scrapers/src/examples/storage-example.ts`.

## Licence

ISC
