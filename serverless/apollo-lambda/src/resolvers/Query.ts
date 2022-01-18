import { Context } from "../context";
import getUserIdFromContext from "../utils/geUserIdFromContext";

type PardnaArgs = {
  id: string;
};

const Query = {
  users: (parent: any, args: any, context: Context) =>
    context.prisma.user.findMany(),
  pardnas: (parent: any, args: any, context: Context) => {
    const userId = getUserIdFromContext(context);

    return context.prisma.pardna.findMany({
      where: {
        banker: {
          is: {
            id: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            payments: true,
          },
        },
      },
    });
  },
  pardna: async (parent: any, { id }: PardnaArgs, context: Context) =>
    context.prisma.pardna.findUnique({
      where: {
        id,
      },
      include: {
        ledger: true,
        participants: {
          include: {
            payments: true,
          },
        },
      },
    }),
  participants: (parent: any, args: any, context: Context) =>
    context.prisma.participant.findMany(),
  participant: async (parent: any, { id }: PardnaArgs, context: Context) =>
    context.prisma.participant.findUnique({
      where: {
        id,
      },
      include: {
        payments: true,
        pardna: true,
      },
    }),
  payments: (parent: any, args: any, context: Context) =>
    context.prisma.payment.findMany(),
  payment: async (parent: any, { id }: PardnaArgs, context: Context) =>
    context.prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        participant: true,
      },
    }),
};

export default Query;
