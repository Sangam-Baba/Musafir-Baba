const requestLogger = (req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    // Nice colored status code formatting
    let statusColor = "\x1b[32m"; // Green for 2xx (Success)
    if (res.statusCode >= 500) {
      statusColor = "\x1b[31m"; // Red for 5xx (Server Error)
    } else if (res.statusCode >= 400) {
      statusColor = "\x1b[33m"; // Yellow for 4xx (Client Error)
    } else if (res.statusCode >= 300) {
      statusColor = "\x1b[36m"; // Cyan for 3xx (Redirect)
    }

    const methodColor = "\x1b[35m"; // Magenta for Method
    const resetColor = "\x1b[0m";
    const timeColor = "\x1b[36m";   // Cyan for Time

    console.log(
      `[${new Date().toISOString()}] ${methodColor}${req.method}${resetColor} ${req.originalUrl || req.url} ${statusColor}${res.statusCode}${resetColor} - ${timeColor}${timeInMs} ms${resetColor}`
    );
  });

  next();
};

export default requestLogger;
