import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../libs/prisma.js";

const RecommendationQuerySchema = z.object({
  workRequirementId: z.coerce.number().int().positive(),
});

const getRecommendations = async (req: Request, res: Response) => {
  const parsed = RecommendationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { workRequirementId } = parsed.data;

  try {
    const workReq = await prisma.workRequirement.findUnique({
      where: { id: workRequirementId },
      include: { category: true },
    });

    if (!workReq) {
      res.status(404).json({ error: "Work requirement not found" });
      return;
    }

    // Find all active vendors that:
    //   1. Operate in the work requirement's location
    //   2. Are assigned to the work requirement's category
    const eligibleVendors = await prisma.vendor.findMany({
      where: {
        currentStatus: "active",
        locations: { some: { location: workReq.location } },
        categories: { some: { categoryId: workReq.categoryId } },
      },
      include: {
        ranks: {
          where: { categoryId: workReq.categoryId },
        },
        categories: { include: { category: true } },
        locations: true,
      },
    });

    // Sort: highest rankValue first; vendors with no rank row go to the bottom
    const ranked = eligibleVendors.sort((a, b) => {
      const rankA = a.ranks[0]?.rankValue ?? null;
      const rankB = b.ranks[0]?.rankValue ?? null;

      if (rankA === null && rankB === null) return 0;
      if (rankA === null) return 1;
      if (rankB === null) return -1;

      // Prisma returns Decimal as an object — convert to number for comparison
      return Number(rankB) - Number(rankA);
    });

    // Persist recommendations for audit trail (delete previous run first)
    await prisma.recommendation.deleteMany({ where: { workRequirementId } });
    if (ranked.length > 0) {
      await prisma.recommendation.createMany({
        data: ranked.map((vendor, index) => ({
          workRequirementId,
          vendorId: vendor.id,
          rankAtTimeOfRec: index + 1,
        })),
      });
    }

    // Shape the response
    const result = ranked.map((vendor, index) => ({
      position: index + 1,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        vendorType: vendor.vendorType,
        contactName: vendor.contactName,
        contactEmail: vendor.contactEmail,
        contactPhone: vendor.contactPhone,
        locations: vendor.locations.map((l) => l.location),
        categories: vendor.categories.map((c) => c.category.name),
      },
      rankValue: vendor.ranks[0]?.rankValue ?? null,
    }));

    res.status(200).json({
      workRequirement: {
        id: workReq.id,
        title: workReq.title,
        category: workReq.category.name,
        location: workReq.location,
        priority: workReq.priority,
        estimatedValue: workReq.estimatedValue,
      },
      totalMatches: result.length,
      recommendations: result,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
};

export { getRecommendations };
