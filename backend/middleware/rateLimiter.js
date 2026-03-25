import rateLimit from 'express-rate-limit';

// basic rate limiter - adjust as needed
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // limit each IP to 6 upload requests per windowMs
  message: { success: false, error: 'Too many upload requests, please try again later.' },
});

export default uploadLimiter;
