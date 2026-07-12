import { OdooClient } from 'odoo-xmlrpc-ts';
import { BaseClient } from './base-client';
import {
    OdooConfig,
    AuthCredentials,
    UserSession,
    UserRegistrationData,
    PasswordResetRequestData,
    PasswordResetConfirmData,
    ContactData,
    MailingContactData,
    LinkTrackerData,
    LinkTrackerRecord,
    LinkTrackerClickData,
    UtmCampaignData,
    UtmMediumData,
    UtmSourceData,
    MailingListData,
    MailingListRecord,
    MailingContactSubscriptionData,
} from './models/odoo';

/**
 * Admin client for Odoo API
 * Used for administrative operations with elevated privileges
 */
export class AdminClient extends BaseClient {
    private config: OdooConfig;

    constructor(config: OdooConfig) {
        if (!config.username || !config.password) {
            throw new Error('Admin client requires username and password');
        }

        const client = new OdooClient({
            url: config.url,
            db: config.db,
            username: config.username,
            password: config.password,
        });

        super(client);
        this.config = config;
    }

    /**
     * Authenticate with Odoo using admin credentials
     * @param credentials Authentication credentials (ignored for admin client)
     * @returns User session information
     */
    async authenticate(credentials?: AuthCredentials): Promise<UserSession> {
        try {
            // Admin client uses pre-configured credentials
            const uid = await this.client.authenticate();

            // Get user information
            const userData = await this.read(
                'res.users',
                [uid],
                ['id', 'login', 'name', 'partner_id', 'company_id'],
            );

            if (userData.length === 0) {
                throw new Error('Failed to get user information');
            }

            const user = userData[0];
            const partnerData = await this.read('res.partner', [user.partner_id[0]], ['name']);

            // Get company information
            const companyData = await this.read('res.company', [user.company_id[0]], ['name']);

            return {
                uid: user.id,
                username: user.login,
                name: partnerData[0]?.name || user.name,
                partnerId: user.partner_id[0],
                companyId: user.company_id[0],
                isAdmin: true, // Admin client is always admin
            };
        } catch (error) {
            throw new Error(`Authentication failed: ${error}`);
        }
    }

    /**
     * Register a new user (admin operation)
     * @param registrationData User registration data
     * @returns Success status
     */
    async register(registrationData: UserRegistrationData): Promise<boolean> {
        try {
            // Determine the group based on userType
            const groupId = registrationData.userType === 'portal' ? 10 : 11; // portal group 10, public group 11

            // Create the user
            const userId = await this.create('res.users', {
                name: registrationData.name,
                login: registrationData.login,
                email: registrationData.email,
                password: registrationData.password,
                groups_id: [[4, groupId]], // Add to group
            });

            return userId > 0;
        } catch (error) {
            throw new Error(`User registration failed: ${error}`);
        }
    }

    /**
     * Request password reset (admin operation)
     * @param resetData Password reset request data
     * @returns Success status
     */
    async requestPasswordReset(resetData: PasswordResetRequestData): Promise<boolean> {
        try {
            // Use Odoo's built-in password reset functionality
            await this.execute('res.users', 'reset_password', [resetData.login]);
            return true;
        } catch (error) {
            throw new Error(`Password reset request failed: ${error}`);
        }
    }

    /**
     * Confirm password reset (admin operation)
     * @param confirmData Password reset confirmation data
     * @returns Success status
     */
    async confirmPasswordReset(confirmData: PasswordResetConfirmData): Promise<boolean> {
        try {
            // This would typically involve validating the token and updating the password
            // Implementation depends on Odoo's password reset flow
            await this.execute('res.users', 'write', [
                [['login', '=', confirmData.token]], // This is simplified
                { password: confirmData.password },
            ]);
            return true;
        } catch (error) {
            throw new Error(`Password reset confirmation failed: ${error}`);
        }
    }

    /**
     * Get all users (admin only)
     * @returns Array of user records
     */
    async getAllUsers(): Promise<any[]> {
        return await this.searchRead('res.users', [], ['id', 'login', 'name', 'email', 'active']);
    }

    /**
     * Deactivate a user (admin only)
     * @param userId User ID to deactivate
     * @returns Success status
     */
    async deactivateUser(userId: number): Promise<boolean> {
        return await this.write('res.users', [userId], { active: false });
    }

