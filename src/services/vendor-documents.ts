import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../libs/prisma.js";

const VendorDocumentCreateSchema = z.object({
  vendorId: z.number().int().positive(),
  documentType: z.enum([
    "tax_registration",
    "insurance",
    "trade_license",
    "safety_certificate",
    "agreement",
  ]),
  documentUrl: z.url(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).optional(),
  verifiedBy: z.number().int().positive().optional(),
});

const VendorDocumentUpdateSchema = VendorDocumentCreateSchema.omit({ vendorId: true }).partial();

const getAllVendorDocuments = async (req: Request, res: Response) => {
  try {
    const docs = await prisma.vendorDocument.findMany({
      include: { vendor: { select: { id: true, name: true } } },
    });
    res.status(200).json(docs);
  } catch (error) {
    console.error("Error fetching vendor documents:", error);
    res.status(500).json({ error: "Failed to fetch vendor documents" });
  }
};

const getVendorDocumentById = async (req: Request, res: Response) => {
  const docId = Number(req.params.id);
  try {
    const doc = await prisma.vendorDocument.findUnique({
      where: { id: docId },
      include: { vendor: { select: { id: true, name: true } } },
    });
    if (!doc) {
      res.status(404).json({ error: "Vendor document not found" });
      return;
    }
    res.status(200).json(doc);
  } catch (error) {
    console.error(`Error fetching vendor document ${docId}:`, error);
    res.status(500).json({ error: "Failed to fetch vendor document" });
  }
};

const createVendorDocument = async (req: Request, res: Response) => {
  const parsed = VendorDocumentCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  try {
    const { vendorId, documentType, documentUrl, issueDate, expiryDate, verificationStatus, verifiedBy } = parsed.data;
    const doc = await prisma.vendorDocument.create({
      data: {
        vendorId,
        documentType,
        documentUrl,
        issueDate: issueDate ?? null,
        expiryDate: expiryDate ?? null,
        verifiedBy: verifiedBy ?? null,
        ...(verificationStatus !== undefined && { verificationStatus }),
      },
    });
    res.status(201).json(doc);
  } catch (error: any) {
    if (error?.code === "P2003") {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    console.error("Error creating vendor document:", error);
    res.status(500).json({ error: "Failed to create vendor document" });
  }
};

const updateVendorDocument = async (req: Request, res: Response) => {
  const docId = Number(req.params.id);
  const parsed = VendorDocumentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  try {
    const { documentType, documentUrl, issueDate, expiryDate, verificationStatus, verifiedBy } = parsed.data;
    const doc = await prisma.vendorDocument.update({
      where: { id: docId },
      data: {
        ...(documentType !== undefined && { documentType }),
        ...(documentUrl !== undefined && { documentUrl }),
        ...(issueDate !== undefined && { issueDate }),
        ...(expiryDate !== undefined && { expiryDate }),
        ...(verificationStatus !== undefined && { verificationStatus }),
        ...(verifiedBy !== undefined && { verifiedBy }),
      },
    });
    res.status(200).json(doc);
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Vendor document not found" });
      return;
    }
    console.error(`Error updating vendor document ${docId}:`, error);
    res.status(500).json({ error: "Failed to update vendor document" });
  }
};

const deleteVendorDocument = async (req: Request, res: Response) => {
  const docId = Number(req.params.id);
  try {
    await prisma.vendorDocument.delete({ where: { id: docId } });
    res.status(200).json({ message: "Vendor document deleted" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Vendor document not found" });
      return;
    }
    console.error(`Error deleting vendor document ${docId}:`, error);
    res.status(500).json({ error: "Failed to delete vendor document" });
  }
};

export {
  getAllVendorDocuments,
  getVendorDocumentById,
  createVendorDocument,
  updateVendorDocument,
  deleteVendorDocument,
};
