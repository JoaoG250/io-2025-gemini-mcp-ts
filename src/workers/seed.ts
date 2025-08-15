import { PrismaClient, Worker } from "@prisma/client";

const workers: Worker[] = [
  {
    id: "cmec7roqc000008lba9t1gcah",
    name: "John Doe",
    email: "john.doe@example.com",
    position: "Analista de dados",
    salary: 3500,
  },
  {
    id: "cmec7roqc000108lba1t1gcah",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    position: "Desenvolvedor Frontend",
    salary: 4500,
  },
  {
    id: "cmec7roqc000208lba5t1gcah",
    name: "Alice Johnson",
    email: "alice.johnson@example.com",
    position: "Gerente de loja",
    salary: 6000,
  },
  {
    id: "cmec7roqc000308lba9t1gcah",
    name: "Bob Brown",
    email: "bob.brown@example.com",
    position: "Operador de caixa",
    salary: 2500,
  },
  {
    id: "cmec7roqc000408lba3t1gcah",
    name: "Charlie Davis",
    email: "charlie.davis@example.com",
    position: "Assistente administrativo",
    salary: 3000,
  },
  {
    id: "cmec7roqc000508lba7t1gcah",
    name: "Eve Wilson",
    email: "eve.wilson@example.com",
    position: "Repositor de estoque",
    salary: 2800,
  },
];

export async function seedDatabase() {
  const prisma = new PrismaClient();
  for (const worker of workers) {
    await prisma.worker.upsert({
      where: { email: worker.email },
      create: {
        name: worker.name,
        email: worker.email,
        position: worker.position,
        salary: worker.salary,
      },
      update: {},
    });
  }
}
