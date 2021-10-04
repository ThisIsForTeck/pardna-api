import { Context } from "../context";

const Query = {
  users: (parent: any, args: any, context: Context) =>
    context.prisma.user.findMany(),
};

export default Query;
