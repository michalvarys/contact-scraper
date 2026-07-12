import { AdminClient } from './admin-client';
import { ContactData, MailingContactData, MailingListData, SearchDomain } from './models/odoo';
import { prisma } from '@contact-scraper/db';

/**
 * Service layer for Odoo operations
 * Handles integration between local database and Odoo
 */
export class OdooService {
    private adminClient: AdminClient;
    private countryCache: Map<string, number> = new Map();
    private stateCache: Map<string, Map<string, number>> = new Map();
    private categoryCache: Map<string, number> = new Map();
    private static readonly COUNTRY_ALIASES: Record<string, string> = {
        'česká republika': 'Czech Republic',
        'ceska republika': 'Czech Republic',
        'česko': 'Czech Republic',
        'cesko': 'Czech Republic',
        'slovenská republika': 'Slovakia',
        'slovensko': 'Slovakia',
        'polsko': 'Poland',
        'nemecko': 'Germany',
        'némecko': 'Germany',
        'deutschland': 'Germany',
    };

    constructor(adminClient: AdminClient) {
        this.adminClient = adminClient;
    }

    async syncCompanyToOdoo(companyId: string, options?: { syncToPartner?: boolean }): Promise<number> {
        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                include: { categories: true },
            });

            if (!company) {
                throw new Error(`Company not found: ${companyId}`);
            }

            if (company.odooMailingContactId) {
                if (options?.syncToPartner) {
                    await this.ensurePartnerForCompany(company, companyId);
                }
                return company.odooMailingContactId;
            }

            if (!company.email) {
                throw new Error(
                    `Company "${company.name}" has no email address. Email is required for mailing contacts.`,
                );
            }

            const existing = await this.adminClient.searchMailingContactsByEmail(company.email);
            if (existing.length > 0) {
                const existingId = existing[0].id;
                await prisma.company.update({
                    where: { id: companyId },
                    data: { odooMailingContactId: existingId },
                });
                if (options?.syncToPartner) {
                    await this.ensurePartnerForCompany(company, companyId, existingId);
                }
                return existingId;
            }

            const parsedAddress = this.parseAddress(company.address);
            const countryId = await this.getCountryId(parsedAddress.country);
            let tagIds: number[] = [];
            if (company.categories?.length > 0) {
                try {
                    tagIds = await this.getOrCreateTagIds(company.categories.map((c) => c.name));
                } catch (err) {
                    console.warn('Failed to create tags, continuing without them:', err);
                }
            }

            const contactData: MailingContactData = {
                name: company.name,
                email: company.email,
                company_name: company.name,
                country_id: countryId,
                mobile: this.normalizePhone(company.phone),
                tag_ids: tagIds.length ? tagIds : undefined,
            };

            const mailingContactId = await this.adminClient.createMailingContact(contactData);

            const updateData: any = { odooMailingContactId: mailingContactId };

            if (options?.syncToPartner) {
                const partnerId = await this.createPartnerFromCompany(company, parsedAddress, countryId, tagIds);
                updateData.odooPartnerId = partnerId;
                await this.adminClient.linkMailingContactToPartner(mailingContactId, partnerId);
            }

            await prisma.company.update({
                where: { id: companyId },
                data: updateData,
            });

            return mailingContactId;
        } catch (error) {
            throw new Error(`Failed to sync company to Odoo: ${error}`);
        }
    }

    private async createPartnerFromCompany(
        company: any,
        parsedAddress: ReturnType<typeof this.parseAddress>,
        countryId?: number,
        tagIds?: number[],
    ): Promise<number> {
        const stateId = await this.getStateId(parsedAddress.state, countryId);

        const partnerData: ContactData = {
            name: company.name,
            email: company.email || undefined,
            phone: this.normalizePhone(company.phone),
            street: parsedAddress.street,
            city: parsedAddress.city,
            zip: parsedAddress.postalCode,
            country_id: countryId,
            state_id: stateId,
            company_name: company.name,
            website: this.normalizeWebsite(company.website) || undefined,
            is_company: true,
            company_type: 'company',
            category_id: tagIds?.length ? tagIds : undefined,
        };

        const existingPartners = company.email
            ? await this.adminClient.searchPartnersByEmail(company.email)
            : [];

        if (existingPartners.length > 0) {
            const partnerId = existingPartners[0].id;
            await this.adminClient.updatePartner(partnerId, partnerData);
            return partnerId;
        }

        return await this.adminClient.createPartner(partnerData);
    }

    private async ensurePartnerForCompany(company: any, companyId: string, mailingContactId?: number): Promise<void> {
        if (company.odooPartnerId) return;

        const parsedAddress = this.parseAddress(company.address);
        const countryId = await this.getCountryId(parsedAddress.country);
        let tagIds: number[] = [];
        if (company.categories?.length > 0) {
            try {
                tagIds = await this.getOrCreateTagIds(company.categories.map((c: { name: string }) => c.name));
            } catch (err) {
                console.warn('Failed to create tags for partner, continuing without them:', err);
            }
        }

        const partnerId = await this.createPartnerFromCompany(company, parsedAddress, countryId, tagIds);

        const mcId = mailingContactId || company.odooMailingContactId;
        if (mcId) {
            await this.adminClient.linkMailingContactToPartner(mcId, partnerId);
        }

        await prisma.company.update({
            where: { id: companyId },
            data: { odooPartnerId: partnerId },
        });
    }

    /**
     * Update existing company in Odoo mailing.contact with latest data
     * @param companyId Local company ID
     * @returns Success status
     */
    async updateCompanyInOdoo(companyId: string, options?: { syncToPartner?: boolean }): Promise<boolean> {
        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                include: { categories: true },
            });

            if (!company) {
                throw new Error(`Company not found: ${companyId}`);
            }

            if (!company.odooMailingContactId) {
                throw new Error(`Company ${companyId} is not synced to Odoo. Use sync instead of update.`);
            }

            const parsedAddress = this.parseAddress(company.address);
            const countryId = await this.getCountryId(parsedAddress.country);
            let tagIds: number[] = [];
            if (company.categories?.length > 0) {
                try {
                    tagIds = await this.getOrCreateTagIds(company.categories.map((c) => c.name));
                } catch (err) {
                    console.warn('Failed to create tags for update, continuing without them:', err);
                }
            }

            const contactData: Partial<MailingContactData> = {
                name: company.name,
                email: company.email || undefined,
                company_name: company.name,
                country_id: countryId,
                mobile: this.normalizePhone(company.phone),
                tag_ids: tagIds.length ? tagIds : undefined,
            };

            const success = await this.adminClient.updateMailingContact(company.odooMailingContactId, contactData);

            if (options?.syncToPartner) {
                if (company.odooPartnerId) {
                    const stateId = await this.getStateId(parsedAddress.state, countryId);
                    const partnerData: Partial<ContactData> = {
                        name: company.name,
                        email: company.email || undefined,
                        phone: this.normalizePhone(company.phone),
                        street: parsedAddress.street,
                        city: parsedAddress.city,
                        zip: parsedAddress.postalCode,
                        country_id: countryId,
                        state_id: stateId,
                        company_name: company.name,
                        website: this.normalizeWebsite(company.website) || undefined,
                        category_id: tagIds.length ? tagIds : undefined,
                    };
                    await this.adminClient.updatePartner(company.odooPartnerId, partnerData);
                } else {
                    await this.ensurePartnerForCompany(company, companyId);
                }
            }

            return success;
        } catch (error) {
            throw new Error(`Failed to update company in Odoo: ${error}`);
        }
    }

    /**
     * Sync multiple companies to Odoo
     * @param companyIds Array of local company IDs
     * @returns Array of Odoo partner IDs
     */
    async syncCompaniesToOdoo(companyIds: string[], options?: { syncToPartner?: boolean }): Promise<number[]> {
        const mailingContactIds: number[] = [];

        for (const companyId of companyIds) {
            try {
                const mcId = await this.syncCompanyToOdoo(companyId, options);
                mailingContactIds.push(mcId);
            } catch (error) {
                console.error(`Failed to sync company ${companyId}:`, error);
            }
        }

        return mailingContactIds;
    }

    /**
     * Add a company to a mailing list (syncs to Odoo first if needed)
     * @param companyId Local company ID
     * @param mailingListId Odoo mailing list ID
     * @returns Subscription ID
     */
    async addCompanyToMailingList(companyId: string, mailingListId: number, options?: { syncToPartner?: boolean }): Promise<number> {
        try {
            const mailingContactId = await this.syncCompanyToOdoo(companyId, options);

            const subscriptionId = await this.adminClient.addContactToMailingList(
                mailingContactId,
                mailingListId,
                false,
            );

            return subscriptionId;
        } catch (error: any) {
            console.error('Error in addCompanyToMailingList:', error);
            const errorMsg = error?.message || String(error);
            throw new Error(`Failed to add company to mailing list: ${errorMsg}`);
        }
    }

    /**
     * Add multiple companies to a mailing list
     * @param companyIds Array of local company IDs
     * @param mailingListId Odoo mailing list ID
     * @returns Array of subscription IDs
     */
    async addCompaniesToMailingList(
        companyIds: string[],
        mailingListId: number,
        options?: { syncToPartner?: boolean },
    ): Promise<number[]> {
        const subscriptionIds: number[] = [];

        for (const companyId of companyIds) {
            try {
                const subscriptionId = await this.addCompanyToMailingList(companyId, mailingListId, options);
                subscriptionIds.push(subscriptionId);
            } catch (error) {
                console.error(`Failed to add company ${companyId} to mailing list:`, error);
                // Continue with other companies
            }
        }

        return subscriptionIds;
    }

    /**
     * Create a new mailing list and optionally add companies to it
     * @param name Mailing list name
     * @param companyIds Optional array of company IDs to add
     * @returns Created mailing list ID
     */
    async createMailingListWithCompanies(name: string, companyIds?: string[], options?: { syncToPartner?: boolean }): Promise<number> {
        try {
            const listData: MailingListData = {
                name,
                active: true,
                is_public: true,
            };

            const listId = await this.adminClient.createMailingList(listData);

            if (companyIds && companyIds.length > 0) {
                await this.addCompaniesToMailingList(companyIds, listId, options);
            }

            return listId;
        } catch (error) {
            throw new Error(`Failed to create mailing list with companies: ${error}`);
        }
    }

    /**
     * Get all mailing lists from Odoo
     * @param activeOnly Only return active lists
     * @returns Array of mailing lists
     */
    async getMailingLists(activeOnly: boolean = true) {
        return await this.adminClient.getMailingLists(activeOnly);
    }

    /**
     * Get a single mailing list by ID
     * @param listId Mailing list ID
     * @returns Mailing list record
     */
    async getMailingList(listId: number) {
        return await this.adminClient.getMailingList(listId);
    }

    /**
     * Get all contacts in a mailing list
     * @param listId Mailing list ID
     * @returns Array of contacts
     */
    async getMailingListContacts(listId: number) {
        return await this.adminClient.getMailingListContacts(listId);
    }

    /**
     * Check if a company is already synced to Odoo
     * @param companyId Local company ID
     * @returns True if synced, false otherwise
     */
    async isCompanySynced(companyId: string): Promise<boolean> {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { odooMailingContactId: true },
        });

        return !!company?.odooMailingContactId;
    }

    /**
     * Get Odoo mailing contact ID for a company
     * @param companyId Local company ID
     * @returns Odoo mailing contact ID or null if not synced
     */
    async getCompanyOdooMailingContactId(companyId: string): Promise<number | null> {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { odooMailingContactId: true },
        });

        return company?.odooMailingContactId || null;
    }

    private normalizeString(value: string): string {
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    }

    private normalizeWebsite(url?: string | null): string | null {
        if (!url) return null;
        let normalized = url.trim();
        if (!normalized) return null;
        if (!/^https?:\/\//i.test(normalized)) {
            normalized = `https://${normalized}`;
        }
        return normalized;
    }

    private normalizePhone(phone?: string | null): string | undefined {
        if (!phone) return undefined;
        // Remove all spaces, dashes, and parentheses from phone number
        const normalized = phone.replace(/[\s\-()]/g, '');
        return normalized || undefined;
    }

    private parseAddress(address: string | null | undefined): {
        street?: string;
        street2?: string;
        city?: string;
        postalCode?: string;
        state?: string;
        country?: string;
    } {
        if (!address) {
            return {};
        }

        const sanitized = address.replace(/\r?\n+/g, ',').replace(/\s{2,}/g, ' ').trim();
        const parts = sanitized
            .split(',')
            .map((part) => part.trim())
            .filter((part) => part.length > 0);

        const result: {
            street?: string;
            street2?: string;
            city?: string;
            postalCode?: string;
            state?: string;
            country?: string;
        } = {};

        if (parts.length === 0) {
            return result;
        }

        result.street = parts[0] || undefined;

        if (parts.length >= 2) {
            const citySegment = parts[1];
            let city = citySegment;
            let postalCode: string | undefined;

            const zipSuffixMatch = citySegment.match(/(\d{3}\s?\d{2}|\d{5}(?:-\d{4})?)$/);
            if (zipSuffixMatch) {
                postalCode = zipSuffixMatch[1];
                city = citySegment.replace(zipSuffixMatch[1], '').trim();
            }

            if (!city) {
                const zipPrefixMatch = citySegment.match(/^(\d{3}\s?\d{2}|\d{5}(?:-\d{4})?)\s+(.+)$/);
                if (zipPrefixMatch) {
                    postalCode = zipPrefixMatch[1];
                    city = zipPrefixMatch[2].trim();
                }
            }

            if (postalCode) {
                const digitsOnly = postalCode.replace(/\s+/g, '');
                result.postalCode = digitsOnly;
            }
            if (city) {
                result.city = city;
            }
        }

        if (parts.length >= 3) {
            result.country = parts[parts.length - 1];
            if (parts.length > 3) {
                result.state = parts.slice(2, parts.length - 1).join(', ');
            }
        }

        return result;
    }

    private async getCountryId(countryName?: string): Promise<number | undefined> {
        if (!countryName) return undefined;

        const normalized = this.normalizeString(countryName);
        if (this.countryCache.has(normalized)) {
            return this.countryCache.get(normalized);
        }

        const candidates = [countryName];
        const alias = OdooService.COUNTRY_ALIASES[normalized];
        if (alias) {
            candidates.push(alias);
        }

        for (const candidate of candidates) {
            const records = await this.adminClient.searchRead(
                'res.country',
                [['name', 'ilike', candidate]],
                ['id'],
                { limit: 1 },
            );

            if (records.length > 0) {
                const id = records[0].id as number;
                this.countryCache.set(normalized, id);
                return id;
            }
        }

        return undefined;
    }

    private async getStateId(stateName?: string, countryId?: number): Promise<number | undefined> {
        if (!stateName) return undefined;

        const countryKey = countryId ? `country:${countryId}` : 'nocountry';
        if (!this.stateCache.has(countryKey)) {
            this.stateCache.set(countryKey, new Map());
        }
        const stateMap = this.stateCache.get(countryKey)!;

        const normalizedState = this.normalizeString(stateName);
        if (stateMap.has(normalizedState)) {
            return stateMap.get(normalizedState);
        }

        const domain: SearchDomain = [['name', 'ilike', stateName]];
        if (countryId) {
            domain.push(['country_id', '=', countryId]);
        }

        const tryLookup = async (searchDomain: SearchDomain): Promise<number | undefined> => {
            const res = await this.adminClient.searchRead(
                'res.country.state',
                searchDomain,
                ['id'],
                { limit: 1 },
            );
            if (res.length > 0) {
                const id = res[0].id as number;
                return id;
            }
            return undefined;
        };

        let stateId = await tryLookup(domain);

        if (!stateId && /kraj/i.test(stateName)) {
            const alternative = stateName.replace(/kraj/i, '').trim();
            if (alternative) {
                const altDomain: SearchDomain = [['name', 'ilike', alternative]];
                if (countryId) {
                    altDomain.push(['country_id', '=', countryId]);
                }
                stateId = await tryLookup(altDomain);
            }
        }

        if (stateId) {
            stateMap.set(normalizedState, stateId);
            return stateId;
        }

        return undefined;
    }

    private async getOrCreateTagIds(names: string[]): Promise<number[]> {
        const ids: number[] = [];

        for (const name of names) {
            if (!name) continue;

            const normalized = this.normalizeString(name);
            if (this.categoryCache.has(normalized)) {
                ids.push(this.categoryCache.get(normalized)!);
                continue;
            }

            const existing = await this.adminClient.searchRead(
                'res.partner.category',
                [['name', 'ilike', name]],
                ['id'],
                { limit: 1 },
            );

            let tagId: number;
            if (existing.length > 0) {
                tagId = existing[0].id as number;
            } else {
                tagId = await this.adminClient.create('res.partner.category', { name });
            }

            this.categoryCache.set(normalized, tagId);
            ids.push(tagId);
        }

        return ids;
    }
}

/**
 * Create an OdooService instance
 * @returns OdooService instance
 */
export function createOdooService(): OdooService {
    const config = {
        url: process.env.ODOO_URL || 'http://localhost:28067',
        db: process.env.ODOO_DB || 'varyshop',
        username: process.env.ODOO_USERNAME,
        password: process.env.ODOO_PASSWORD,
    };

    if (!config.username || !config.password) {
        throw new Error(
            'Odoo credentials not configured. Set ODOO_USERNAME and ODOO_PASSWORD environment variables.',
        );
    }

    const adminClient = new AdminClient(config);
    return new OdooService(adminClient);
}