    /**
     * Activate a user (admin only)
     * @param userId User ID to activate
     * @returns Success status
     */
    async activateUser(userId: number): Promise<boolean> {
        return await this.write('res.users', [userId], { active: true });
    }

    // ============================================================================
    // MAILING CONTACT MANAGEMENT
    // ============================================================================

    /**
     * Create a mailing contact in mailing.contact
     * @param contactData Mailing contact information
     * @returns Created mailing contact ID
     */
    async createMailingContact(contactData: MailingContactData): Promise<number> {
        try {
            const data: any = {
                name: contactData.name,
            };

            if (contactData.email) data.email = contactData.email;
            if (contactData.company_name) data.company_name = contactData.company_name;
            if (contactData.country_id) data.country_id = contactData.country_id;
            if (contactData.mobile) data.mobile = contactData.mobile;
            if (contactData.tag_ids && contactData.tag_ids.length > 0) {
                data.tag_ids = [[6, 0, contactData.tag_ids]];
            }

            const mailingContactId = await this.create('mailing.contact', data);
            return mailingContactId;
        } catch (error) {
            throw new Error(`Mailing contact creation failed: ${error}`);
        }
    }

    /**
     * Update existing mailing contact
     * @param mailingContactId Mailing contact ID to update
     * @param contactData Updated mailing contact data
     * @returns Success status
     */
    async updateMailingContact(mailingContactId: number, contactData: Partial<MailingContactData>): Promise<boolean> {
        try {
            const updateData: any = {};

            if (contactData.name) updateData.name = contactData.name;
            if (contactData.email) updateData.email = contactData.email;
            if (contactData.company_name) updateData.company_name = contactData.company_name;
            if (contactData.country_id) updateData.country_id = contactData.country_id;
            if (contactData.mobile) updateData.mobile = contactData.mobile;
            if (contactData.tag_ids) {
                updateData.tag_ids = [[6, 0, contactData.tag_ids]];
            }

            return await this.write('mailing.contact', [mailingContactId], updateData);
        } catch (error) {
            throw new Error(`Mailing contact update failed: ${error}`);
        }
    }

    /**
     * Get mailing contact by ID
     * @param mailingContactId Mailing contact ID
     * @returns Mailing contact data
     */
    async getMailingContact(mailingContactId: number): Promise<any> {
        try {
            const contacts = await this.read(
                'mailing.contact',
                [mailingContactId],
                [
                    'name',
                    'email',
                    'company_name',
                    'country_id',
                    'mobile',
                    'tag_ids',
                    'comment',
                    'subscription_list_ids',
                ],
            );

            return contacts.length > 0 ? contacts[0] : null;
        } catch (error) {
            throw new Error(`Failed to get mailing contact: ${error}`);
        }
    }

    /**
     * Search mailing contacts by email
     * @param email Email address
     * @returns Array of matching mailing contacts
     */
    async searchMailingContactsByEmail(email: string): Promise<any[]> {
        try {
            return await this.searchRead(
                'mailing.contact',
                [['email', '=', email]],
                ['id', 'name', 'email', 'company_name', 'country_id', 'mobile', 'tag_ids'],
            );
        } catch (error) {
            throw new Error(`Mailing contact search failed: ${error}`);
        }
    }

    // ============================================================================
    // RES.PARTNER MANAGEMENT
    // ============================================================================

    async createPartner(contactData: ContactData): Promise<number> {
        try {
            const data: any = { name: contactData.name };

            if (contactData.email) data.email = contactData.email;
            if (contactData.phone) data.phone = contactData.phone;
            if (contactData.mobile) data.mobile = contactData.mobile;
            if (contactData.street) data.street = contactData.street;
            if (contactData.city) data.city = contactData.city;
            if (contactData.zip) data.zip = contactData.zip;
            if (contactData.country_id) data.country_id = contactData.country_id;
            if (contactData.state_id) data.state_id = contactData.state_id;
            if (contactData.company_name) data.company_name = contactData.company_name;
            if (contactData.website) data.website = contactData.website;
            if (contactData.comment) data.comment = contactData.comment;
            if (contactData.is_company !== undefined) data.is_company = contactData.is_company;
            if (contactData.company_type) data.company_type = contactData.company_type;
            if (contactData.category_id && contactData.category_id.length > 0) {
                data.category_id = [[6, 0, contactData.category_id]];
            }

            return await this.create('res.partner', data);
        } catch (error) {
            throw new Error(`Partner creation failed: ${error}`);
        }
    }

