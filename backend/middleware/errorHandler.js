const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  
  // 🔥 Log the FULL error object for debugging
  console.error("🔥 [REAL ERROR]:", err);
  console.error("🔥 [ERROR DETAILS]", {
    message: err.message || "No message",
    statusCode: statusCode,
    stack: err.stack || "No stack trace",
    errorName: err.name || "Unknown",
  });

  // NEVER expose sensitive error details to client
  // Only send safe, generic messages to frontend
  let clientMessage = "Server error";
  
  if (statusCode === 400) {
    clientMessage = err.message || "Invalid request";
  } else if (statusCode === 401) {
    clientMessage = "Unauthorized";
  } else if (statusCode === 403) {
    clientMessage = "Forbidden";
  } else if (statusCode === 404) {
    clientMessage = "Not found";
  } else if (statusCode === 429) {
    clientMessage = "Too many requests. Please try again later.";
  } else if (statusCode >= 500) {
    // For 5xx errors, NEVER expose implementation details
    clientMessage = "Server error. Please try again later.";
  }

  res.status(statusCode).json({
    success: false,
    error: clientMessage,
    // Only in development, include more details
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
};

export default errorHandler;
