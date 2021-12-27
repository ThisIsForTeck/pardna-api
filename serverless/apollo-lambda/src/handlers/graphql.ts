import { ApolloServer, gql } from "apollo-server-lambda";
import express from "express";
import { GraphQLScalarType, Kind } from "graphql";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/serverless";
import Query from "../resolvers/Query";
import Mutation from "../resolvers/Mutation";
import { createContext } from "../context";

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const typeDefs = gql`
  scalar Date

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

  type Query {
    users: [User]
  }

  type Mutation {
    createUser(
      firstName: String!
      lastName: String!
      email: String!
      password: String!
    ): User!
    logInUser(email: String!, password: String!): User!
    logOutUser: SuccessMessage!
  }
`;

const resolvers = {
  Date: new GraphQLScalarType({
    name: "Date",
    description: "Date custom scalar type",
    serialize(value) {
      return value.getTime(); // value sent to client
    },
    parseValue(value) {
      return new Date(value); // value from the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value); // ast value is always in string format
      }
      return null;
    },
  }),
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
