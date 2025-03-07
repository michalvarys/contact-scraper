import { z } from 'zod';
import { TrpcRouterOutput } from '../../trpc';
import { companyQueryOutputSchema, updateCompanySchema } from './schemas';

export type CompanyQueryOutput = z.infer<typeof companyQueryOutputSchema>;
export type UpdateCompanyData = z.infer<typeof updateCompanySchema>;
export type CompaniesQueryResponse = TrpcRouterOutput['company']['getCompanies'];
export type Companies = CompaniesQueryResponse['data'];
export type Company = CompaniesQueryResponse['data'][0];
