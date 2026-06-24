import { Router, Request, Response } from "express";
import { createOdooService } from "./service";

const router = Router();

// Initialize Odoo service
let odooService: ReturnType<typeof createOdooService> | null = null;

function getOdooService() {
  if (!odooService) {
    odooService = createOdooService();
  }
  return odooService;
}

// ============================================================================
// MAILING LIST ENDPOINTS
// ============================================================================

/**
 * GET /api/odoo/mailing-lists
 * Get all mailing lists from Odoo
 */
router.get("/mailing-lists", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== "false";
    const service = getOdooService();
    const lists = await service.getMailingLists(activeOnly);

    res.json({
      success: true,
      data: lists,
    });
  } catch (error: any) {
    console.error("Error fetching mailing lists:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch mailing lists",
      error: error.message,
    });
  }
});

/**
 * GET /api/odoo/mailing-lists/:id
 * Get a single mailing list by ID
 */
router.get("/mailing-lists/:id", async (req: Request, res: Response) => {
  try {
    const listId = parseInt(req.params.id);
    const service = getOdooService();
    const list = await service.getMailingList(listId);

    if (!list) {
      res.status(404).json({
        success: false,
        message: "Mailing list not found",
      });
      return;
    }

    res.json({
      success: true,
      data: list,
    });
  } catch (error: any) {
    console.error("Error fetching mailing list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch mailing list",
      error: error.message,
    });
  }
});

/**
 * GET /api/odoo/mailing-lists/:id/contacts
 * Get all contacts in a mailing list
 */
router.get(
  "/mailing-lists/:id/contacts",
  async (req: Request, res: Response) => {
    try {
      const listId = parseInt(req.params.id);
      const service = getOdooService();
      const contacts = await service.getMailingListContacts(listId);

      res.json({
        success: true,
        data: contacts,
      });
    } catch (error: any) {
      console.error("Error fetching mailing list contacts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch mailing list contacts",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/odoo/mailing-lists
 * Create a new mailing list
 */
router.post("/mailing-lists", async (req: Request, res: Response) => {
  try {
    const { name, companyIds } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: "Mailing list name is required",
      });
      return;
    }

    const service = getOdooService();
    const listId = await service.createMailingListWithCompanies(
      name,
      companyIds
    );

    // Get the created list details
    const list = await service.getMailingList(listId);

    res.status(201).json({
      success: true,
      data: list,
      message: "Mailing list created successfully",
    });
  } catch (error: any) {
    console.error("Error creating mailing list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create mailing list",
      error: error.message,
    });
  }
});

// ============================================================================
// COMPANY SYNC ENDPOINTS
// ============================================================================

/**
 * POST /api/odoo/companies/:id/sync
 * Sync a single company to Odoo
 */
router.post("/companies/:id/sync", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = getOdooService();

    const mailingContactId = await service.syncCompanyToOdoo(id);

    res.json({
      success: true,
      data: {
        companyId: id,
        odooMailingContactId: mailingContactId,
      },
      message: "Company synced to Odoo successfully",
    });
  } catch (error: any) {
    console.error("Error syncing company to Odoo:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync company to Odoo",
      error: error.message,
    });
  }
});

/**
 * PUT /api/odoo/companies/:id/update
 * Update existing company data in Odoo
 */
router.put("/companies/:id/update", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = getOdooService();

    const success = await service.updateCompanyInOdoo(id);

    res.json({
      success: true,
      data: {
        companyId: id,
        updated: success,
      },
      message: "Company updated in Odoo successfully",
    });
  } catch (error: any) {
    console.error("Error updating company in Odoo:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update company in Odoo",
      error: error.message,
    });
  }
});

/**
 * POST /api/odoo/companies/sync-bulk
 * Sync multiple companies to Odoo
 */
router.post("/companies/sync-bulk", async (req: Request, res: Response) => {
  try {
    const { companyIds } = req.body;

    if (!companyIds || !Array.isArray(companyIds)) {
      res.status(400).json({
        success: false,
        message: "companyIds array is required",
      });
      return;
    }

    const service = getOdooService();
    const mailingContactIds = await service.syncCompaniesToOdoo(companyIds);

    res.json({
      success: true,
      data: {
        syncedCount: mailingContactIds.length,
        mailingContactIds,
      },
      message: `${mailingContactIds.length} companies synced to Odoo successfully`,
    });
  } catch (error: any) {
    console.error("Error syncing companies to Odoo:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync companies to Odoo",
      error: error.message,
    });
  }
});

