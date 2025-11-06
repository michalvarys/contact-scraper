import { Router } from 'express';
import { storage } from '../storage';

const storageRouter = Router();

storageRouter.get('/*', async (req, res) => {
    //@ts-ignore
    const relativePath = req.params?.[0];

    if (!relativePath) {
        res.status(400).json({ error: 'Chybí cesta k souboru' });
        return;
    }

    try {
        const fileInfo = await storage.getFileInfo(relativePath);

        if (!fileInfo) {
            res.status(404).json({ error: 'Soubor nebyl nalezen' });
            return;
        }

        res.setHeader('Content-Type', fileInfo.fileType);
        res.setHeader('Content-Length', String(fileInfo.size));
        res.setHeader('Cache-Control', 'private, max-age=60');

        const stream = storage.createReadStream(fileInfo.path);
        stream.on('error', (error: Error) => {
            console.error('Chyba při čtení souboru:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Chyba při čtení souboru' });
            } else {
                res.destroy(error);
            }
        });

        stream.pipe(res);
    } catch (error) {
        console.error('Chyba při získávání souboru:', error);
        res.status(500).json({ error: 'Nečekaná chyba při získávání souboru' });
    }
});

export default storageRouter;
