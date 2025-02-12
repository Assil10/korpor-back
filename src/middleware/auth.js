const jwt = require('jsonwebtoken');
const Role = require('../models/Role');

exports.authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: "Access denied" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

exports.checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: Insufficient privileges" });
    }
    next();
  };
};

exports.checkPrivilege = (privilege) => {
  return async (req, res, next) => {
    try {
      const roleDetails = await Role.findOne({ name: req.user.role });
      if (!roleDetails || !roleDetails.privileges.includes(privilege)) {
        return res.status(403).json({ message: "Access denied: insufficient privileges" });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  };
};
