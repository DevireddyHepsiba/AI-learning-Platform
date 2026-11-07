const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Server error";
  
  console.error(`[Error Handler] ${statusCode}: ${message}`);
  console.error("Error Details:", err);
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { details: err.toString() }),
  });
};

export default errorHandler;
