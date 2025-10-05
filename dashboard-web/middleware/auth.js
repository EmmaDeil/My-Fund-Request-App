const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "your-super-secret-jwt-key-change-this-in-production";
const JWT_EXPIRES_IN = "7h"; // Token expires in 7 hours

// Admin credentials (in production, store in database with hashed passwords)
const ADMIN_USERS = [
  {
    id: 1,
    username: process.env.ADMIN_USERNAME || "admin",
    // Default password: 'admin123' (CHANGE THIS IN PRODUCTION!)
    passwordHash:
      process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync("admin123", 10),
    email: process.env.ADMIN_EMAIL || "admin@fundrequest.com",
    role: "admin",
  },
];

/**
 * Middleware to verify JWT token and authenticate requests
 */
const authenticateToken = (req, res, next) => {
  // Check for token in cookies or Authorization header
  const token =
    req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    // For API routes, return JSON error
    if (req.path.startsWith("/api/")) {
      return res
        .status(401)
        .json({ error: "Authentication required", code: "NO_TOKEN" });
    }
    // For page routes, redirect to login
    return res.redirect("/login");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = decoded;

    // Token is valid, proceed
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);

    // Clear invalid token
    res.clearCookie("token");

    // For API routes, return JSON error
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }
    // For page routes, redirect to login
    return res.redirect("/login");
  }
};

/**
 * Verify user credentials and return user object if valid
 */
const verifyCredentials = async (username, password) => {
  // Find user by username
  const user = ADMIN_USERS.find((u) => u.username === username);

  if (!user) {
    return null;
  }

  // Compare password with hash
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    return null;
  }

  // Return user without password hash
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
};

/**
 * Generate JWT token for authenticated user
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Add a new admin user (for initial setup or admin management)
 */
const addAdminUser = async (username, password, email) => {
  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = {
    id: ADMIN_USERS.length + 1,
    username,
    passwordHash,
    email,
    role: "admin",
  };

  ADMIN_USERS.push(newUser);

  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
  };
};

/**
 * Check if a user is logged in (returns user info or null)
 */
const checkAuth = (req) => {
  const token =
    req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  verifyCredentials,
  generateToken,
  addAdminUser,
  checkAuth,
  JWT_SECRET,
  ADMIN_USERS,
};
