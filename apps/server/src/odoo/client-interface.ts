import {
  Fields,
  OdooRecord,
  SearchDomain,
  SearchReadOptions,
  OdooConfig,
  AuthCredentials,
  UserSession,
  UserRegistrationData,
  PasswordResetRequestData,
  PasswordResetConfirmData,
} from "./models/odoo";

/**
 * Interface for Odoo client operations
 */
export interface OdooClientInterface {
  /**
   * Authenticate with Odoo
   * @param credentials Authentication credentials
   * @returns User session information
   */
  authenticate(credentials: AuthCredentials): Promise<UserSession>;

  /**
   * Register a new user
   * @param registrationData User registration data
   * @returns Success status
   */
  register(registrationData: UserRegistrationData): Promise<boolean>;

  /**
   * Request password reset
   * @param resetData Password reset request data
   * @returns Success status
   */
  requestPasswordReset(resetData: PasswordResetRequestData): Promise<boolean>;

  /**
   * Confirm password reset
   * @param confirmData Password reset confirmation data
   * @returns Success status
   */
  confirmPasswordReset(confirmData: PasswordResetConfirmData): Promise<boolean>;

  /**
   * Search for records
   * @param model Model name
   * @param domain Search domain
   * @returns Array of record IDs
   */
  search(model: string, domain: SearchDomain): Promise<number[]>;

  /**
   * Count records
   * @param model Model name
   * @param domain Search domain
   * @returns Number of records
   */
  searchCount(model: string, domain: SearchDomain): Promise<number>;

  /**
   * Read records
   * @param model Model name
   * @param ids Record IDs
   * @param fields Fields to read
   * @returns Array of records
   */
  read(model: string, ids: number[], fields: Fields): Promise<OdooRecord[]>;

  /**
   * Search and read records
   * @param model Model name
   * @param domain Search domain
   * @param fields Fields to read
   * @param options Search options
   * @returns Array of records
   */
  searchRead(
    model: string,
    domain: SearchDomain,
    fields: Fields,
    options?: SearchReadOptions
  ): Promise<OdooRecord[]>;

  /**
   * Create a record
   * @param model Model name
   * @param values Record values
   * @returns ID of created record
   */
  create(model: string, values: Record<string, any>): Promise<number>;

  /**
   * Write to records
   * @param model Model name
   * @param ids Record IDs
   * @param values Values to write
   * @returns Success
   */
  write(
    model: string,
    ids: number[],
    values: Record<string, any>
  ): Promise<boolean>;

  /**
   * Delete records
   * @param model Model name
   * @param ids Record IDs
   * @returns Success
   */
  unlink(model: string, ids: number[]): Promise<boolean>;

  /**
   * Execute a method on a model
   * @param model Model name
   * @param method Method name
   * @param args Method arguments
   * @returns Method result
   */
  execute<T>(model: string, method: string, args: any[]): Promise<T>;

  /**
   * Get fields of a model
   * @param model Model name
   * @param attributes Attributes to get
   * @returns Fields information
   */
  fieldsGet(model: string, attributes?: string[]): Promise<Record<string, any>>;
}
