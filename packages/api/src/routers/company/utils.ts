import { companyQueryParamsSchema } from './schemas';
import { z } from 'zod';
import { Prisma, prisma } from '@contact-scraper/db';

// Pomocná funkce pro vytvoření filtru
export function createFilter(
  query: z.infer<typeof companyQueryParamsSchema>,
): Prisma.CompanyWhereInput {
  const filter: Prisma.CompanyWhereInput = {};
  const conditions: Array<Record<string, any>> = [];

  // Filtrování podle klíčových slov (v názvu nebo adrese)
  if (query.keyword) {
    conditions.push(
      { name: { contains: query.keyword } },
      { address: { contains: query.keyword } },
    );
  }

  // Filtrování podle kategorií
  if (query.category) {
    filter.categories = {
      some: {
        name: {
          contains: query.category,
        },
      },
    };
  }

  // Filtrování podle existence webu, emailu a telefonu
  if (query.hasWebsite === 'false') {
    filter.website = { equals: null };
  }
  if (query.hasEmail === 'false') {
    filter.email = { equals: null };
  }
  if (query.hasPhone === 'false') {
    filter.phone = { equals: null };
  }

  // Filtrování pro existující hodnoty
  if (query.hasWebsite === 'true') {
    filter.website = { not: null };
  }
  if (query.hasEmail === 'true') {
    filter.email = { not: null };
  }
  if (query.hasPhone === 'true') {
    filter.phone = { not: null };
  }

  // Přidání podmínek do OR pro klíčové slovo, pokud existují
  if (conditions.length > 0) {
    filter.OR = conditions;
  }

  return filter;
}

// Pomocná funkce pro vytvoření řazení
export function createOrderBy(
  query: z.infer<typeof companyQueryParamsSchema>,
): Array<Record<string, string>> {
  const orderBy: Array<Record<string, string>> = [];

  if (query.sortBy) {
    const direction = query.sortDir === 'desc' ? 'desc' : 'asc';

    switch (query.sortBy) {
      case 'name':
        orderBy.push({ name: direction });
        break;
      case 'address':
        orderBy.push({ address: direction });
        break;
      case 'reviewsCount':
        orderBy.push({ reviewsCount: direction });
        break;
      case 'scrapedAt':
        orderBy.push({ scrapedAt: direction });
        break;
      case 'email':
        orderBy.push({ email: direction });
        break;
      case 'website':
        orderBy.push({ website: direction });
        break;
      case 'phone':
        orderBy.push({ phone: direction });
        break;
      default:
        orderBy.push({ name: 'asc' });
    }
  } else {
    // Výchozí řazení podle názvu
    orderBy.push({ name: 'asc' });
  }

  return orderBy;
}
