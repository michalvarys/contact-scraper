import { ScrapedLinkStatus } from '@/types/scraper';

export const getLinkCountByStatus = (links: any[] | undefined, status: ScrapedLinkStatus) => {
  if (!links) return 0;
  return links.filter((link) => link.status === status).length;
};