/**
 * PUT /api/odoo/companies/update-bulk
 * Update multiple companies in Odoo
 */
router.put("/companies/update-bulk", async (req: Request, res: Response) => {
  try {
    const { companyIds } = req.body;

    if (!companyIds || !Array.isArray(companyIds)) {
      res.status(400).json({
        success: false,
        message: "companyIds array is required",
      });
      return;
    }

    const service = getOdooService();
    let updatedCount = 0;
    const errors: string[] = [];

    for (const companyId of companyIds) {
      try {
        await service.updateCompanyInOdoo(companyId);
        updatedCount++;
      } catch (error: any) {
        console.error(`Failed to update company ${companyId}:`, error);
        errors.push(`${companyId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      data: {
        updatedCount,
        totalRequested: companyIds.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `${updatedCount} companies updated in Odoo successfully`,
    });
  } catch (error: any) {
    console.error("Error updating companies in Odoo:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update companies in Odoo",
      error: error.message,
    });
  }
});

/**
 * GET /api/odoo/companies/:id/status
 * Check if a company is synced to Odoo
 */
router.get("/companies/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = getOdooService();

    const isSynced = await service.isCompanySynced(id);
    const mailingContactId = isSynced
      ? await service.getCompanyOdooMailingContactId(id)
      : null;

    res.json({
      success: true,
      data: {
        companyId: id,
        isSynced,
        odooMailingContactId: mailingContactId,
      },
    });
  } catch (error: any) {
    console.error("Error checking company sync status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check company sync status",
      error: error.message,
    });
  }
});

// ============================================================================
// MAILING LIST SUBSCRIPTION ENDPOINTS
// ============================================================================

/**
 * POST /api/odoo/companies/:id/add-to-list
 * Add a company to a mailing list (syncs to Odoo first if needed)
 */
router.post(
  "/companies/:id/add-to-list",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { mailingListId } = req.body;

      if (!mailingListId) {
        res.status(400).json({
          success: false,
          message: "mailingListId is required",
        });
        return;
      }

      const service = getOdooService();
      const subscriptionId = await service.addCompanyToMailingList(
        id,
        parseInt(mailingListId)
      );

      res.json({
        success: true,
        data: {
          companyId: id,
          mailingListId: parseInt(mailingListId),
          subscriptionId,
        },
        message: "Company added to mailing list successfully",
      });
    } catch (error: any) {
      console.error("Error adding company to mailing list:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add company to mailing list",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/odoo/companies/add-to-list-bulk
 * Add multiple companies to a mailing list
 */
router.post(
  "/companies/add-to-list-bulk",
  async (req: Request, res: Response) => {
    try {
      const { companyIds, mailingListId } = req.body;

      if (!companyIds || !Array.isArray(companyIds)) {
        res.status(400).json({
          success: false,
          message: "companyIds array is required",
        });
        return;
      }

      if (!mailingListId) {
        res.status(400).json({
          success: false,
          message: "mailingListId is required",
        });
        return;
      }

      const service = getOdooService();
      console.log(`[Odoo] Bulk add: ${companyIds.length} companies to list ${mailingListId}`);
      const subscriptionIds = await service.addCompaniesToMailingList(
        companyIds,
        parseInt(mailingListId)
      );

      console.log(`[Odoo] Bulk add complete: ${subscriptionIds.length} added`);
      res.json({
        success: true,
        data: {
          addedCount: subscriptionIds.length,
          mailingListId: parseInt(mailingListId),
          subscriptionIds,
        },
        message: `${subscriptionIds.length} companies added to mailing list successfully`,
      });
    } catch (error: any) {
      console.error("[Odoo] Bulk add error:", error?.message || error);
      res.status(500).json({
        success: false,
        message: "Failed to add companies to mailing list",
        error: error?.message || String(error),
      });
    }
  }
);

/**
 * POST /api/odoo/companies/create-list-with-companies
 * Create a new mailing list and add companies to it
 */
router.post(
  "/companies/create-list-with-companies",
  async (req: Request, res: Response) => {
    try {
      const { name, companyIds } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: "Mailing list name is required",
        });
        return;
      }

      const service = getOdooService();
      const listId = await service.createMailingListWithCompanies(
        name,
        companyIds
      );

      // Get the created list details
      const list = await service.getMailingList(listId);

      res.status(201).json({
        success: true,
        data: list,
        message: "Mailing list created and companies added successfully",
      });
    } catch (error: any) {
      console.error("Error creating mailing list with companies:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create mailing list with companies",
        error: error.message,
      });
    }
  }
);

export default router;
