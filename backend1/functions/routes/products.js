import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Get all products with filters (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { category, service, page = 1, limit = 20, search, vendor } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (category) filter.category = category;
    if (service) filter.service = service;
    if (vendor) filter.vendor = vendor;

    let query = Product.find(filter)
      .populate('vendor', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    if (search) {
      query = Product.find({
        ...filter,
        $text: { $search: search },
      })
        .populate('vendor', 'name email')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
    }

    const products = await query;
    const total = await Product.countDocuments(filter);

    // Transform products to include vendorId and vendorName
    const transformedProducts = products.map(product => {
      const productObj = product.toObject ? product.toObject() : product;
      return {
        ...productObj,
        vendorId: product.vendor?._id || product.vendor,
        vendorName: product.vendor?.name || 'Unknown Vendor',
        vendorType: product.vendorType || 'retail'
      };
    });

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: transformedProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get vendor's own products
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20, category, search } = req.query;
    const skip = (page - 1) * limit;

    let filter = { vendor: vendorId };
    if (category) filter.category = category;

    let query = Product.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    if (search) {
      query = Product.find({
        ...filter,
        $text: { $search: search },
      })
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
    }

    const products = await query;
    const total = await Product.countDocuments(filter);

    // Transform products to include vendorId and vendorName
    const transformedProducts = products.map(product => {
      return {
        ...product.toObject ? product.toObject() : product,
        vendorId: vendorId,
        vendorName: 'Your Store',
        vendorType: 'retail'
      };
    });

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: transformedProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('vendor', 'name email phone');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Transform product to include vendorId and vendorName
    const productObj = product.toObject ? product.toObject() : product;
    const transformedProduct = {
      ...productObj,
      vendorId: product.vendor?._id || product.vendor,
      vendorName: product.vendor?.name || 'Unknown Vendor',
      vendorType: product.vendorType || 'retail'
    };

    res.status(200).json({
      success: true,
      data: transformedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create product (for vendors) - requires authentication
router.post('/', async (req, res) => {
  try {
    const vendorId = req.headers['x-vendor-id'];
    const {
      name,
      description,
      price,
      category,
      service,
      originalPrice,
      stock,
      sku,
      isFeatured,
      isActive,
      images,
      thumbnail,
      size,
      color,
      features,
      specifications,
      vendorType,
      discount
    } = req.body;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: vendor ID required',
      });
    }

    if (!name || !description || price === undefined || !category || !service) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, description, price, category, service',
      });
    }

    console.log('📦 Creating product with variants:');
    console.log('  - Name:', name);
    console.log('  - Size:', size);
    console.log('  - Color:', color);
    console.log('  - Features:', features);

    const product = new Product({
      name,
      description,
      price,
      originalPrice: originalPrice || price,
      category,
      service,
      vendor: vendorId,
      stock: stock || 0,
      sku: sku || '',
      inStock: (stock || 0) > 0,
      images: images || [],
      thumbnail: thumbnail || '',
      features: features || [],
      specifications: specifications || null,
      vendorType: vendorType || 'general',
      discount: discount || 0,
      size: size || [],
      color: color || [],
      isFeatured: isFeatured || false,
      isActive: isActive !== undefined ? isActive : true,
    });

    console.log('✅ Product object before save:', {
      size: product.size,
      color: product.color,
      features: product.features,
    });

    await product.save();
    await product.populate('vendor', 'name email');

    console.log('✅ Product saved successfully:');
    console.log('  - ID:', product._id);
    console.log('  - Size:', product.size);
    console.log('  - Color:', product.color);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update product - only vendor can update their own products
router.put('/:id', async (req, res) => {
  try {
    const vendorId = req.headers['x-vendor-id'];
    const { id } = req.params;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: vendor ID required',
      });
    }

    let product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if vendor owns this product
    if (product.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: you can only update your own products',
      });
    }

    // Update allowed fields (including variants and specifications)
    const allowedFields = [
      'name',
      'description',
      'price',
      'originalPrice',
      'category',
      'service',
      'stock',
      'sku',
      'isFeatured',
      'isActive',
      'images',
      'image',
      'size',
      'color',
      'features',
      'specifications',
      'vendorType',
      'discount',
      'thumbnail'
    ];
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Update inStock status based on stock
    if (updates.stock !== undefined) {
      updates.inStock = updates.stock > 0;
    }

    product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('vendor', 'name email');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete product - only vendor can delete their own products
router.delete('/:id', async (req, res) => {
  try {
    const vendorId = req.headers['x-vendor-id'];
    const { id } = req.params;

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: vendor ID required',
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if vendor owns this product
    if (product.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: you can only delete your own products',
      });
    }

    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get vendor inventory report
router.get('/vendor/:vendorId/inventory', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const products = await Product.find({ vendor: vendorId })
      .select('name price stock inStock category service')
      .sort({ createdAt: -1 });

    if (!products) {
      return res.status(404).json({
        success: false,
        message: 'No products found for this vendor',
      });
    }

    // Calculate inventory stats
    const stats = {
      totalProducts: products.length,
      lowStockProducts: products.filter(p => p.stock > 0 && p.stock <= 5).length,
      outOfStockProducts: products.filter(p => p.stock === 0).length,
      totalStockValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
      totalItems: products.reduce((sum, p) => sum + p.stock, 0)
    };

    res.status(200).json({
      success: true,
      data: products,
      stats,
      message: 'Inventory report retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get low stock products for vendor
router.get('/vendor/:vendorId/low-stock', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { threshold = 5 } = req.query;

    const lowStockProducts = await Product.find({
      vendor: vendorId,
      $expr: { $lte: ['$stock', parseInt(threshold)] }
    })
      .select('name price stock category')
      .sort({ stock: 1 });

    res.status(200).json({
      success: true,
      count: lowStockProducts.length,
      data: lowStockProducts,
      message: `Found ${lowStockProducts.length} low stock products`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update product stock manually
router.put('/:productId/stock', async (req, res) => {
  try {
    const vendorId = req.headers['x-vendor-id'];
    const { productId } = req.params;
    const { quantity, action } = req.body; // action: 'set', 'add', or 'subtract'

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: vendor ID required',
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if vendor owns this product
    if (product.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: you can only update your own products',
      });
    }

    let newStock = product.stock;
    switch (action) {
      case 'set':
        newStock = quantity;
        break;
      case 'add':
        newStock = product.stock + quantity;
        break;
      case 'subtract':
        newStock = product.stock - quantity;
        break;
      default:
        newStock = quantity;
    }

    // Ensure stock doesn't go below 0
    newStock = Math.max(0, newStock);

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        stock: newStock,
        inStock: newStock > 0
      },
      { new: true }
    );

    console.log(`✅ Stock updated for product ${productId}: ${product.stock} -> ${newStock}`);

    res.status(200).json({
      success: true,
      message: 'Product stock updated successfully',
      data: {
        productId: updatedProduct._id,
        name: updatedProduct.name,
        previousStock: product.stock,
        newStock: updatedProduct.stock,
        inStock: updatedProduct.inStock
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