    async updatePartner(partnerId: number, contactData: Partial<ContactData>): Promise<boolean> {
        try {
            const data: any = {};

            if (contactData.name) data.name = contactData.name;
            if (contactData.email) data.email = contactData.email;
            if (contactData.phone) data.phone = contactData.phone;
            if (contactData.mobile) data.mobile = contactData.mobile;
            if (contactData.street) data.street = contactData.street;
            if (contactData.city) data.city = contactData.city;
            if (contactData.zip) data.zip = contactData.zip;
            if (contactData.country_id) data.country_id = contactData.country_id;
            if (contactData.state_id) data.state_id = contactData.state_id;
            if (contactData.company_name) data.company_name = contactData.company_name;
            if (contactData.website) data.website = contactData.website;
            if (contactData.comment) data.comment = contactData.comment;
            if (contactData.is_company !== undefined) data.is_company = contactData.is_company;
            if (contactData.company_type) data.company_type = contactData.company_type;
            if (contactData.category_id) {
                data.category_id = [[6, 0, contactData.category_id]];
            }

            return await this.write('res.partner', [partnerId], data);
        } catch (error) {
            throw new Error(`Partner update failed: ${error}`);
        }
    }

    async searchPartnersByEmail(email: string): Promise<any[]> {
        try {
            return await this.searchRead(
                'res.partner',
                [['email', '=', email]],
                ['id', 'name', 'email', 'phone', 'mobile', 'street', 'city', 'zip', 'country_id', 'website', 'is_company', 'category_id'],
            );
        } catch (error) {
            throw new Error(`Partner search failed: ${error}`);
        }
    }

    async linkMailingContactToPartner(mailingContactId: number, partnerId: number): Promise<boolean> {
        try {
            return await this.write('mailing.contact', [mailingContactId], { partner_id: partnerId });
        } catch (error) {
            throw new Error(`Failed to link mailing contact to partner: ${error}`);
        }
    }

    // ============================================================================
    // LINK TRACKER MANAGEMENT
    // ============================================================================

    /**
     * Create or get existing link tracker
     * @param linkData Link tracker data
     * @returns Link tracker record
     */
    async createOrGetLinkTracker(linkData: LinkTrackerData): Promise<LinkTrackerRecord> {
        try {
            // Search for existing link tracker with same parameters
            const domain: any[] = [['url', '=', linkData.url]];

            if (linkData.campaign_id) {
                domain.push(['campaign_id', '=', linkData.campaign_id]);
            } else {
                domain.push(['campaign_id', '=', false]);
            }

            if (linkData.medium_id) {
                domain.push(['medium_id', '=', linkData.medium_id]);
            } else {
                domain.push(['medium_id', '=', false]);
            }

            if (linkData.source_id) {
                domain.push(['source_id', '=', linkData.source_id]);
            } else {
                domain.push(['source_id', '=', false]);
            }

            if (linkData.label) {
                domain.push(['label', '=', linkData.label]);
            } else {
                domain.push('|', ['label', '=', false], ['label', '=', '']);
            }

            const existing = await this.searchRead('link.tracker', domain, [
                'id',
                'url',
                'short_url',
                'redirected_url',
                'code',
                'count',
                'title',
                'label',
                'campaign_id',
                'medium_id',
                'source_id',
            ]);

            if (existing.length > 0) {
                return existing[0] as LinkTrackerRecord;
            }

            // Create new link tracker
            const createData: any = {
                url: linkData.url,
            };

            if (linkData.title) createData.title = linkData.title;
            if (linkData.label) createData.label = linkData.label;
            if (linkData.campaign_id) createData.campaign_id = linkData.campaign_id;
            if (linkData.medium_id) createData.medium_id = linkData.medium_id;
            if (linkData.source_id) createData.source_id = linkData.source_id;

            const linkId = await this.create('link.tracker', createData);

            // Retrieve the created link tracker
            const created = await this.read(
                'link.tracker',
                [linkId],
                [
                    'id',
                    'url',
                    'short_url',
                    'redirected_url',
                    'code',
                    'count',
                    'title',
                    'label',
                    'campaign_id',
                    'medium_id',
                    'source_id',
                ],
            );

            return created[0] as LinkTrackerRecord;
        } catch (error) {
            throw new Error(`Link tracker creation failed: ${error}`);
        }
    }

