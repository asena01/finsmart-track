import Vendor from '../models/Vendor.js';
import Furniture from '../models/Furniture.js';
import Hair from '../models/Hair.js';
import Pets from '../models/Pets.js';
import GymEquipment from '../models/GymEquipment.js';
import Order from '../models/Order.js';
import { deleteImage, getImageUrl } from '../middleware/imageUpload.js';

// Get vendor profile by userId (owner)
export const getVendorProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📝 Fetching vendor profile for user:', userId);

    // Find vendor by owner (userId is the owner reference)
    const vendor = await Vendor.findOne({ owner: userId }).populate('owner');

    if (!vendor) {
      console.log('⚠️ Vendor profile not found for user:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'Vendor profile not found'
      });
    }

    console.log('✅ Vendor profile found:', vendor._id);
    return res.status(200).json({
      status: 'success',
      data: vendor
    });
  } catch (error) {
    console.error('❌ Error fetching vendor profile:', error.message);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch vendor profile'
    });
  }
};

// Create or update vendor profile
export const createOrUpdateVendorProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    console.log('📝 Vendor profile update attempt for user:', userId);
    console.log('📌 Updates received:', updates);

    // Handle image uploads
    if (req.files) {
      if (req.files.profileImage) {
        updates.profileImage = `/uploads/vendor-profiles/${req.files.profileImage[0].filename}`;
      }
      if (req.files.bannerImage) {
        updates.bannerImage = `/uploads/vendor-banners/${req.files.bannerImage[0].filename}`;
      }
      if (req.files.businessLicenseImage) {
        updates.businessLicenseImage = `/uploads/licenses/${req.files.businessLicenseImage[0].filename}`;
      }
    }

    let vendor = await Vendor.findOne({ owner: userId });

    if (!vendor) {
      // Validate required fields before creating
      const requiredFields = ['businessName', 'email', 'phone', 'address', 'city', 'country', 'vendorType'];
      const missingFields = requiredFields.filter(field => !updates[field]);

      if (missingFields.length > 0) {
        console.warn('⚠️ Missing required fields:', missingFields);
        return res.status(400).json({
          status: 'error',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields
        });
      }

      // Create new vendor profile
      vendor = new Vendor({
        owner: userId,
        ...updates
      });
      console.log('✅ Creating new vendor profile for user:', userId);
    } else {
      console.log('✅ Updating existing vendor profile for user:', userId);
      // Update existing vendor profile
      Object.assign(vendor, updates);
    }

    await vendor.save();
    console.log('✅ Vendor profile saved successfully:', vendor._id);

    return res.status(200).json({
      status: 'success',
      data: vendor,
      message: 'Vendor profile saved successfully'
    });
  } catch (error) {
    console.error('❌ Error saving vendor profile:', error.message);
    console.error('Stack:', error.stack);

    // Handle specific MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        validationErrors
      });
    }

    // Handle duplicate key error for owner (unique constraint)
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Vendor profile already exists for this user'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to save vendor profile'
    });
  }
};

// Get vendor statistics
export const getVendorStats = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📝 Fetching vendor stats for user:', userId);

    const vendor = await Vendor.findOne({ owner: userId });

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Get order statistics
    const orders = await Order.find({ items: { $elemMatch: { vendorId: userId } } });
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    // Get product count by type
    let productCounts = {
      furniture: 0,
      hair: 0,
      pets: 0,
      gymEquipment: 0
    };

    if (vendor.vendorType === 'furniture' || vendor.vendorType === 'all') {
      productCounts.furniture = await Furniture.countDocuments({ vendorId: userId });
    }
    if (vendor.vendorType === 'hair' || vendor.vendorType === 'all') {
      productCounts.hair = await Hair.countDocuments({ vendorId: userId });
    }
    if (vendor.vendorType === 'pets' || vendor.vendorType === 'all') {
      productCounts.pets = await Pets.countDocuments({ vendorId: userId });
    }
    if (vendor.vendorType === 'gym-equipment' || vendor.vendorType === 'all') {
      productCounts.gymEquipment = await GymEquipment.countDocuments({ vendorId: userId });
    }

    const totalProducts = Object.values(productCounts).reduce((a, b) => a + b, 0);

    // Update vendor stats
    vendor.stats.totalOrders = totalOrders;
    vendor.stats.totalRevenue = totalRevenue;
    vendor.stats.totalProducts = totalProducts;

    await vendor.save();

    return res.status(200).json({
      status: 'success',
      data: {
        vendor: vendor.stats,
        productCounts,
        recentOrders: orders.slice(-10)
      }
    });
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch vendor statistics'
    });
  }
};

