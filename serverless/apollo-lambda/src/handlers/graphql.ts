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

  input ParticipantInput {
    name: String!
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
  }

  type Pardna {
    id: String!
    name: String
    banker: User
    participants: [Participant]
    sumOfHand: Int
    drawingFrequency: Frequency
    drawDay: Int
    startDate: Date
    duration: Int
    endDate: Date
  }

  type Query {
    users: [User]
    pardnas: [Pardna]
  }

  type Mutation {
    createUser(
      firstName: String!
      lastName: String!
      email: String!
      password: String!
    ): User!
    logIn(email: String!, password: String!): User!
    logOut: SuccessMessage!
    createPardna(
      name: String
      participants: [ParticipantInput]
      sumOfHand: Int
      drawingFrequency: Frequency
    ): Pardna
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
