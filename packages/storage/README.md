# @contact-scraper/storage

Knihovna pro lokální ukládání souborů (obrázků i JSON) na serveru. Součástí je jednoduché API pro nahrávání, čtení a mazání souborů, které je používané scrapery i API serverem.

## Instalace

```bash
pnpm add @contact-scraper/storage
```

## Konfigurace

Knihovna čerpá konfiguraci z proměnných prostředí:

```env
STORAGE_BASE_DIR=../storage-data    # cesta ke složce, kam se soubory ukládají
STORAGE_PUBLIC_URL=/storage         # URL prefix, pod kterým server soubory zpřístupňuje
```

Pokud nejsou proměnné nastavené, použije se výchozí složka `../storage-data` relativně k aktuálnímu procesu a veřejná URL `/storage`.

## Použití

### Inicializace

```typescript
import { LocalStorage } from '@contact-scraper/storage';

const storage = LocalStorage.fromEnv();
await storage.ensureBaseDir();
```

### Nahrání souboru

```typescript
const fileInfo = await storage.uploadFile(buffer, {
  folderPath: 'businesses/123/images',
  fileName: 'logo.png',
  contentType: 'image/png',
});

console.log(fileInfo);
// {
//   url: '/storage/businesses/123/images/logo.png',
//   path: 'businesses/123/images/logo.png',
//   id: 'logo.png',
//   size: 12345,
//   fileType: 'image/png',
//   uploadedAt: Date
// }
```

### Nahrání souboru z URL

```typescript
const fileInfo = await storage.uploadFromUrl('https://example.com/image.jpg', {
  folderPath: 'businesses/123/images',
});
```

### Získání informací o souboru

```typescript
const fileInfo = await storage.getFileInfo('businesses/123/images/logo.png');

if (!fileInfo) {
  console.log('Soubor nenalezen');
}
```

### Smazání souboru nebo složky

```typescript
await storage.deleteFile('businesses/123/images/logo.png');
await storage.deleteFolder('businesses/123'); // recursive
```

### Streamování souboru (např. v Express routeru)

```typescript
const stream = storage.createReadStream('businesses/123/images/logo.png');
stream.pipe(res);
```

## Pomocné funkce pro scrapery

V balíčku `@contact-scraper/scrapers` je stále k dispozici sada helperů:

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

Tyto funkce nyní pracují s lokálním úložištěm a ukládají metadata (např. cesty a URL) do databáze pomocí Prisma.

## Příklad použití

Kompletní příklad použití najdete v souboru `packages/scrapers/src/examples/storage-example.ts`.

## Licence

ISC
