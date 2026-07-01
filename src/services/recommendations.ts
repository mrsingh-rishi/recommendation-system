import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../libs/prisma.js";
import { openrouter } from "../libs/openrouter.js";

const RecommendationQuerySchema = z.object({
  workRequirementId: z.coerce.number().int().positive(),
});

type RankedVendor = {
  position: number;
  vendor: {
    id: number;
    name: string;
    vendorType: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    locations: string[];
    categories: string[];
  };
  rankValue: string | null;
};

async function generateAISummary(
  workReq: { title: string; category: string; location: string; priority: string; estimatedValue: string },
  recommendations: RankedVendor[]
): Promise<string> {
  if (recommendations.length === 0) {
    return "No eligible vendors were found for this work requirement based on the current category and location filters.";
  }

  const topVendors = recommendations.slice(0, 5);

  const vendorLines = topVendors
    .map((r) =>
      `${r.position}. ${r.vendor.name} (${r.vendor.vendorType}) — Rank: ${r.rankValue ?? "Unranked (new vendor)"}, Locations: ${r.vendor.locations.join(", ")}`
    )
    .join("\n");

  const prompt = `You are an assistant for an internal vendor management platform used by an operations team.

A new work requirement has been created with the following details:
- Title: ${workReq.title}
- Category: ${workReq.category}
- Location: ${workReq.location}
- Priority: ${workReq.priority}
- Estimated Value: AED ${workReq.estimatedValue}

The system has ranked the following eligible vendors based on their historical performance ratings in this category:

${vendorLines}

Write a concise 3–4 sentence recommendation summary for the operations team. Mention the top vendor by name and explain why they lead the ranking. If any vendor is unranked, note that they are new with no prior performance data. Keep the tone professional and practical.`;

  const response = await openrouter.chat.completions.create({
    model: "openai/gpt-oss-120b:free",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0]?.message.content ?? "Summary could not be generated.";
}

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

    // Find all active vendors that match both category and location
    const eligibleVendors = await prisma.vendor.findMany({
      where: {
        currentStatus: "active",
        locations: { some: { location: workReq.location } },
        categories: { some: { categoryId: workReq.categoryId } },
      },
      include: {
        ranks: { where: { categoryId: workReq.categoryId } },
        categories: { include: { category: true } },
        locations: true,
      },
    });

    // Sort: highest rankValue first; unranked vendors go to the bottom
    const ranked = eligibleVendors.sort((a, b) => {
      const rankA = a.ranks[0]?.rankValue ?? null;
      const rankB = b.ranks[0]?.rankValue ?? null;

      if (rankA === null && rankB === null) return 0;
      if (rankA === null) return 1;
      if (rankB === null) return -1;

      return Number(rankB) - Number(rankA);
    });

    // Persist for audit trail (replace previous run)
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

    // Shape the ranked list
    const result: RankedVendor[] = ranked.map((vendor, index) => ({
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
      rankValue: vendor.ranks[0]?.rankValue?.toString() ?? null,
    }));

    // Generate AI summary — if Gemini fails, return results without summary
    let aiSummary: string | null = null;
    try {
      aiSummary = await generateAISummary(
        {
          title: workReq.title,
          category: workReq.category.name,
          location: workReq.location,
          priority: workReq.priority,
          estimatedValue: workReq.estimatedValue.toString(),
        },
        result
      );
    } catch (aiError) {
      console.error("AI summary generation failed:", aiError);
    }

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
      aiSummary,
      recommendations: result,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
};

export { getRecommendations };
