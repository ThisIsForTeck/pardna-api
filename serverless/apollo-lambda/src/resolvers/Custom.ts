import { GraphQLScalarType, Kind } from "graphql";
import add from "date-fns/add";
import isPast from "date-fns/isPast";

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
    endDate: (
      parent: any, // TODO: set parent type to Pardna
    ) =>
      add(parent.startDate, {
        months: parent.duration,
      }),
  },
  Payment: {
    overdue: (parent: any) => isPast(parent.dueDate) && !parent.settled, // TODO: set parent type to Payment
  },
};

export default Custom;