    /**
     * Record a click on a link tracker
     * @param clickData Click data including link_id
     * @returns Created click ID
     */
    async recordLinkClick(clickData: LinkTrackerClickData): Promise<number> {
        try {
            const clickRecord: any = {
                link_id: clickData.link_id,
            };

            if (clickData.ip) clickRecord.ip = clickData.ip;
            if (clickData.country_id) clickRecord.country_id = clickData.country_id;

            return await this.create('link.tracker.click', clickRecord);
        } catch (error) {
            throw new Error(`Failed to record link click: ${error}`);
        }
    }

    /**
     * Get link tracker by code
     * @param code Short URL code
     * @returns Link tracker record or null
     */
    async getLinkTrackerByCode(code: string): Promise<LinkTrackerRecord | null> {
        try {
            const links = await this.searchRead(
                'link.tracker',
                [['code', '=', code]],
                [
                    'id',
                    'url',
                    'short_url',
                    'redirected_url',
                    'code',
                    'count',
                    'title',
                    'label',
                    'campaign_id',
                    'medium_id',
                    'source_id',
                ],
            );

            return links.length > 0 ? (links[0] as LinkTrackerRecord) : null;
        } catch (error) {
            throw new Error(`Failed to get link tracker: ${error}`);
        }
    }

    /**
     * Get link tracker statistics
     * @param linkId Link tracker ID
     * @returns Click statistics
     */
    async getLinkTrackerStats(linkId: number): Promise<any> {
        try {
            const clicks = await this.searchRead(
                'link.tracker.click',
                [['link_id', '=', linkId]],
                ['id', 'create_date', 'ip', 'country_id'],
            );

            return {
                total_clicks: clicks.length,
                clicks: clicks,
            };
        } catch (error) {
            throw new Error(`Failed to get link tracker stats: ${error}`);
        }
    }

    // ============================================================================
    // UTM MANAGEMENT
    // ============================================================================

    /**
     * Create or get UTM campaign
     * @param campaignData Campaign data
     * @returns Campaign ID
     */
    async createOrGetUtmCampaign(campaignData: UtmCampaignData): Promise<number> {
        try {
            // Search for existing campaign
            const existing = await this.searchRead(
                'utm.campaign',
                [['name', '=', campaignData.name]],
                ['id', 'name'],
            );

            if (existing.length > 0) {
                return existing[0].id;
            }

            // Create new campaign
            const createData: any = {
                name: campaignData.name,
            };

            if (campaignData.title) createData.title = campaignData.title;
            if (campaignData.tag_ids) createData.tag_ids = campaignData.tag_ids;

            return await this.create('utm.campaign', createData);
        } catch (error) {
            throw new Error(`UTM campaign creation failed: ${error}`);
        }
    }

    /**
     * Create or get UTM medium
     * @param mediumData Medium data
     * @returns Medium ID
     */
    async createOrGetUtmMedium(mediumData: UtmMediumData): Promise<number> {
        try {
            // Search for existing medium
            const existing = await this.searchRead(
                'utm.medium',
                [['name', '=', mediumData.name]],
                ['id', 'name'],
            );

            if (existing.length > 0) {
                return existing[0].id;
            }

            // Create new medium
            return await this.create('utm.medium', { name: mediumData.name });
        } catch (error) {
            throw new Error(`UTM medium creation failed: ${error}`);
        }
    }

    /**
     * Create or get UTM source
     * @param sourceData Source data
     * @returns Source ID
     */
    async createOrGetUtmSource(sourceData: UtmSourceData): Promise<number> {
        try {
            // Search for existing source
            const existing = await this.searchRead(
                'utm.source',
                [['name', '=', sourceData.name]],
                ['id', 'name'],
            );

            if (existing.length > 0) {
                return existing[0].id;
            }

            // Create new source
            return await this.create('utm.source', { name: sourceData.name });
        } catch (error) {
            throw new Error(`UTM source creation failed: ${error}`);
        }
    }

