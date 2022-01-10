import { ApolloServer, gql } from "apollo-server-lambda";
import express from "express";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/serverless";
import Query from "../resolvers/Query";
import Mutation from "../resolvers/Mutation";
import { createContext } from "../context";
import Custom from "../resolvers/Custom";

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const typeDefs = gql`
  scalar Date

  enum Frequency {
    DAILY
    WEEKLY
    MONTHLY
  }

  enum PaymentType {
    PAYOUT
    CONTRIBUTION
    BANKERFEE
  }

  enum PeriodType {
    DAY
    WEEK
    MONTH
  }

  input ParticipantInput {
    name: String!
    email: String!
  }

  input RemoveParticipantInput {
    id: String!
  }

  input UpdateParticipantInput {
    id: String!
    name: String!
  }

  input LedgerInput {
    paymentFrequency: Frequency
  }

  type SuccessMessage {
    message: String
  }

  type User {
    id: String!
    firstName: String!
    lastName: String!
    email: String!
    role: String!
    createdAt: Date!
    updatedAt: Date!
  }

  type Participant {
    id: String!
    name: String!
    email: String!
    payments: [Payment]
  }

  type Payment {
    id: String!
    type: PaymentType
    week: Int
    dueDate: Date
    overdue: Boolean
    settled: Boolean
    settledDate: Date
    user: User
    participant: Participant
    createdAt: Date
    updatedAt: Date
  }

  type Period {
    id: String!
    type: PeriodType
    number: Int
    payments: [Payment]
    ledger: Ledger
    createdAt: Date
    updatedAt: Date
  }

  type Ledger {
    id: String!
    paymentFrequency: Frequency
    periods: [Period]
    createdAt: Date
    updatedAt: Date
  }

  type Pardna {
    id: String!
    name: String
    banker: User
    participants: [Participant]
    contributionAmount: Int
    ledger: Ledger
    startDate: Date
    duration: Int
    endDate: Date
  }

  type LogInResponse {
    user: User!
    token: String!
  }

  type CreateUserResponse {
    user: User!
    token: String!
  }

  type Query {
    users: [User]
    pardnas: [Pardna]
    pardna(id: String!): Pardna
  }

  type Mutation {
    createUser(
      firstName: String!
      lastName: String!
      email: String!
      password: String!
    ): CreateUserResponse!
    logIn(email: String!, password: String!): LogInResponse!
    logOut: SuccessMessage!
    createPardna(
      name: String
      participants: [ParticipantInput]
      startDate: Date
      contributionAmount: Int
      ledger: LedgerInput
      paymentFrequency: Frequency
    ): Pardna
    updatePardna(
      id: String
      name: String
      addParticipants: [ParticipantInput]
      removeParticipants: [RemoveParticipantInput]
      updateParticipants: [UpdateParticipantInput]
      startDate: Date
      contributionAmount: Int
      paymentFrequency: Frequency
    ): Pardna
    deletePardna(id: String): Pardna
  }
`;

const resolvers = {
  ...Custom,
  Query,
  Mutation,
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ event, express: { req } }) => ({
    headers: event.headers,
    ...(await createContext({ req })),
  }),
});

export const handler = Sentry.AWSLambda.wrapHandler(
  server.createHandler({
    expressAppFromMiddleware(middleware) {
      const app = express();
      app.use(cookieParser());
      app.use(middleware);
      return app;
    },
  }),
);
