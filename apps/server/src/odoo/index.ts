// Odoo service exports
export { type OdooClientInterface } from "./client-interface";
export { BaseClient } from "./base-client";
export { AdminClient } from "./admin-client";
export { UserClient } from "./user-client";

// Re-export types for convenience
export type {
  OdooConfig,
  OdooBaseConfig,
  AuthCredentials,
  UserSession,
  UserRegistrationData,
  PasswordResetRequestData,
  PasswordResetConfirmData,
  SearchDomain,
  Fields,
  SearchReadOptions,
  OdooRecord,
  CreateResponse,
  WriteResponse,
  UnlinkResponse,
} from "./models/odoo";
