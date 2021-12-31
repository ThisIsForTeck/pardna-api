import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient({
  log: ["query"],
});

type User = {
  id: string;
  role: string;
};

export type Context = {
  prisma: PrismaClient;
  res: any; // TODO: fix any
  user: User | undefined;
};

const getUser = async (token: string): Promise<User | undefined> => {
  if (!token) return undefined;

  // decode the jwt and get the userId
  const { userId } = <{ userId: string }>(
    jwt.verify(token, process.env.APP_SECRET as string)
  );

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) return undefined;

    return {
      id: user.id,
      role: user.role,
    };
  } catch (error) {
    console.error({ error });
    return undefined;
  }
};

export const createContext = async ({ req }: any): Promise<Context> => {
  const { token } = req.cookies;
  const user = await getUser(token);

  return { prisma, res: req.res, user };
};
