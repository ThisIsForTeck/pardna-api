import { GraphQLScalarType, Kind } from "graphql";
import add from "date-fns/add";

const Custom = {
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
  Pardna: {
    endDate: async (parent: any) =>
      add(parent.startDate, {
        months: parent.duration,
      }),
  },
};

export default Custom;
