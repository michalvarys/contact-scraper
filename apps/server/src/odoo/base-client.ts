import { OdooClient } from "odoo-xmlrpc-ts";
import {
  Fields,
  OdooRecord,
  SearchDomain,
  SearchReadOptions,
  AuthCredentials,
  UserSession,
  UserRegistrationData,
  PasswordResetRequestData,
  PasswordResetConfirmData,
} from "./models/odoo";
import { OdooClientInterface } from "./client-interface";

/**
 * Base client for Odoo API
 * Contains common functionality for both server and user clients
 */
export abstract class BaseClient implements OdooClientInterface {
  protected client: OdooClient;

  constructor(client: OdooClient) {
    this.client = client;
  }

  /**
   * Search for records
   * @param model Model name
   * @param domain Search domain
   * @returns Array of record IDs
   */
  async search(model: string, domain: SearchDomain): Promise<number[]> {
    return (await this.client.execute(model, "search", [domain])) as number[];
  }

  /**
   * Count records
   * @param model Model name
   * @param domain Search domain
   * @returns Number of records
   */
  async searchCount(model: string, domain: SearchDomain): Promise<number> {
    return (await this.client.execute(model, "search_count", [
      domain,
    ])) as number;
  }

  /**
   * Read records
   * @param model Model name
   * @param ids Record IDs
   * @param fields Fields to read
   * @returns Array of records
   */
  async read(
    model: string,
    ids: number[],
    fields: Fields
  ): Promise<OdooRecord[]> {
    return (await this.client.execute(model, "read", [
      ids,
      fields,
    ])) as OdooRecord[];
  }

  /**
   * Search and read records
   * @param model Model name
   * @param domain Search domain
   * @param fields Fields to read
   * @param options Search options
   * @returns Array of records
   */
  async searchRead(
    model: string,
    domain: SearchDomain,
    fields: Fields,
    options?: SearchReadOptions
  ): Promise<OdooRecord[]> {
    const params: any[] = [domain, fields];

    if (options) {
      params.push(options.offset || 0);
      params.push(options.limit || 0);
      params.push(options.order || "");
    }

    return (await this.client.execute(
      model,
      "search_read",
      params
    )) as OdooRecord[];
  }

  /**
   * Create a record
   * @param model Model name
   * @param values Record values
   * @returns ID of created record
   */
  async create(model: string, values: Record<string, any>): Promise<number> {
    return (await this.client.execute(model, "create", [values])) as number;
  }

  /**
   * Write to records
   * @param model Model name
   * @param ids Record IDs
   * @param values Values to write
   * @returns Success
   */
  async write(
    model: string,
    ids: number[],
    values: Record<string, any>
  ): Promise<boolean> {
    return (await this.client.execute(model, "write", [
      ids,
      values,
    ])) as boolean;
  }

  /**
   * Delete records
   * @param model Model name
   * @param ids Record IDs
   * @returns Success
   */
  async unlink(model: string, ids: number[]): Promise<boolean> {
    return (await this.client.execute(model, "unlink", [ids])) as boolean;
  }

  /**
   * Execute a method on a model
   * @param model Model name
   * @param method Method name
   * @param args Method arguments
   * @returns Method result
   */
  async execute<T>(model: string, method: string, args: any[]): Promise<T> {
    return (await this.client.execute(model, method, args)) as T;
  }

  /**
   * Get fields of a model
   * @param model Model name
   * @param attributes Attributes to get
   * @returns Fields information
   */
  async fieldsGet(
    model: string,
    attributes: string[] = ["string", "help", "type"]
  ): Promise<Record<string, any>> {
    return (await this.client.execute(model, "fields_get", [
      [],
      attributes,
    ])) as Record<string, any>;
  }

  /**
   * Authenticate with Odoo
   * @param credentials Authentication credentials
   * @returns User session information
   */
  abstract authenticate(credentials: AuthCredentials): Promise<UserSession>;

  /**
   * Register a new user
   * @param registrationData User registration data
   * @returns Success status
   */
  abstract register(registrationData: UserRegistrationData): Promise<boolean>;

  /**
   * Request password reset
   * @param resetData Password reset request data
   * @returns Success status
   */
  abstract requestPasswordReset(
    resetData: PasswordResetRequestData
  ): Promise<boolean>;

  /**
   * Confirm password reset
   * @param confirmData Password reset confirmation data
   * @returns Success status
   */
  abstract confirmPasswordReset(
    confirmData: PasswordResetConfirmData
  ): Promise<boolean>;
}
