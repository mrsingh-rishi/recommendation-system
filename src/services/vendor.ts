import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../libs/prisma.js";

const VendorCreateSchema = z.object({
  name: z.string().min(1).max(255),
  vendorType: z.string().min(1).max(100),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.email().optional(),
  currentStatus: z
    .enum(["active", "inactive", "blacklisted", "pending_verification"])
    .optional(),
});

const VendorUpdateSchema = VendorCreateSchema.partial();

const getAllVendors = async (req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        categories: { include: { category: true } },
        locations: true,
      },
    });
    res.status(200).json(vendors);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
};

const getVendorById = async (req: Request, res: Response) => {
  const vendorId = Number(req.params.id);
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        categories: { include: { category: true } },
        locations: true,
        documents: true,
        ranks: { include: { category: true } },
      },
    });
    if (!vendor) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    res.status(200).json(vendor);
  } catch (error) {
    console.error(`Error fetching vendor ${vendorId}:`, error);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
};

const createVendor = async (req: Request, res: Response) => {
  const parsed = VendorCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  try {
    const { name, vendorType, contactName, contactPhone, contactEmail, currentStatus } = parsed.data;
    const vendor = await prisma.vendor.create({
      data: {
        name,
        vendorType,
        contactName: contactName ?? null,
        contactPhone: contactPhone ?? null,
        contactEmail: contactEmail ?? null,
        ...(currentStatus !== undefined && { currentStatus }),
      },
    });
    res.status(201).json(vendor);
  } catch (error) {
    console.error("Error creating vendor:", error);
    res.status(500).json({ error: "Failed to create vendor" });
  }
};

const updateVendor = async (req: Request, res: Response) => {
  const vendorId = Number(req.params.id);
  const parsed = VendorUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  try {
    const { name, vendorType, contactName, contactPhone, contactEmail, currentStatus } = parsed.data;
    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(name !== undefined && { name }),
        ...(vendorType !== undefined && { vendorType }),
        ...(contactName !== undefined && { contactName }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(currentStatus !== undefined && { currentStatus }),
      },
    });
    res.status(200).json(vendor);
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    console.error(`Error updating vendor ${vendorId}:`, error);
    res.status(500).json({ error: "Failed to update vendor" });
  }
};

const deleteVendor = async (req: Request, res: Response) => {
  const vendorId = Number(req.params.id);
  try {
    await prisma.vendor.delete({ where: { id: vendorId } });
    res.status(200).json({ message: "Vendor deleted" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    console.error(`Error deleting vendor ${vendorId}:`, error);
    res.status(500).json({ error: "Failed to delete vendor" });
  }
};

export { getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor };
