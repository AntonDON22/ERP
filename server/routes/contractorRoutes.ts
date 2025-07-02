import { Router } from "express";
import { ContractorService } from "../services/contractorService";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiLogger } from "../../shared/logger";

const router = Router();
const contractorService = new ContractorService();

// Валидация для удаления контрагентов
const deleteContractorsSchema = z.object({
  contractorIds: z.array(z.number()).min(1, "Укажите хотя бы одного контрагента для удаления"),
});

// GET /api/contractors
router.get("/", async (req, res) => {
  try {
    const contractors = await contractorService.getAll();
    res.json(contractors);
  } catch (error) {
    apiLogger.error("Failed to get contractors", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения контрагентов" });
  }
});

// GET /api/contractors/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID контрагента" });
    }

    const contractor = await contractorService.getById(id);
    if (!contractor) {
      return res.status(404).json({ error: "Контрагент не найден" });
    }

    res.json(contractor);
  } catch (error) {
    apiLogger.error("Failed to get contractor", {
      contractorId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка получения контрагента" });
  }
});

// POST /api/contractors
router.post("/", async (req, res) => {
  try {
    const contractor = await contractorService.create(req.body);
    res.status(201).json(contractor);
  } catch (error) {
    apiLogger.error("Failed to create contractor", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка создания контрагента" });
  }
});

// PUT /api/contractors/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID контрагента" });
    }

    const contractor = await contractorService.update(id, req.body);
    if (!contractor) {
      return res.status(404).json({ error: "Контрагент не найден" });
    }

    res.json(contractor);
  } catch (error) {
    apiLogger.error("Failed to update contractor", {
      contractorId: req.params.id,
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка обновления контрагента" });
  }
});

// DELETE /api/contractors/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Некорректный ID контрагента" });
    }

    const success = await contractorService.delete(id);
    if (!success) {
      return res.status(404).json({ error: "Контрагент не найден" });
    }

    res.json({ success: true });
  } catch (error) {
    apiLogger.error("Failed to delete contractor", {
      contractorId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления контрагента" });
  }
});

// POST /api/contractors/delete-multiple
router.post("/delete-multiple", async (req, res) => {
  try {
    const validatedData = deleteContractorsSchema.parse(req.body);
    const results = await contractorService.deleteMultiple(validatedData.contractorIds);
    res.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }

    apiLogger.error("Failed to delete multiple contractors", {
      body: req.body,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Ошибка удаления контрагентов" });
  }
});

export default router;
