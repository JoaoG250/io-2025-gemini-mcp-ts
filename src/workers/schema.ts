import {
  makeSchema,
  objectType,
  nonNull,
  stringArg,
  inputObjectType,
  nullable,
} from "nexus";
import { join } from "path";
import type { Context } from "./context";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { ApolloServerErrorCode } from "@apollo/server/errors";

const createWorkerSchema = z.object({
  name: z.string().min(1).trim(),
  email: z.email().trim().toLowerCase(),
  position: z.string().min(1).trim(),
  salary: z.number().nonnegative(),
});

const updateWorkerSchema = z.object({
  name: z.string().min(1).trim().optional(),
  email: z.email().trim().toLowerCase().optional(),
  position: z.string().min(1).trim().optional(),
  salary: z.number().nonnegative().optional(),
});

export const Worker = objectType({
  name: "Worker",
  definition(t) {
    t.nonNull.string("id");
    t.nonNull.string("name");
    t.nonNull.string("email");
    t.nonNull.string("position");
    t.nonNull.float("salary");
  },
});

const CreateWorkerInput = inputObjectType({
  name: "CreateWorkerInput",
  definition(t) {
    t.nonNull.string("name");
    t.nonNull.string("email");
    t.nonNull.string("position");
    t.nonNull.float("salary");
  },
});

const UpdateWorkerInput = inputObjectType({
  name: "UpdateWorkerInput",
  definition(t) {
    t.string("name");
    t.string("email");
    t.string("position");
    t.float("salary");
  },
});

const WorkerFilterInput = inputObjectType({
  name: "WorkerFilterInput",
  definition(t) {
    t.string("name");
    t.string("email");
    t.string("position");
  },
});

export const Query = objectType({
  name: "Query",
  definition(t) {
    t.field("worker", {
      type: "Worker",
      args: { id: nonNull(stringArg()) },
      resolve: async (_root, args, ctx: Context) => {
        return ctx.prisma.worker.findUnique({ where: { id: args.id } });
      },
    });

    t.nonNull.list.nonNull.field("workers", {
      type: "Worker",
      args: {
        filter: nullable(WorkerFilterInput),
      },
      resolve: async (_root, { filter }, ctx: Context) => {
        let and: Prisma.WorkerWhereInput[] = [];

        if (filter) {
          if (filter.name) {
            and.push({ name: { contains: filter.name } });
          }
          if (filter.email) {
            and.push({
              email: { contains: filter.email },
            });
          }
          if (filter.position) {
            and.push({
              position: { contains: filter.position },
            });
          }
        }

        return ctx.prisma.worker.findMany({
          where: and.length ? { AND: and } : undefined,
        });
      },
    });
  },
});

export const Mutation = objectType({
  name: "Mutation",
  definition(t) {
    t.field("createWorker", {
      type: nonNull("Worker"),
      args: { data: nonNull(CreateWorkerInput) },
      resolve: async (_root, { data }, ctx: Context) => {
        const parsed = createWorkerSchema.parse(data);
        return ctx.prisma.worker.create({ data: { ...parsed } });
      },
    });

    t.field("updateWorker", {
      type: nonNull("Worker"),
      args: {
        id: nonNull(stringArg()),
        data: nonNull(UpdateWorkerInput),
      },
      resolve: async (_root, { id, data }, ctx: Context) => {
        const parsed = updateWorkerSchema.parse(data);
        const workerExists = await ctx.prisma.worker.count({ where: { id } });
        if (!workerExists) {
          throw new GraphQLError(`Worker ${id} not found`, {
            extensions: { code: ApolloServerErrorCode.BAD_REQUEST },
          });
        }
        return ctx.prisma.worker.update({
          where: { id },
          data: {
            ...(parsed.name ? { name: parsed.name } : {}),
            ...(parsed.email ? { email: parsed.email } : {}),
            ...(parsed.position ? { position: parsed.position } : {}),
            ...(parsed.salary !== undefined ? { salary: parsed.salary } : {}),
          },
        });
      },
    });

    t.field("deleteWorker", {
      type: nonNull("Worker"),
      args: { id: nonNull(stringArg()) },
      resolve: async (_root, { id }, ctx: Context) => {
        return ctx.prisma.worker.delete({ where: { id } });
      },
    });
  },
});

export const schema = makeSchema({
  types: [Worker, Query, Mutation],
  plugins: [],
  outputs: {
    typegen: join(
      process.cwd(),
      "node_modules",
      "@types",
      "nexus-typegen",
      "index.d.ts"
    ),
    schema: join(
      process.cwd(),
      "src",
      "workers",
      "generated",
      "schema.graphql"
    ),
  },
  contextType: {
    module: join(process.cwd(), "src", "workers", "context.ts"),
    export: "Context",
  },
});
