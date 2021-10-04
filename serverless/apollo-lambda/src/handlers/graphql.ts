import { ApolloServer, gql } from "apollo-server-lambda";
import * as Sentry from "@sentry/serverless";
import Query from "../resolvers/Query";
import Mutation from "../resolvers/Mutation";
import { createContext } from "../context";

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const typeDefs = gql`
  type User {
    firstName: String!
    lastName: String!
  }
  type Query {
    users: [User]
  }
  type Mutation {
    createUser(firstName: String!, lastName: String!): User!
  }
`;

const resolvers = {
  Query,
  Mutation,
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ event }) => ({
    headers: event.headers,
    ...createContext(),
  }),
});

export const handler = Sentry.AWSLambda.wrapHandler(server.createHandler());
