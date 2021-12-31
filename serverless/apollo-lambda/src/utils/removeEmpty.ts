const removeEmpty = (obj: any) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));

export default removeEmpty;
