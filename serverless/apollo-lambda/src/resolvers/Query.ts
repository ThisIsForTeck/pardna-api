import { Context } from "../context";

type PardnaArgs = {
  id: string;
};

const Query = {
  users: (parent: any, args: any, context: Context) =>
    context.prisma.user.findMany(),
  pardnas: (parent: any, args: any, context: Context) =>
    context.prisma.pardna.findMany({
      include: {
        participants: {
          include: {
            payments: true,
          },
        },
      },
    }),
  pardna: (parent: any, { id }: PardnaArgs, context: Context) =>
    context.prisma.pardna.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            payments: true,
          },
        },
      },
    }),
};

export default Query;
