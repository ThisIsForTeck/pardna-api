import { Context } from "../context";

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
};

export default Query;
