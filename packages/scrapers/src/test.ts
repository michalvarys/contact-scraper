import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '@contact-scraper/db';
import AiGoogleMapsScraper from './AiGoogleMapsScraper';

async function main() {
  const tasks = [];
  const sektory = [
    // 'Služby',
    // 'Design',
    // 'Kadeřnictví',
    // 'Barber',
    // 'Software',
    'Programátor',
    'Tvorba webu',
    'Digitální marketing',
    'Poradce',
    'Právní služby',
    'Ruční mytí aut',
    'Stavební firma',
    'Natěrač a malířské služby',
    'Fotograf',
    'Kavárny a restaurace',
    'Hotely a ubytování',
    'Event management',
    'Fitness a wellness',
    'E-commerce',
    'Influencer',
    'Realitní makléř',
    'Architekt',
    'Zdravotnictví a estetická medicína',
    'Autoservisy a tuning',
    'Hudebníci a kapely',
    'Vzdělávání',
  ];
}

main().catch(console.error);
