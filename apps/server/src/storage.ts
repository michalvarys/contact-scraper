import { LocalStorage } from '@contact-scraper/storage';

export const storage = LocalStorage.fromEnv();

storage.ensureBaseDir().catch((error: unknown) => {
  console.error('Chyba při vytváření složky pro lokální úložiště:', error);
});
