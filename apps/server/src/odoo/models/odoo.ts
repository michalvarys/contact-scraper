/**
 * Common types for Odoo communication library
 */

/**
 * Configuration options for Odoo client
 */
export interface OdooConfig {
  url: string;
  db: string;
  username?: string;
  password?: string;
}

/**
 * Basic Odoo configuration without credentials
 */
export interface OdooBaseConfig {
  url: string;
  db: string;
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * Session authentication credentials
 */
export interface SessionCredentials {
  sessionId: string;
}

/**
 * User registration data
 */
export interface UserRegistrationData {
  name: string;
  login: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType?: "portal" | "public"; // 'portal' for group 10, 'public' for group 11
}

/**
 * Password reset request data
 */
export interface PasswordResetRequestData {
  login: string;
}

/**
 * Password reset confirmation data
 */
export interface PasswordResetConfirmData {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * User session information
 */
export interface UserSession {
  uid: number;
  username: string;
  name: string;
  partnerId: number;
  companyId: number;
  isAdmin: boolean;
}

/**
 * Search domain for Odoo queries
 * Example: [['name', '=', 'Test']]
 */
export type SearchDomain = Array<[string, string, any]>;

/**
 * Fields to retrieve from Odoo
 * Example: ['name', 'description', 'price']
 */
export type Fields = string[];

/**
 * Options for search_read operations
 */
export interface SearchReadOptions {
  offset?: number;
  limit?: number;
  order?: string;
}

/**
 * Generic type for Odoo model records
 */
export interface OdooRecord {
  id: number;
  [key: string]: any;
}

/**
 * Response from create operation
 */
export type CreateResponse = number;

/**
 * Response from write operation
 */
export type WriteResponse = boolean;

/**
 * Response from unlink operation
 */
export type UnlinkResponse = boolean;

/**
 * Contact data for res.partner
 */
export interface ContactData {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  street?: string;
  street2?: string;
  city?: string;
  zip?: string;
  country_id?: number;
  state_id?: number;
  company_name?: string;
  company_type?: "person" | "company";
  is_company?: boolean;
  website?: string;
  category_id?: number[];
  comment?: string;
  type?: "contact" | "invoice" | "delivery" | "other" | "private";
  // UTM tracking fields
  campaign_id?: number;
  medium_id?: number;
  source_id?: number;
}

/**
 * Link tracker data
 */
export interface LinkTrackerData {
  url: string;
  title?: string;
  label?: string;
  campaign_id?: number;
  medium_id?: number;
  source_id?: number;
}

/**
 * Link tracker record
 */
export interface LinkTrackerRecord extends OdooRecord {
  url: string;
  short_url: string;
  redirected_url: string;
  code: string;
  count: number;
  title?: string;
  label?: string;
  campaign_id?: [number, string];
  medium_id?: [number, string];
  source_id?: [number, string];
}

/**
 * Link tracker click data
 */
export interface LinkTrackerClickData {
  link_id: number;
  ip?: string;
  country_id?: number;
}

/**
 * UTM Campaign data
 */
export interface UtmCampaignData {
  name: string;
  title?: string;
  tag_ids?: number[];
}

/**
 * UTM Medium data
 */
export interface UtmMediumData {
  name: string;
}

/**
 * UTM Source data
 */
export interface UtmSourceData {
  name: string;
}

/**
 * Mailing list data for mailing.list model
 */
export interface MailingListData {
  name: string;
  active?: boolean;
  is_public?: boolean;
}

/**
 * Mailing list record from Odoo
 */
export interface MailingListRecord extends OdooRecord {
  name: string;
  active: boolean;
  is_public: boolean;
  contact_count: number;
  contact_count_email: number;
  contact_count_blacklisted: number;
  contact_count_opt_out: number;
  contact_ids: number[];
  mailing_count: number;
  mailing_ids: number[];
  subscription_ids: number[];
  create_date: string;
  create_uid: [number, string];
  write_date: string;
  write_uid: [number, string];
}

/**
 * Mailing contact subscription data
 */
export interface MailingContactSubscriptionData {
  contact_id: number;
  list_id: number;
  opt_out?: boolean;
}

/**
 * Complete contact data for Odoo with mailing support
 */
export interface OdooContactData extends ContactData {
  // Add mailing-specific fields if needed
  list_ids?: number[]; // Mailing lists to subscribe the contact to
}
