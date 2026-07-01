import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Wipe existing data (FK-safe order) ────────────────────────────────
  await prisma.recommendation.deleteMany();
  await prisma.vendorRating.deleteMany();
  await prisma.vendorRank.deleteMany();
  await prisma.vendorDocument.deleteMany();
  await prisma.vendorLocation.deleteMany();
  await prisma.vendorCategory.deleteMany();
  await prisma.workRequirement.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.category.deleteMany();
  console.log("✓ Cleared existing data");

  // ─── Categories ─────────────────────────────────────────────────────────
  const [electrical, plumbing, hvac, civil, it] = await Promise.all([
    prisma.category.create({ data: { name: "Electrical" } }),
    prisma.category.create({ data: { name: "Plumbing" } }),
    prisma.category.create({ data: { name: "HVAC" } }),
    prisma.category.create({ data: { name: "Civil Works" } }),
    prisma.category.create({ data: { name: "IT Services" } }),
  ]);
  console.log("✓ Categories");

  // ─── Vendors ────────────────────────────────────────────────────────────
  const [powerTech, volta, aquaFlow, pipeMasters, coolAir, buildRight, techPro, multiSkill] =
    await Promise.all([
      prisma.vendor.create({
        data: {
          name: "PowerTech Solutions",
          vendorType: "Contractor",
          contactName: "Ahmed Al Farsi",
          contactPhone: "+971501234567",
          contactEmail: "ahmed@powertech.ae",
          currentStatus: "active",
        },
      }),
      prisma.vendor.create({
        data: {
          name: "Volta Electric Co.",
          vendorType: "Contractor",
          contactName: "Sara Khalid",
          contactPhone: "+971502345678",
          contactEmail: "sara@voltaelectric.ae",
          currentStatus: "active",
        },
      }),
      prisma.vendor.create({
        data: {
          name: "AquaFlow Plumbing",
          vendorType: "Contractor",
          contactName: "Mohammed Hassan",
          contactPhone: "+971503456789",
          contactEmail: "mhassan@aquaflow.ae",
          currentStatus: "active",
        },
      }),
      prisma.vendor.create({
        data: {
          name: "PipeMasters Ltd.",
          vendorType: "Contractor",
          contactName: "Ravi Kumar",
          contactPhone: "+971504567890",
          contactEmail: "ravi@pipemasters.ae",
          currentStatus: "active",
        },
      }),
      prisma.vendor.create({
        data: {
          name: "CoolAir HVAC Systems",
          vendorType: "Specialist",
          contactName: "Layla Mansoor",
          contactPhone: "+971505678901",
          contactEmail: "layla@coolair.ae",
          currentStatus: "active",
        },
      }),
      prisma.vendor.create({
        data: {
          name: "BuildRight Construction",
          vendorType: "General Contractor",
          contactName: "Omar Abdullah",
          contactPhone: "+971506789012",
          contactEmail: "omar@buildright.ae",
          currentStatus: "active",
        },
      }),
      prisma.vendor.create({
        data: {
          name: "TechPro IT Solutions",
          vendorType: "Specialist",
          contactName: "Priya Nair",
          contactPhone: "+971507890123",
          contactEmail: "priya@techpro.ae",
          currentStatus: "active",
        },
      }),
      prisma.vendor.create({
        data: {
          name: "MultiSkill Services",
          vendorType: "Contractor",
          contactName: "James Williams",
          contactPhone: "+971508901234",
          contactEmail: "james@multiskill.ae",
          currentStatus: "active",
        },
      }),
    ]);
  console.log("✓ Vendors");

  // ─── Vendor ↔ Category assignments ──────────────────────────────────────
  await prisma.vendorCategory.createMany({
    data: [
      { vendorId: powerTech.id, categoryId: electrical.id, addedBy: 1 },
      { vendorId: volta.id, categoryId: electrical.id, addedBy: 1 },
      { vendorId: aquaFlow.id, categoryId: plumbing.id, addedBy: 1 },
      { vendorId: pipeMasters.id, categoryId: plumbing.id, addedBy: 1 },
      { vendorId: coolAir.id, categoryId: hvac.id, addedBy: 1 },
      { vendorId: buildRight.id, categoryId: civil.id, addedBy: 1 },
      { vendorId: techPro.id, categoryId: it.id, addedBy: 1 },
      // MultiSkill covers both Electrical and HVAC
      { vendorId: multiSkill.id, categoryId: electrical.id, addedBy: 1 },
      { vendorId: multiSkill.id, categoryId: hvac.id, addedBy: 1 },
    ],
  });
  console.log("✓ VendorCategories");

  // ─── Vendor operating locations ──────────────────────────────────────────
  await prisma.vendorLocation.createMany({
    data: [
      { vendorId: powerTech.id, location: "Dubai" },
      { vendorId: powerTech.id, location: "Abu Dhabi" },
      { vendorId: volta.id, location: "Dubai" },
      { vendorId: volta.id, location: "Sharjah" },
      { vendorId: aquaFlow.id, location: "Abu Dhabi" },
      { vendorId: aquaFlow.id, location: "Al Ain" },
      { vendorId: pipeMasters.id, location: "Dubai" },
      { vendorId: pipeMasters.id, location: "Abu Dhabi" },
      { vendorId: coolAir.id, location: "Dubai" },
      { vendorId: coolAir.id, location: "Abu Dhabi" },
      { vendorId: coolAir.id, location: "Sharjah" },
      { vendorId: buildRight.id, location: "Dubai" },
      { vendorId: techPro.id, location: "Dubai" },
      { vendorId: techPro.id, location: "Abu Dhabi" },
      { vendorId: multiSkill.id, location: "Dubai" },
    ],
  });
  console.log("✓ VendorLocations");

  // ─── Vendor documents ────────────────────────────────────────────────────
  const allVendors = [powerTech, volta, aquaFlow, pipeMasters, coolAir, buildRight, techPro, multiSkill];
  await prisma.vendorDocument.createMany({
    data: allVendors.flatMap((v) => [
      {
        vendorId: v.id,
        documentType: "trade_license" as const,
        documentUrl: `https://docs.example.com/${v.id}/trade-license.pdf`,
        issueDate: new Date("2024-01-01"),
        expiryDate: new Date("2026-12-31"),
        verificationStatus: "verified" as const,
        verifiedBy: 1,
      },
      {
        vendorId: v.id,
        documentType: "insurance" as const,
        documentUrl: `https://docs.example.com/${v.id}/insurance.pdf`,
        issueDate: new Date("2024-06-01"),
        expiryDate: new Date("2025-12-31"),
        verificationStatus: "verified" as const,
        verifiedBy: 1,
      },
      {
        vendorId: v.id,
        documentType: "safety_certificate" as const,
        documentUrl: `https://docs.example.com/${v.id}/safety.pdf`,
        issueDate: new Date("2024-03-01"),
        expiryDate: new Date("2025-09-30"),
        verificationStatus: "verified" as const,
        verifiedBy: 1,
      },
    ]),
  });
  console.log("✓ VendorDocuments");

  // ─── Work Requirements ────────────────────────────────────────────────────
  // Three CLOSED — these are what ratings are based on (historical work)
  const [wrElecDubaiPast, wrHvacDubaiPast, wrPlumbADPast] = await Promise.all([
    prisma.workRequirement.create({
      data: {
        title: "Head Office Electrical Installation (Phase 1)",
        categoryId: electrical.id,
        location: "Dubai",
        estimatedValue: 120000,
        priority: "high",
        expectedStartDate: new Date("2025-01-15"),
        status: "closed",
        createdBy: 1,
      },
    }),
    prisma.workRequirement.create({
      data: {
        title: "Data Center HVAC Upgrade",
        categoryId: hvac.id,
        location: "Dubai",
        estimatedValue: 90000,
        priority: "urgent",
        expectedStartDate: new Date("2025-02-01"),
        status: "closed",
        createdBy: 1,
      },
    }),
    prisma.workRequirement.create({
      data: {
        title: "Factory Plumbing Overhaul",
        categoryId: plumbing.id,
        location: "Abu Dhabi",
        estimatedValue: 75000,
        priority: "medium",
        expectedStartDate: new Date("2025-03-10"),
        status: "closed",
        createdBy: 1,
      },
    }),
  ]);

  // Five OPEN — use these IDs to test GET /recommendations?workRequirementId={id}
  const [wrElecDubai, wrHvacDubai, wrPlumbAD, wrITDubai, wrElecAD] = await Promise.all([
    prisma.workRequirement.create({
      data: {
        title: "New Office Electrical Upgrade",
        categoryId: electrical.id,
        location: "Dubai",
        estimatedValue: 150000,
        priority: "high",
        expectedStartDate: new Date("2026-08-01"),
        status: "open",
        createdBy: 1,
      },
    }),
    prisma.workRequirement.create({
      data: {
        title: "Server Room HVAC Installation",
        categoryId: hvac.id,
        location: "Dubai",
        estimatedValue: 80000,
        priority: "urgent",
        expectedStartDate: new Date("2026-07-20"),
        status: "open",
        createdBy: 1,
      },
    }),
    prisma.workRequirement.create({
      data: {
        title: "Plumbing System Renovation",
        categoryId: plumbing.id,
        location: "Abu Dhabi",
        estimatedValue: 60000,
        priority: "medium",
        expectedStartDate: new Date("2026-08-15"),
        status: "open",
        createdBy: 1,
      },
    }),
    prisma.workRequirement.create({
      data: {
        title: "IT Infrastructure Upgrade",
        categoryId: it.id,
        location: "Dubai",
        estimatedValue: 200000,
        priority: "high",
        expectedStartDate: new Date("2026-09-01"),
        status: "open",
        createdBy: 1,
      },
    }),
    prisma.workRequirement.create({
      data: {
        title: "Building Electrical Maintenance",
        categoryId: electrical.id,
        location: "Abu Dhabi",
        estimatedValue: 45000,
        priority: "medium",
        expectedStartDate: new Date("2026-07-25"),
        status: "open",
        createdBy: 1,
      },
    }),
  ]);
  console.log("✓ WorkRequirements (3 closed for history + 5 open for testing)");

  // ─── Vendor ratings (on closed work requirements) ────────────────────────
  await prisma.vendorRating.createMany({
    data: [
      // Electrical in Dubai — PowerTech:4, Volta:5, MultiSkill:3
      { vendorId: powerTech.id, workRequirementId: wrElecDubaiPast.id, ratingValue: 4, ratedBy: 1, notes: "Good work, minor delays on final day" },
      { vendorId: volta.id, workRequirementId: wrElecDubaiPast.id, ratingValue: 5, ratedBy: 1, notes: "Excellent quality, delivered on time" },
      { vendorId: multiSkill.id, workRequirementId: wrElecDubaiPast.id, ratingValue: 3, ratedBy: 1, notes: "Average performance, some rework required" },
      // HVAC in Dubai — CoolAir:5, MultiSkill:4
      { vendorId: coolAir.id, workRequirementId: wrHvacDubaiPast.id, ratingValue: 5, ratedBy: 1, notes: "Outstanding HVAC installation, zero issues" },
      { vendorId: multiSkill.id, workRequirementId: wrHvacDubaiPast.id, ratingValue: 4, ratedBy: 1, notes: "Good work, minor calibration issue fixed quickly" },
      // Plumbing in Abu Dhabi — AquaFlow:4, PipeMasters:5
      { vendorId: aquaFlow.id, workRequirementId: wrPlumbADPast.id, ratingValue: 4, ratedBy: 1, notes: "Solid workmanship" },
      { vendorId: pipeMasters.id, workRequirementId: wrPlumbADPast.id, ratingValue: 5, ratedBy: 1, notes: "Best in class, zero leaks, ahead of schedule" },
    ],
  });
  console.log("✓ VendorRatings");

  // ─── Vendor ranks (computed averages from ratings above) ─────────────────
  //   Electrical : Volta=5.0, PowerTech=4.0, MultiSkill=3.0
  //   HVAC       : CoolAir=5.0, MultiSkill=4.0
  //   Plumbing   : PipeMasters=5.0, AquaFlow=4.0
  await prisma.vendorRank.createMany({
    data: [
      { vendorId: volta.id, categoryId: electrical.id, rankValue: 5.0 },
      { vendorId: powerTech.id, categoryId: electrical.id, rankValue: 4.0 },
      { vendorId: multiSkill.id, categoryId: electrical.id, rankValue: 3.0 },
      { vendorId: coolAir.id, categoryId: hvac.id, rankValue: 5.0 },
      { vendorId: multiSkill.id, categoryId: hvac.id, rankValue: 4.0 },
      { vendorId: pipeMasters.id, categoryId: plumbing.id, rankValue: 5.0 },
      { vendorId: aquaFlow.id, categoryId: plumbing.id, rankValue: 4.0 },
    ],
  });
  console.log("✓ VendorRanks");

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                     SEED COMPLETE ✅                             ║
╠══════════════════════════════════════════════════════════════════╣
║  Test GET /api/recommendations?workRequirementId={id}           ║
╠══════════════════════════════════════════════════════════════════╣
║  ID  │ Title                            │ Expects (ranked)       ║
╠══════════════════════════════════════════════════════════════════╣
║  ${String(wrElecDubai.id).padEnd(3)} │ New Office Electrical (Dubai)    │ Volta→PowerTech→Multi  ║
║  ${String(wrHvacDubai.id).padEnd(3)} │ Server Room HVAC (Dubai)         │ CoolAir→MultiSkill     ║
║  ${String(wrPlumbAD.id).padEnd(3)} │ Plumbing Renovation (Abu Dhabi)  │ PipeMasters→AquaFlow   ║
║  ${String(wrITDubai.id).padEnd(3)} │ IT Infrastructure (Dubai)        │ TechPro (unranked)     ║
║  ${String(wrElecAD.id).padEnd(3)} │ Electrical Maintenance (AD)      │ PowerTech (Abu Dhabi)  ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