// Get vendor products
export const getVendorProducts = async (req, res) => {
  try {
    const { userId, vendorType } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Ensure userId is a string for consistent querying
    const userIdString = String(userId);
    let products = [];

    if (vendorType === 'furniture') {
      products = await Furniture.find({ vendorId: userIdString })
        .skip((page - 1) * limit)
        .limit(limit);
    } else if (vendorType === 'hair') {
      products = await Hair.find({ vendorId: userIdString })
        .skip((page - 1) * limit)
        .limit(limit);
    } else if (vendorType === 'pets') {
      products = await Pets.find({ vendorId: userIdString })
        .skip((page - 1) * limit)
        .limit(limit);
    } else if (vendorType === 'gym-equipment') {
      products = await GymEquipment.find({ vendorId: userIdString })
        .skip((page - 1) * limit)
        .limit(limit);
    }

    const total = products.length * (1 / limit); // Simplified - would need count in real impl

    return res.status(200).json({
      status: 'success',
      data: products,
      pagination: {
        page,
        limit,
        total: Math.ceil(total)
      }
    });
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch products'
    });
  }
};

// Create new product
export const createProduct = async (req, res) => {
  try {
    const { userId, vendorType } = req.params;
    const productData = req.body;

    // Add vendor info to product
    productData.vendorId = userId;
    productData.vendorName = req.body.vendorName || 'Unknown Vendor';

    // Handle image uploads
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        productData.thumbnail = `/uploads/products/${req.files.image[0].filename}`;
      }
      if (req.files.images && req.files.images.length > 0) {
        productData.images = req.files.images.map(f => `/uploads/products/${f.filename}`);
      }
    }

    let product;

    if (vendorType === 'furniture') {
      product = new Furniture(productData);
    } else if (vendorType === 'hair') {
      product = new Hair(productData);
    } else if (vendorType === 'pets') {
      product = new Pets(productData);
    } else if (vendorType === 'gym-equipment') {
      product = new GymEquipment(productData);
    }

    if (product) {
      await product.save();

      // Update vendor product count
      const vendor = await Vendor.findOne({ owner: userId });
      if (vendor) {
        vendor.stats.totalProducts = (vendor.stats.totalProducts || 0) + 1;
        await vendor.save();
      }

      return res.status(201).json({
        status: 'success',
        data: product,
        message: 'Product created successfully'
      });
    }

    return res.status(400).json({
      status: 'error',
      message: 'Invalid vendor type'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create product'
    });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { userId, vendorType, productId } = req.params;
    const updates = req.body;

    // Handle image uploads
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        updates.thumbnail = `/uploads/products/${req.files.image[0].filename}`;
      }
      if (req.files.images && req.files.images.length > 0) {
        updates.images = req.files.images.map(f => `/uploads/products/${f.filename}`);
      }
    }

    let product;
    let Model;

    if (vendorType === 'furniture') {
      Model = Furniture;
    } else if (vendorType === 'hair') {
      Model = Hair;
    } else if (vendorType === 'pets') {
      Model = Pets;
    } else if (vendorType === 'gym-equipment') {
      Model = GymEquipment;
    }

    if (Model) {
      product = await Model.findByIdAndUpdate(productId, updates, { new: true });

      return res.status(200).json({
        status: 'success',
        data: product,
        message: 'Product updated successfully'
      });
    }

    return res.status(400).json({
      status: 'error',
      message: 'Invalid vendor type'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update product'
    });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { userId, vendorType, productId } = req.params;

    let product;
    let Model;

    if (vendorType === 'furniture') {
      Model = Furniture;
    } else if (vendorType === 'hair') {
      Model = Hair;
    } else if (vendorType === 'pets') {
      Model = Pets;
    } else if (vendorType === 'gym-equipment') {
      Model = GymEquipment;
    }

    if (Model) {
      product = await Model.findByIdAndDelete(productId);

      if (product) {
        // Update vendor product count
        const vendor = await Vendor.findOne({ owner: userId });
        if (vendor) {
          vendor.stats.totalProducts = Math.max(0, (vendor.stats.totalProducts || 1) - 1);
          await vendor.save();
        }

        // Delete product images if they exist
        if (product.thumbnail) {
          deleteImage(product.thumbnail.split('/').pop(), 'products');
        }
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach(img => {
            deleteImage(img.split('/').pop(), 'products');
          });
        }
      }

      return res.status(200).json({
        status: 'success',
        message: 'Product deleted successfully'
      });
    }

    return res.status(400).json({
      status: 'error',
      message: 'Invalid vendor type'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete product'
    });
  }
};

// Get vendor orders
export const getVendorOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    console.log('📝 Fetching orders for userId:', userId);

    // Ensure userId is a string for consistent querying
    const userIdString = String(userId);

    // This would need to be refined based on your order structure
    const orders = await Order.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: orders,
      pagination: {
        page,
        limit,
        total: orders.length
      }
    });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch orders'
    });
  }
};
