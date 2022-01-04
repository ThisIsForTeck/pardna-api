import bcrypt from "bcryptjs";
import isPast from "date-fns/isPast";
import jwt from "jsonwebtoken";
import { Context } from "../context";
import { Ledger, Participant } from "../types";
import createLedger from "../utils/createLedger";
import getUserIdFromContext from "../utils/geUserIdFromContext";

type ConnectArgs = { id: string };

type CreateUserArgs = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

type LogInArgs = {
  email: string;
  password: string;
};

type CreatePardnaArgs = {
  name: string;
  participants?: Participant[];
  contributionAmount?: number;
  startDate: Date;
  duration?: number;
  ledger: Ledger;
};

type UpdatePardnaArgs = {
  id: string;
  name?: string;
  addParticipants: Participant[];
  removeParticipants: ConnectArgs[];
  updateParticipants: Participant[];
  contributionAmount?: number;
  ledger?: Ledger;
  startDate?: Date;
  duration?: number;
};

type DeletePardnaArgs = {
  id: string;
};

const Mutations = {
  createUser: async (
    parent: any,
    { firstName, lastName, email, password }: CreateUserArgs,
    context: Context,
  ) => {
    const lowerCaseEmail = email.toLowerCase();

    // TODO: do some kind of check for taken username aswell
    const exists = await context.prisma.user.findUnique({ where: { email } });

    if (exists) {
      throw new Error(
        "email: Hmm, a user with that email already exists. Use another one or sign in.",
      );
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user in the db
    const user = await context.prisma.user.create({
      data: {
        firstName,
        lastName,
        email: lowerCaseEmail,
        password: hashedPassword,
      },
    });

    // create jwt token for user
    const token = jwt.sign(
      { userId: user.id },
      process.env.APP_SECRET as string,
    );

    // set the jwt as a cookie on the response
    context.res.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });

    // finally return user
    return user;
  },
  logIn: async (
    parent: any,
    { email, password }: LogInArgs,
    context: Context,
  ) => {
    // check if a user with email exists
    const user = await context.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new Error(
        "Hmm, we couldn't find that email in our records. Try again.",
      );
    }

    // check if the password is correct
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new Error(
        "Hmm, that password doesn't match the one we have on record. Try again.",
      );
    }

    // generate the jwt
    const token = jwt.sign(
      { userId: user.id },
      process.env.APP_SECRET as string,
    );

    // set cookie with the token
    context.res.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    return {
      user,
      token,
    };
  },
  logOut: (parent: any, args: {}, context: Context) => {
    context.res.clearCookie("token");

    return { message: "Goodbye!" };
  },
  createPardna: async (
    parent: any,
    {
      name,
      participants,
      contributionAmount,
      startDate,
      duration,
      ledger,
    }: CreatePardnaArgs,
    context: Context,
  ) => {
    // TODO: destructuring id from "USER | undefined" kept throwing errors so using function - look into this
    const userId = getUserIdFromContext(context);
    const ledgerCreate = createLedger(
      ledger,
      participants,
      startDate,
      duration,
    );

    // create pardna in the db
    return context.prisma.pardna.create({
      data: {
        name,
        banker: {
          connect: {
            id: userId,
          },
        },
        participants: {
          create: participants || undefined,
        },
        contributionAmount,
        startDate,
        duration,
        ledger: {
          create: ledgerCreate,
        },
      },
    });
  },
  updatePardna: async (
    parent: any,
    {
      id,
      name,
      addParticipants,
      removeParticipants,
      updateParticipants,
      startDate,
      contributionAmount,
      duration,
    }: UpdatePardnaArgs,
    context: Context,
  ) => {
    let ledgerCreate;
    let updatedPardna;
    const participtantsUpdate: any = {}; // TODO: fix any
    const participantsUpdated =
      typeof addParticipants !== "undefined" ||
      typeof removeParticipants !== "undefined" ||
      typeof updateParticipants !== "undefined";

    const financialImpactingChange =
      removeParticipants?.length ||
      addParticipants?.length ||
      startDate ||
      contributionAmount ||
      duration;

    const pardna = await context.prisma.pardna.findUnique({
      where: {
        id,
      },
      include: {
        participants: true,
        ledger: true,
      },
    });

    if (!pardna) {
      throw new Error("Pardna with that id does not exist");
    }

    if (financialImpactingChange && isPast(pardna.startDate)) {
      throw new Error(
        "You cannot make finanancial impacting changes to a Pardna once the start date has passed.",
      );
    }

    if (addParticipants?.length) {
      participtantsUpdate.create = addParticipants;
    }

    if (removeParticipants?.length) {
      participtantsUpdate.deleteMany = removeParticipants;
    }

    if (updateParticipants?.length) {
      // TODO: do some update here
    }

    updatedPardna = await context.prisma.pardna.update({
      where: {
        id,
        // banker: userId, // BUG: can't filter on banker, need this to only allow bankers to update a pardna - https://github.com/prisma/prisma1/issues/4531
      },
      data: {
        name,
        participants: participantsUpdated
          ? {
              ...participtantsUpdate,
            }
          : undefined,
        startDate,
        contributionAmount,
        duration,
      },
      include: {
        participants: true,
        ledger: true,
      },
    });

    // delete existing ledger and cascade delete all related periods and payments
    if (financialImpactingChange) {
      await context.prisma.ledger.delete({
        where: {
          id: updatedPardna.ledger?.id,
        },
      });

      ledgerCreate = createLedger(
        {},
        updatedPardna.participants,
        updatedPardna.startDate,
        updatedPardna.duration,
      );

      updatedPardna = await context.prisma.pardna.update({
        where: {
          id,
          // banker: userId, // BUG: can't filter on banker, need this to only allow bankers to update a pardna - https://github.com/prisma/prisma1/issues/4531
        },
        data: {
          ledger: {
            create: ledgerCreate,
          },
        },
        include: {
          participants: true,
          ledger: {
            include: {
              periods: {
                include: {
                  payments: true,
                },
              },
            },
          },
        },
      });
    }

    return updatedPardna;
  },
  deletePardna: (parent: any, { id }: DeletePardnaArgs, context: Context) => {
    return context.prisma.pardna.delete({
      where: {
        id,
      },
    });
  },
};

export default Mutations;
