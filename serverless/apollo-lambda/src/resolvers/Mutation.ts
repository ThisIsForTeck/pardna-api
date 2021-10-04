import { Context } from "../context";

type CreatePersonArgs = {
  firstName: string;
  lastName: string;
};

const Mutations = {
  createUser: async (
    parent: any,
    { firstName, lastName }: CreatePersonArgs,
    context: Context,
  ) => {
    return context.prisma.user.create({
      data: { firstName, lastName },
    });
  },
};

export default Mutations;
