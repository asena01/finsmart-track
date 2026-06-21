import User from '../models/User.js';

/**
 * Verify admin authentication
 */
export const verifyAdmin = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Admin authentication required'
      });
    }

    const user = await User.findById(userId).populate('adminRole');

    if (!user || !user.adminRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    // Attach user and role to request
    req.user = user;
    req.adminRole = user.adminRole;

    next();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Authentication error',
      error: error.message
    });
  }
};

/**
 * Check if user has specific role
 */
export const requireRole = (...roleNames) => {
  return async (req, res, next) => {
    try {
      if (!req.adminRole) {
        return res.status(403).json({
          status: 'error',
          message: 'Admin role required'
        });
      }

      if (!roleNames.includes(req.adminRole.name)) {
        return res.status(403).json({
          status: 'error',
          message: `Requires one of these roles: ${roleNames.join(', ')}`
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Role verification error' });
    }
  };
};

/**
 * Check if user has specific permission
 */
export const requirePermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      if (!req.adminRole) {
        return res.status(403).json({
          status: 'error',
          message: 'Admin role required'
        });
      }

      const hasPermission = req.adminRole.permissions.some((p) => p.code === permissionCode);

      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          message: `Permission denied: ${permissionCode}`
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Permission verification error' });
    }
  };
};

/**
 * Check if user has any of the specified permissions
 */
export const requireAnyPermission = (...permissionCodes) => {
  return async (req, res, next) => {
    try {
      if (!req.adminRole) {
        return res.status(403).json({
          status: 'error',
          message: 'Admin role required'
        });
      }

      const userPermissions = req.adminRole.permissions.map((p) => p.code);
      const hasPermission = permissionCodes.some((code) => userPermissions.includes(code));

      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          message: `Permission denied: requires one of ${permissionCodes.join(', ')}`
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Permission verification error' });
    }
  };
};

/**
 * Check if user has all specified permissions
 */
export const requireAllPermissions = (...permissionCodes) => {
  return async (req, res, next) => {
    try {
      if (!req.adminRole) {
        return res.status(403).json({
          status: 'error',
          message: 'Admin role required'
        });
      }

      const userPermissions = req.adminRole.permissions.map((p) => p.code);
      const hasAllPermissions = permissionCodes.every((code) => userPermissions.includes(code));

      if (!hasAllPermissions) {
        return res.status(403).json({
          status: 'error',
          message: `Permission denied: requires all of ${permissionCodes.join(', ')}`
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Permission verification error' });
    }
  };
};

/**
 * Audit log middleware to track admin actions
 */
export const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Capture original send
    const originalSend = res.send;

    // Override send to capture response
    res.send = function(data) {
      // Log the action
      const logData = {
        adminId: req.user?._id,
        adminRole: req.adminRole?.name,
        action,
        resource,
        method: req.method,
        url: req.originalUrl,
        ipAddress: req.ip,
        timestamp: new Date(),
        status: res.statusCode,
        details: {
          params: req.params,
          query: req.query,
          body: req.body
        }
      };

      console.log('📋 Admin Action:', JSON.stringify(logData, null, 2));

      // In production, save to database
      // await AdminAuditLog.create(logData);

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Rate limiting middleware for sensitive operations
 */
export const rateLimitSensitiveOperation = (maxAttempts = 10, windowMs = 60000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.user?._id}:${req.path}`;
    const now = Date.now();
    const userAttempts = attempts.get(key) || [];

    // Clean old attempts
    const recentAttempts = userAttempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again later.'
      });
    }

    recentAttempts.push(now);
    attempts.set(key, recentAttempts);

    next();
  };
};
