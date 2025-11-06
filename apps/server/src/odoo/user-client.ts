import { OdooClient } from "odoo-xmlrpc-ts";
import { BaseClient } from "./base-client";
import {
  OdooBaseConfig,
  AuthCredentials,
  UserSession,
  UserRegistrationData,
  PasswordResetRequestData,
  PasswordResetConfirmData,
} from "./models/odoo";

/**
 * User client for Odoo API
 * Used for user authentication and operations with user permissions
 */
export class UserClient extends BaseClient {
  private config: OdooBaseConfig;
  private session?: UserSession;

  constructor(config: OdooBaseConfig) {
    const client = new OdooClient({
      url: config.url,
      db: config.db,
      password: "",
      username: "",
    });

    super(client);
    this.config = config;
  }

  /**
   * Authenticate with Odoo using user credentials
   * @param credentials Authentication credentials
   * @returns User session information
   */
  async authenticate(credentials: AuthCredentials): Promise<UserSession> {
    try {
      const client = new OdooClient({
        url: this.config.url,
        db: this.config.db,
        username: credentials.username,
        password: credentials.password,
      });

      // Reinitialize the client with user credentials
      this.client = client;
      const uid = await this.client.authenticate();

      // Get user information
      const userData = await this.read(
        "res.users",
        [uid],
        ["id", "login", "name", "partner_id", "company_id", "groups_id"]
      );

      if (userData.length === 0) {
        throw new Error("Failed to get user information");
      }

      const user = userData[0];
      const partnerData = await this.read(
        "res.partner",
        [user.partner_id[0]],
        ["name"]
      );

      // Get company information
      const companyData = await this.read(
        "res.company",
        [user.company_id[0]],
        ["name"]
      );

      // Check if user is admin (has admin group)
      const isAdmin = user.groups_id.includes(1); // Group 1 is typically admin

      this.session = {
        uid: user.id,
        username: user.login,
        name: partnerData[0]?.name || user.name,
        partnerId: user.partner_id[0],
        companyId: user.company_id[0],
        isAdmin,
      };

      return this.session;
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  /**
   * Register a new user (self-registration)
   * @param registrationData User registration data
   * @returns Success status
   */
  async register(registrationData: UserRegistrationData): Promise<boolean> {
    try {
      // For self-registration, users are typically added to portal group
      const groupId = 10; // portal group

      // Create the user
      const userId = await this.create("res.users", {
        name: registrationData.name,
        login: registrationData.login,
        email: registrationData.email,
        password: registrationData.password,
        groups_id: [[4, groupId]], // Add to portal group
      });

      return userId > 0;
    } catch (error) {
      throw new Error(`User registration failed: ${error}`);
    }
  }

  /**
   * Request password reset
   * @param resetData Password reset request data
   * @returns Success status
   */
  async requestPasswordReset(
    resetData: PasswordResetRequestData
  ): Promise<boolean> {
    try {
      // Use Odoo's built-in password reset functionality
      await this.execute("res.users", "reset_password", [resetData.login]);
      return true;
    } catch (error) {
      throw new Error(`Password reset request failed: ${error}`);
    }
  }

  /**
   * Confirm password reset
   * @param confirmData Password reset confirmation data
   * @returns Success status
   */
  async confirmPasswordReset(
    confirmData: PasswordResetConfirmData
  ): Promise<boolean> {
    try {
      // This would typically involve validating the token and updating the password
      // Implementation depends on Odoo's password reset flow
      await this.execute("res.users", "write", [
        [["login", "=", confirmData.token]], // This is simplified
        { password: confirmData.password },
      ]);
      return true;
    } catch (error) {
      throw new Error(`Password reset confirmation failed: ${error}`);
    }
  }

  /**
   * Get current user session
   * @returns Current user session or null if not authenticated
   */
  getCurrentSession(): UserSession | null {
    return this.session || null;
  }

  /**
   * Check if user is authenticated
   * @returns Authentication status
   */
  isAuthenticated(): boolean {
    return !!this.session;
  }

  /**
   * Logout user
   */
  logout(): void {
    this.session = undefined;
  }

  /**
   * Get user's accessible records based on permissions
   * @param model Model name
   * @param domain Additional domain filters
   * @param fields Fields to retrieve
   * @param options Search options
   * @returns Array of accessible records
   */
  async getMyRecords(
    model: string,
    domain: any[] = [],
    fields: string[] = [],
    options?: any
  ): Promise<any[]> {
    if (!this.session) {
      throw new Error("User not authenticated");
    }

    // Add user-specific domain filters based on permissions
    const userDomain = [
      ...domain,
      ["create_uid", "=", this.session.uid], // Records created by user
    ];

    return await this.searchRead(model, userDomain, fields, options);
  }

  /**
   * Update user's own records
   * @param model Model name
   * @param recordId Record ID
   * @param values Values to update
   * @returns Success status
   */
  async updateMyRecord(
    model: string,
    recordId: number,
    values: Record<string, any>
  ): Promise<boolean> {
    if (!this.session) {
      throw new Error("User not authenticated");
    }

    // Check if user owns this record
    const records = await this.read(model, [recordId], ["create_uid"]);
    if (records.length === 0 || records[0].create_uid[0] !== this.session.uid) {
      throw new Error("Access denied: You can only modify your own records");
    }

    return await this.write(model, [recordId], values);
  }

  /**
   * Update user's own records
   * @param model Model name
   * @param recordId Record ID
   * @param values Values to update
   * @returns Success status
   */
  async updateProfile(values: Record<string, any>): Promise<boolean> {
    if (!this.session) {
      throw new Error("User not authenticated");
    }

    return await this.write("res.partner", [this.session.partnerId], values);
  }
}
