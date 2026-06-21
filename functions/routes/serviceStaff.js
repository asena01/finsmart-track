import express from 'express';

const router = express.Router();

// ============================================
// SERVICE STAFF ROUTES
// Generic service provider staff management
// ============================================

// GET all staff for a provider
router.get('/', async (req, res, next) => {
  try {
    const { providerId, page = 1, limit = 10 } = req.query;
    
    if (!providerId) {
      return res.status(400).json({ status: 'error', message: 'providerId is required' });
    }
    
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ status: 'error', message: 'Database connection error' });
    }
    
    const ServiceStaff = db.collection('service-staff');
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const staff = await ServiceStaff
      .find({ providerId })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .toArray();
    
    const total = await ServiceStaff.countDocuments({ providerId });
    
    return res.status(200).json({
      status: 'success',
      data: staff,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET single staff member by ID
router.get('/:staffId', async (req, res, next) => {
  try {
    const { staffId } = req.params;
    
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ status: 'error', message: 'Database connection error' });
    }
    
    const ObjectId = req.app.locals.ObjectId;
    const ServiceStaff = db.collection('service-staff');
    
    const staff = await ServiceStaff.findById(new ObjectId(staffId));
    
    if (!staff) {
      return res.status(404).json({ status: 'error', message: 'Staff member not found' });
    }
    
    return res.status(200).json({
      status: 'success',
      data: staff
    });
  } catch (error) {
    console.error('Error fetching staff member:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST create new staff member
router.post('/', async (req, res, next) => {
  try {
    const staffData = req.body;
    
    // Validate required fields
    if (!staffData.providerId || !staffData.name || !staffData.email) {
      return res.status(400).json({
        status: 'error',
        message: 'providerId, name, and email are required'
      });
    }
    
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ status: 'error', message: 'Database connection error' });
    }
    
    const ServiceStaff = db.collection('service-staff');
    
    // Create staff document
    const newStaff = {
      ...staffData,
      status: staffData.status || 'active',
      rating: staffData.rating || 0,
      reviews: staffData.reviews || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await ServiceStaff.insertOne(newStaff);
    
    return res.status(201).json({
      status: 'success',
      message: 'Staff member created successfully',
      data: {
        _id: result.insertedId,
        ...newStaff
      }
    });
  } catch (error) {
    console.error('Error creating staff member:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT update staff member
router.put('/:staffId', async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const updateData = req.body;
    
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ status: 'error', message: 'Database connection error' });
    }
    
    const ObjectId = req.app.locals.ObjectId;
    const ServiceStaff = db.collection('service-staff');
    
    const result = await ServiceStaff.findByIdAndUpdate(
      new ObjectId(staffId),
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!result) {
      return res.status(404).json({ status: 'error', message: 'Staff member not found' });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Staff member updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error updating staff member:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT update staff status (active/inactive/on-leave)
router.put('/:staffId/status', async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ status: 'error', message: 'status is required' });
    }
    
    const validStatuses = ['active', 'inactive', 'on-leave'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `status must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ status: 'error', message: 'Database connection error' });
    }
    
    const ObjectId = req.app.locals.ObjectId;
    const ServiceStaff = db.collection('service-staff');
    
    const result = await ServiceStaff.findByIdAndUpdate(
      new ObjectId(staffId),
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!result) {
      return res.status(404).json({ status: 'error', message: 'Staff member not found' });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Staff status updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error updating staff status:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// DELETE staff member
router.delete('/:staffId', async (req, res, next) => {
  try {
    const { staffId } = req.params;
    
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ status: 'error', message: 'Database connection error' });
    }
    
    const ObjectId = req.app.locals.ObjectId;
    const ServiceStaff = db.collection('service-staff');
    
    const result = await ServiceStaff.findByIdAndDelete(new ObjectId(staffId));
    
    if (!result) {
      return res.status(404).json({ status: 'error', message: 'Staff member not found' });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Staff member deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
