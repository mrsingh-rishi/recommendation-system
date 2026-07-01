import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../libs/prisma.js";

const VendorRatingCreateSchema = z.object({
  vendorId: z.number().int().positive(),
  workRequirementId: z.number().int().positive(),
  ratingValue: z.number().int().min(1).max(5),
  ratedBy: z.number().int().positive(),
  notes: z.string().optional(),
});

const VendorRatingUpdateSchema = z.object({
  ratingValue: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

const getAllVendorRatings = async (req: Request, res: Response) => {
  try {
    const ratings = await prisma.vendorRating.findMany({
      include: {
        vendor: { select: { id: true, name: true } },
        workRequirement: { select: { id: true, title: true, categoryId: true } },
      },
    });
    res.status(200).json(ratings);
  } catch (error) {
    console.error("Error fetching vendor ratings:", error);
    res.status(500).json({ error: "Failed to fetch vendor ratings" });
  }
};

const createVendorRating = async (req: Request, res: Response) => {
  const parsed = VendorRatingCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { vendorId, workRequirementId, ratingValue, ratedBy, notes } = parsed.data;

  try {
    const workReq = await prisma.workRequirement.findUnique({
      where: { id: workRequirementId },
      select: { categoryId: true },
    });

    if (!workReq) {
      res.status(404).json({ error: "Work requirement not found" });
      return;
    }

    const rating = await prisma.vendorRating.create({
      data: { vendorId, workRequirementId, ratingValue, ratedBy, notes: notes ?? null },
    });

    // Recalculate and upsert the vendor rank for this category
    await recalculateVendorRank(vendorId, workReq.categoryId);

    res.status(201).json(rating);
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Rating already exists for this vendor and work requirement" });
      return;
    }
    if (error?.code === "P2003") {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    console.error("Error creating vendor rating:", error);
    res.status(500).json({ error: "Failed to create vendor rating" });
  }
};

const updateVendorRating = async (req: Request, res: Response) => {
  const ratingId = Number(req.params.id);
  const parsed = VendorRatingUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  try {
    const existing = await prisma.vendorRating.findUnique({
      where: { id: ratingId },
      include: { workRequirement: { select: { categoryId: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: "Rating not found" });
      return;
    }

    const { ratingValue, notes } = parsed.data;
    const updated = await prisma.vendorRating.update({
      where: { id: ratingId },
      data: {
        ...(ratingValue !== undefined && { ratingValue }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Recalculate rank because the rating value may have changed
    await recalculateVendorRank(existing.vendorId, existing.workRequirement.categoryId);

    res.status(200).json(updated);
  } catch (error) {
    console.error(`Error updating vendor rating ${ratingId}:`, error);
    res.status(500).json({ error: "Failed to update vendor rating" });
  }
};

const deleteVendorRating = async (req: Request, res: Response) => {
  const ratingId = Number(req.params.id);

  try {
    const existing = await prisma.vendorRating.findUnique({
      where: { id: ratingId },
      include: { workRequirement: { select: { categoryId: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: "Rating not found" });
      return;
    }

    await prisma.vendorRating.delete({ where: { id: ratingId } });

    // Recalculate rank after deletion; if no ratings remain the rank row is removed
    await recalculateVendorRank(existing.vendorId, existing.workRequirement.categoryId);

    res.status(200).json({ message: "Rating deleted" });
  } catch (error) {
    console.error(`Error deleting vendor rating ${ratingId}:`, error);
    res.status(500).json({ error: "Failed to delete vendor rating" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Rank recalculation trigger
//
// Computes the average rating a vendor has received across all work
// requirements that belong to the given category, then upserts that value
// into vendor_rank.  If the vendor has no ratings in the category (e.g. after
// a delete) the rank row is removed so stale data doesn't influence future
// recommendations.
// ─────────────────────────────────────────────────────────────────────────────
async function recalculateVendorRank(vendorId: number, categoryId: number) {
  const { _avg } = await prisma.vendorRating.aggregate({
    where: {
      vendorId,
      workRequirement: { categoryId },
    },
    _avg: { ratingValue: true },
  });

  const avg = _avg.ratingValue;

  if (avg === null) {
    // No ratings left in this category — drop the rank row if it exists
    await prisma.vendorRank.deleteMany({ where: { vendorId, categoryId } });
    return;
  }

  await prisma.vendorRank.upsert({
    where: { vendorId_categoryId: { vendorId, categoryId } },
    create: { vendorId, categoryId, rankValue: avg },
    update: { rankValue: avg },
  });
}

export { getAllVendorRatings, createVendorRating, updateVendorRating, deleteVendorRating };
