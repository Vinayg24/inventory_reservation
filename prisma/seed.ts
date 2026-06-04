import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    name: "Wireless Headphones",
    sku: "WH-001",
    price: 99.99,
    description: "Premium noise-cancelling",
  },
  {
    name: "Mechanical Keyboard",
    sku: "MK-002",
    price: 149.99,
    description: "Tenkeyless, Cherry MX",
  },
  {
    name: "USB-C Hub",
    sku: "UH-003",
    price: 49.99,
    description: "7-in-1 multiport adapter",
  },
];

const warehouses = [
  { name: "London Warehouse", location: "London, UK" },
  { name: "Berlin Warehouse", location: "Berlin, DE" },
];

async function main(): Promise<void> {
  console.log("Seeding database...");

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        price: product.price,
        description: product.description,
      },
      create: product,
    });
  }

  for (const warehouse of warehouses) {
    const existing = await prisma.warehouse.findFirst({
      where: { name: warehouse.name },
    });

    if (!existing) {
      await prisma.warehouse.create({ data: warehouse });
    }
  }

  const allProducts = await prisma.product.findMany();
  const allWarehouses = await prisma.warehouse.findMany();

  for (const product of allProducts) {
    for (const warehouse of allWarehouses) {
      await prisma.inventory.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: warehouse.id,
          },
        },
        update: {
          totalUnits: 10,
          reservedUnits: 0,
        },
        create: {
          productId: product.id,
          warehouseId: warehouse.id,
          totalUnits: 10,
          reservedUnits: 0,
        },
      });
    }
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
