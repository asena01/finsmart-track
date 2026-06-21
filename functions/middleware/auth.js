import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Not authorized to access this route' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_jwt_key_here_change_in_production');
      req.user = await User.findById(decoded.id);
      next();
    } catch (error) {
      return res.status(401).json({ status: 'error', message: 'Token is not valid' });
    }
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'Not authorized to access this route' });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({ status: 'error', message: 'User role not authorized for this action' });
    }

    next();
  };
};

export const isAdmin = (req, res, next) => {
  if (req.user && (req.user.userType === 'admin' || req.user.adminRole === 'super-admin')) {
    next();
  } else {
    res.status(403).json({ status: 'error', message: 'Not authorized - Admin access required' });
  }
};
