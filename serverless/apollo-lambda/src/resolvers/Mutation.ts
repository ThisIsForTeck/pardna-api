import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Context } from "../context";

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

const Mutations = {
  createUser: async (
    parent: any,
    { firstName, lastName, email, password }: CreateUserArgs,
    context: Context,
  ) => {
    const lowerCaseEmail = email.toLowerCase();

    // TODO: Do some kind of check for taken username aswell
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

    return user;
  },
  logOut: (parent: any, args: {}, context: Context) => {
    context.res.clearCookie("token");

    return { message: "Goodbye!" };
  },
};

export default Mutations;
