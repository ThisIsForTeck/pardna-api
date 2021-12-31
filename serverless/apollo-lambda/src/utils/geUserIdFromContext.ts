import { Context } from "../context";

const getUserIdFromContext = (context: Context) => {
  if (context.user && "id" in context.user) {
    return context.user.id;
  }

  return undefined;
};

export default getUserIdFromContext;
