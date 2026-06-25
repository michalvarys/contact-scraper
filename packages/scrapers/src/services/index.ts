// Export všech služeb pro snadné použití
export { geminiService } from './GeminiService';
export { websiteAnalyzer } from './WebsiteAnalyzer';
export { databaseManager } from './DatabaseManager';
// export { browserManager } from './BrowserManager';

// Export tříd pro případné rozšíření
export { GeminiService } from './GeminiService';
export { WebsiteAnalyzer } from './WebsiteAnalyzer';
export { DatabaseManager } from './DatabaseManager';
export { BrowserManager } from './BrowserManager';

// Lead enrichment via Claude Code subscription CLI
export {
  enrichCompany,
  enrichCompaniesBatch,
  validateClaudeCli,
  buildPrompt as buildEnrichmentPrompt,
} from './EnrichmentService';
export type {
  EnrichmentConfig,
  EnrichmentOutputColumn,
  EnrichmentRowResult,
  BatchProgress,
} from './EnrichmentService';
