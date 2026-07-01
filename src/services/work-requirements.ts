import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../libs/prisma.js";

const WorkRequirementCreateSchema = z.object({
  title: z.string().min(1).max(255),
  categoryId: z.number().int().positive(),
  location: z.string().min(1).max(255),
  estimatedValue: z.number().positive(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  expectedStartDate: z.coerce.date().optional(),
  status: z.enum(["draft", "open", "assigned", "closed"]).optional(),
  createdBy: z.number().int().positive(),
});

const WorkRequirementUpdateSchema = WorkRequirementCreateSchema.omit({ createdBy: true }).partial();

const getAllWorkRequirements = async (req: Request, res: Response) => {
  try {
    const reqs = await prisma.workRequirement.findMany({
      include: { category: true },
    });
    res.status(200).json(reqs);
  } catch (error) {
    console.error("Error fetching work requirements:", error);
    res.status(500).json({ error: "Failed to fetch work requirements" });
  }
};

const getWorkRequirementById = async (req: Request, res: Response) => {
  const reqId = Number(req.params.id);
  try {
    const workReq = await prisma.workRequirement.findUnique({
      where: { id: reqId },
      include: { category: true, ratings: true },
    });
    if (!workReq) {
      res.status(404).json({ error: "Work requirement not found" });
      return;
    }
    res.status(200).json(workReq);
  } catch (error) {
    console.error(`Error fetching work requirement ${reqId}:`, error);
    res.status(500).json({ error: "Failed to fetch work requirement" });
  }
};

const createWorkRequirement = async (req: Request, res: Response) => {
  const parsed = WorkRequirementCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  try {
    const { title, categoryId, location, estimatedValue, priority, expectedStartDate, status, createdBy } = parsed.data;
    const workReq = await prisma.workRequirement.create({
      data: {
        title,
        categoryId,
        location,
        estimatedValue,
        createdBy,
        expectedStartDate: expectedStartDate ?? null,
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
      },
      include: { category: true },
    });
    res.status(201).json(workReq);
  } catch (error: any) {
    if (error?.code === "P2003") {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    console.error("Error creating work requirement:", error);
    res.status(500).json({ error: "Failed to create work requirement" });
  }
};

const updateWorkRequirement = async (req: Request, res: Response) => {
  const reqId = Number(req.params.id);
  const parsed = WorkRequirementUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  try {
    const { title, categoryId, location, estimatedValue, priority, expectedStartDate, status } = parsed.data;
    const workReq = await prisma.workRequirement.update({
      where: { id: reqId },
      data: {
        ...(title !== undefined && { title }),
        ...(categoryId !== undefined && { categoryId }),
        ...(location !== undefined && { location }),
        ...(estimatedValue !== undefined && { estimatedValue }),
        ...(priority !== undefined && { priority }),
        ...(expectedStartDate !== undefined && { expectedStartDate }),
        ...(status !== undefined && { status }),
      },
      include: { category: true },
    });
    res.status(200).json(workReq);
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Work requirement not found" });
      return;
    }
    if (error?.code === "P2003") {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    console.error(`Error updating work requirement ${reqId}:`, error);
    res.status(500).json({ error: "Failed to update work requirement" });
  }
};

const deleteWorkRequirement = async (req: Request, res: Response) => {
  const reqId = Number(req.params.id);
  try {
    await prisma.workRequirement.delete({ where: { id: reqId } });
    res.status(200).json({ message: "Work requirement deleted" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Work requirement not found" });
      return;
    }
    console.error(`Error deleting work requirement ${reqId}:`, error);
    res.status(500).json({ error: "Failed to delete work requirement" });
  }
};

export {
  getAllWorkRequirements,
  getWorkRequirementById,
  createWorkRequirement,
  updateWorkRequirement,
  deleteWorkRequirement,
};
