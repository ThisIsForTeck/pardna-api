import bcrypt from "bcryptjs";
import isPast from "date-fns/isPast";
import jwt from "jsonwebtoken";
import { Context } from "../context";
import { Participant } from "../types";
import createLedger from "../utils/createLedger";
import capitalizeFirstLetter from "../utils/capitalizeFirstLetter";
import getUserIdFromContext from "../utils/geUserIdFromContext";

enum Frequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
}

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
  paymentFrequency?: Frequency;
  participants?: Participant[];
  startDate: Date;
  duration?: number;
  contributionAmount?: number;
  bankerFee?: number;
};

type UpdatePardnaArgs = {
  id: string;
  name?: string;
  paymentFrequency?: Frequency;
  startDate?: Date;
  duration?: number;
  contributionAmount?: number;
  bankerFee?: number;
  addParticipants: Participant[];
  removeParticipants: ConnectArgs[];
};

type DeletePardnaArgs = {
  id: string;
};

type UpdatePaymentArgs = {
  id: string;
  settled: boolean;
};

type UpdateParticipantArgs = {
  id: string;
  name: string;
  email: string;
};

type DeleteParticipantArgs = {
  id: string;
};

const Mutations = {
  createUser: async (
    parent: any,
    { firstName, lastName, email, password }: CreateUserArgs,
    context: Context,
  ) => {
    const lowerCaseEmail = email.toLowerCase().trim();

    // TODO: do some kind of check for taken username aswell
    const exists = await context.prisma.user.findUnique({
      where: { email: lowerCaseEmail },
    });

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
        firstName: capitalizeFirstLetter(firstName).trim(),
        lastName: capitalizeFirstLetter(lastName).trim(),
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
    return { user, token };
  },
  logIn: async (
    parent: any,
    { email, password }: LogInArgs,
    context: Context,
  ) => {
    const lowerCaseEmail = email.toLowerCase().trim();

    // check if a user with email exists
    const user = await context.prisma.user.findUnique({
      where: {
        email: lowerCaseEmail,
      },
    });

    if (!user) {
      throw new Error(
        "email: Hmm, we couldn't find that email in our records. Try again.",
      );
    }

    // check if the password is correct
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new Error(
        "password: Hmm, that password doesn't match the one we have on record. Try again.",
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
      paymentFrequency,
      participants,
      startDate,
      duration,
      contributionAmount,
      bankerFee,
    }: CreatePardnaArgs,
    context: Context,
  ) => {
    // TODO: destructuring id from "USER | undefined" kept throwing errors so using function - look into this
    const userId = getUserIdFromContext(context);
    const ledgerCreate = createLedger(
      { paymentFrequency },
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
        bankerFee,
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
      paymentFrequency,
      startDate,
      duration,
      contributionAmount,
      bankerFee,
      addParticipants,
      removeParticipants,
    }: UpdatePardnaArgs,
    context: Context,
  ) => {
    let ledgerCreate;
    let updatedPardna;
    const participtantsUpdate: any = {}; // TODO: fix any
    const participantsUpdated =
      typeof addParticipants !== "undefined" ||
      typeof removeParticipants !== "undefined";

    const financialImpactingChange =
      paymentFrequency ||
      startDate ||
      contributionAmount ||
      bankerFee ||
      duration ||
      removeParticipants?.length ||
      addParticipants?.length;

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
        bankerFee,
        duration,
        ledger: {
          update: {
            paymentFrequency,
          },
        },
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
        { paymentFrequency },
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
  updatePayment: (
    parent: any,
    { id, settled }: UpdatePaymentArgs,
    context: Context,
  ) => {
    const updates: {
      settled: boolean;
      settledDate: Date | null;
    } = {
      settled,
      settledDate: null,
    };

    if (settled) {
      updates.settledDate = new Date();
    }

    return context.prisma.payment.update({
      where: {
        id,
      },
      data: {
        ...updates,
      },
      include: {
        participant: true,
      },
    });
  },
  updateParticipant: (
    parent: any,
    { id, name, email }: UpdateParticipantArgs,
    context: Context,
  ) => {
    return context.prisma.participant.update({
      where: {
        id,
      },
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
      },
    });
  },
  deleteParticipant: (
    parent: any,
    { id }: DeleteParticipantArgs,
    context: Context,
  ) => {
    return context.prisma.participant.delete({
      where: {
        id,
      },
    });
  },
};

export default Mutations;
