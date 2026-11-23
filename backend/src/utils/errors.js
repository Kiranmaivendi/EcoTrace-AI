export function errorResponse(res, status, code, message, details) {
  const body = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return res.status(status).json(body);
}

export function zodDetails(error) {
  return error?.issues?.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message
  })) || [];
}