    /**
     * Get campaign statistics
     * @param campaignId Campaign ID
     * @returns Campaign statistics including click count
     */
    async getCampaignStats(campaignId: number): Promise<any> {
        try {
            const campaign = await this.read(
                'utm.campaign',
                [campaignId],
                ['id', 'name', 'title', 'click_count'],
            );

            if (campaign.length === 0) {
                throw new Error('Campaign not found');
            }

            // Get associated link trackers
            const links = await this.searchRead(
                'link.tracker',
                [['campaign_id', '=', campaignId]],
                ['id', 'url', 'count', 'title'],
            );

            return {
                campaign: campaign[0],
                links: links,
                total_clicks: campaign[0].click_count || 0,
            };
        } catch (error) {
            throw new Error(`Failed to get campaign stats: ${error}`);
        }
    }

    /**
     * Find a record by a given domain, or create it if it doesn't exist.
     * @param model The Odoo model to search in.
     * @param domain The search domain to find the record.
     * @param createVals The values to use for creating the record if not found.
     * @returns The ID of the found or created record.
     */
    async findOrCreate(model: string, searchCriteria: any, createVals: any): Promise<number> {
        try {
            const domain: [string, string, any][] = Object.entries(searchCriteria).map(
                ([key, value]) => [key, '=', value],
            );
            const existing = await this.searchRead(model, domain, ['id']);

            if (existing.length > 0) {
                return existing[0].id;
            } else {
                return await this.create(model, createVals);
            }
        } catch (error) {
            throw new Error(`Failed to find or create record in ${model}: ${error}`);
        }
    }

    // ============================================================================
    // MAILING LIST MANAGEMENT
    // ============================================================================

    /**
     * Create a new mailing list
     * @param listData Mailing list data
     * @returns Created mailing list ID
     */
    async createMailingList(listData: MailingListData): Promise<number> {
        try {
            const mailingListData: any = {
                name: listData.name,
                active: listData.active !== undefined ? listData.active : true,
                is_public: listData.is_public !== undefined ? listData.is_public : true,
            };

            const listId = await this.create('mailing.list', mailingListData);
            return listId;
        } catch (error) {
            throw new Error(`Mailing list creation failed: ${error}`);
        }
    }

    /**
     * Get all mailing lists
     * @param activeOnly Only return active lists
     * @returns Array of mailing lists
     */
    async getMailingLists(activeOnly: boolean = true): Promise<MailingListRecord[]> {
        try {
            const domain: any[] = activeOnly ? [['active', '=', true]] : [];

            const lists = await this.searchRead('mailing.list', domain, [
                'id',
                'name',
                'active',
                'is_public',
                'contact_count',
                'contact_count_email',
                'contact_count_blacklisted',
                'contact_count_opt_out',
                'contact_ids',
                'mailing_count',
                'mailing_ids',
                'subscription_ids',
                'create_date',
                'create_uid',
                'write_date',
                'write_uid',
            ]);

            return lists as MailingListRecord[];
        } catch (error) {
            throw new Error(`Failed to get mailing lists: ${error}`);
        }
    }

    /**
     * Get a single mailing list by ID
     * @param listId Mailing list ID
     * @returns Mailing list record
     */
    async getMailingList(listId: number): Promise<MailingListRecord | null> {
        try {
            const lists = await this.read(
                'mailing.list',
                [listId],
                [
                    'id',
                    'name',
                    'active',
                    'is_public',
                    'contact_count',
                    'contact_count_email',
                    'contact_count_blacklisted',
                    'contact_count_opt_out',
                    'contact_ids',
                    'mailing_count',
                    'mailing_ids',
                    'subscription_ids',
                    'create_date',
                    'create_uid',
                    'write_date',
                    'write_uid',
                ],
            );

            return lists.length > 0 ? (lists[0] as MailingListRecord) : null;
        } catch (error) {
            throw new Error(`Failed to get mailing list: ${error}`);
        }
    }

