import AdminRole from '../models/AdminRole.js';
import AdminPermission from '../models/AdminPermission.js';
import User from '../models/User.js';

// ==================== PERMISSIONS ====================

// Get all permissions
export const getPermissions = async (req, res) => {
  try {
    const { category, resource, isActive } = req.query;

    let query = {};
    if (category) query.category = category;
    if (resource) query.resource = resource;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const permissions = await AdminPermission.find(query)
      .populate('dependsOn')
      .populate('replacedBy')
      .sort({ resource: 1, action: 1 });

    res.json({ status: 'success', data: permissions });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error fetching permissions', error: error.message });
  }
};

// Create permission
export const createPermission = async (req, res) => {
  try {
    const { code, name, resource, action, description, category } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const permission = new AdminPermission({
      code,
      name,
      resource,
      action,
      description,
      category,
      createdBy: adminId
    });

    await permission.save();

    res.status(201).json({ status: 'success', message: 'Permission created successfully', data: permission });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error creating permission', error: error.message });
  }
};

// Update permission
export const updatePermission = async (req, res) => {
  try {
    const { permissionId } = req.params;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const permission = await AdminPermission.findByIdAndUpdate(
      permissionId,
      { ...req.body, updatedBy: adminId },
      { new: true }
    );

    if (!permission) {
      return res.status(404).json({ status: 'error', message: 'Permission not found' });
    }

    res.json({ status: 'success', message: 'Permission updated successfully', data: permission });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error updating permission', error: error.message });
  }
};

// ==================== ROLES ====================

// Get all roles
export const getRoles = async (req, res) => {
  try {
    const { isActive } = req.query;

    let query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const roles = await AdminRole.find(query)
      .populate('permissions')
      .sort({ level: 1 });

    res.json({ status: 'success', data: roles });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error fetching roles', error: error.message });
  }
};

// Get role by ID
export const getRoleById = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await AdminRole.findById(roleId).populate('permissions');

    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    res.json({ status: 'success', data: role });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error fetching role', error: error.message });
  }
};

// Create role
export const createRole = async (req, res) => {
  try {
    const { name, displayName, description, moduleAccess, permissions, level } = req.body;
    const adminId = req.user?.id || req.headers['x-user-id'];

    // Check if role name already exists
    const existingRole = await AdminRole.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ status: 'error', message: 'Role name already exists' });
    }

    const role = new AdminRole({
      name,
      displayName,
      description,
      moduleAccess,
      permissions,
      level,
      createdBy: adminId
    });

    await role.save();

    res.status(201).json({ status: 'success', message: 'Role created successfully', data: role });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error creating role', error: error.message });
  }
};

// Update role
export const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const adminId = req.user?.id || req.headers['x-user-id'];

    const role = await AdminRole.findByIdAndUpdate(
      roleId,
      { ...req.body, updatedBy: adminId },
      { new: true }
    ).populate('permissions');

    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    res.json({ status: 'success', message: 'Role updated successfully', data: role });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error updating role', error: error.message });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    // Check if role is assigned to any admin
    const adminCount = await User.countDocuments({ adminRole: roleId });
    if (adminCount > 0) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete role assigned to admins' });
    }

    const role = await AdminRole.findByIdAndDelete(roleId);

    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    res.json({ status: 'success', message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error deleting role', error: error.message });
  }
};

// Add permission to role
export const addPermissionToRole = async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;

    const role = await AdminRole.findById(roleId);
    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    if (!role.permissions.includes(permissionId)) {
      role.permissions.push(permissionId);
      await role.save();
    }

    res.json({ status: 'success', message: 'Permission added to role', data: role });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error adding permission', error: error.message });
  }
};

// Remove permission from role
export const removePermissionFromRole = async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;

    const role = await AdminRole.findByIdAndUpdate(
      roleId,
      { $pull: { permissions: permissionId } },
      { new: true }
    );

    if (!role) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    res.json({ status: 'success', message: 'Permission removed from role', data: role });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error removing permission', error: error.message });
  }
};

// Get user permissions (resolved from role)
export const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate({
      path: 'adminRole',
      populate: { path: 'permissions' }
    });

    if (!user || !user.adminRole) {
      return res.status(404).json({ status: 'error', message: 'User or role not found' });
    }

    const permissions = user.adminRole.permissions.map((p) => p.code);

    res.json({ status: 'success', data: { userId, role: user.adminRole.name, permissions } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error fetching user permissions', error: error.message });
  }
};

// Check permission
export const checkPermission = async (req, res) => {
  try {
    const { userId, permissionCode } = req.body;

    const user = await User.findById(userId).populate({
      path: 'adminRole',
      populate: { path: 'permissions' }
    });

    if (!user || !user.adminRole) {
      return res.json({ status: 'success', hasPermission: false });
    }

    const hasPermission = user.adminRole.permissions.some((p) => p.code === permissionCode);

    res.json({ status: 'success', hasPermission });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error checking permission', error: error.message });
  }
};