    /**
     * Update a mailing list
     * @param listId Mailing list ID
     * @param listData Updated mailing list data
     * @returns Success status
     */
    async updateMailingList(listId: number, listData: Partial<MailingListData>): Promise<boolean> {
        try {
            const updateData: any = {};

            if (listData.name) updateData.name = listData.name;
            if (listData.active !== undefined) updateData.active = listData.active;
            if (listData.is_public !== undefined) updateData.is_public = listData.is_public;

            return await this.write('mailing.list', [listId], updateData);
        } catch (error) {
            throw new Error(`Failed to update mailing list: ${error}`);
        }
    }

    /**
     * Add a mailing contact to a mailing list
     * @param mailingContactId Mailing contact ID (mailing.contact)
     * @param listId Mailing list ID
     * @param optOut Whether the contact is opted out (default: false)
     * @returns Created subscription ID
     */
    async addContactToMailingList(
        mailingContactId: number,
        listId: number,
        optOut: boolean = false,
    ): Promise<number> {
        try {
            // Check if subscription already exists
            const existingSubscription = await this.search('mailing.subscription', [
                ['contact_id', '=', mailingContactId],
                ['list_id', '=', listId],
            ]);

            if (existingSubscription.length > 0) {
                await this.write('mailing.subscription', existingSubscription, { opt_out: optOut });
                return existingSubscription[0];
            }

            const subscriptionId = await this.create('mailing.subscription', {
                contact_id: mailingContactId,
                list_id: listId,
                opt_out: optOut,
            });

            return subscriptionId;
        } catch (error: any) {
            console.error('Error in addContactToMailingList:', {
                mailingContactId,
                listId,
                error: error?.message || String(error),
            });
            const errorMsg = error?.message || String(error);
            throw new Error(`Failed to add contact to mailing list: ${errorMsg}`);
        }
    }

    /**
     * Remove a mailing contact from a mailing list
     * @param mailingContactId Mailing contact ID (mailing.contact)
     * @param listId Mailing list ID
     * @returns Success status
     */
    async removeContactFromMailingList(mailingContactId: number, listId: number): Promise<boolean> {
        try {
            const subscriptions = await this.search('mailing.subscription', [
                ['contact_id', '=', mailingContactId],
                ['list_id', '=', listId],
            ]);

            if (subscriptions.length > 0) {
                return await this.unlink('mailing.subscription', subscriptions);
            }

            return true;
        } catch (error) {
            throw new Error(`Failed to remove contact from mailing list: ${error}`);
        }
    }

    /**
     * Add multiple mailing contacts to a mailing list
     * @param mailingContactIds Array of mailing contact IDs
     * @param listId Mailing list ID
     * @returns Array of created subscription IDs
     */
    async addContactsToMailingList(mailingContactIds: number[], listId: number): Promise<number[]> {
        try {
            const subscriptionIds: number[] = [];

            for (const mailingContactId of mailingContactIds) {
                const subscriptionId = await this.addContactToMailingList(mailingContactId, listId, false);
                subscriptionIds.push(subscriptionId);
            }

            return subscriptionIds;
        } catch (error) {
            throw new Error(`Failed to add contacts to mailing list: ${error}`);
        }
    }

    /**
     * Create mailing contact and add to mailing list in one operation
     * @param contactData Mailing contact data
     * @param listId Mailing list ID to add the contact to
     * @returns Object with mailingContactId and subscriptionId
     */
    async createMailingContactAndAddToList(
        contactData: MailingContactData,
        listId: number,
    ): Promise<{ mailingContactId: number; subscriptionId: number }> {
        try {
            const mailingContactId = await this.createMailingContact(contactData);
            const subscriptionId = await this.addContactToMailingList(mailingContactId, listId, false);

            return { mailingContactId, subscriptionId };
        } catch (error) {
            throw new Error(`Failed to create mailing contact and add to list: ${error}`);
        }
    }

    /**
     * Get all contacts in a mailing list
     * @param listId Mailing list ID
     * @returns Array of mailing contacts
     */
    async getMailingListContacts(listId: number): Promise<any[]> {
        try {
            const list = await this.getMailingList(listId);

            if (!list || !list.contact_ids || list.contact_ids.length === 0) {
                return [];
            }

            const contacts = await this.read('mailing.contact', list.contact_ids, [
                'id',
                'name',
                'email',
                'mobile',
                'country_id',
                'company_name',
                'tag_ids',
            ]);

            return contacts;
        } catch (error) {
            throw new Error(`Failed to get mailing list contacts: ${error}`);
        }
    }
}
