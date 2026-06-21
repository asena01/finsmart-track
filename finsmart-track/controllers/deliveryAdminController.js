import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryZone from '../models/DeliveryZone.js';
import DeliveryConfiguration from '../models/DeliveryConfiguration.js';
import Delivery from '../models/Delivery.js';
import User from '../models/User.js';

// ============================================
// DELIVERY PARTNER MANAGEMENT
// ============================================

export const createDeliveryPartner = async (req, res) => {
  try {
    const { name, email, phone, description, serviceAreas, capabilities } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingPartner = await DeliveryPartner.findOne({ email });
    if (existingPartner) {
      return res.status(400).json({ success: false, message: 'Delivery partner already exists' });
    }

    const partner = new DeliveryPartner({
      name,
      email,
      phone,
      description,
      serviceAreas,
      capabilities,
      status: 'pending-verification'
    });

    await partner.save();

    res.status(201).json({
      success: true,
      message: 'Delivery partner created successfully',
      data: partner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeliveryPartners = async (req, res) => {
  try {
    const { status, verified, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (verified !== undefined) filter.isVerified = verified === 'true';

    const skip = (page - 1) * limit;
    const partners = await DeliveryPartner.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await DeliveryPartner.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: partners,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, notes } = req.body;

    const partner = await DeliveryPartner.findByIdAndUpdate(
      id,
      {
        isVerified: verified,
        status: verified ? 'active' : 'rejected'
      },
      { new: true }
    );

    if (!partner) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    res.status(200).json({
      success: true,
      message: `Delivery partner ${verified ? 'verified' : 'rejected'} successfully`,
      data: partner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await DeliveryPartner.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!partner) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery partner updated successfully',
      data: partner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// DEFAULT ZONE TEMPLATES & PRESETS
// ============================================

export const getDefaultZoneTemplates = async (req, res) => {
  try {
    // Fetch all zones that are marked as templates/presets
    // These are the ones created during seeding with standard categories
    const zones = await DeliveryZone.find({ isActive: true })
      .populate('availableDeliveryPartners', 'name email status')
      .populate('preferredPartner', 'name email')
      .sort({ 'basePricing.basePrice.value': 1 });

    // Format with enablement status (check if it's already in use)
    const templates = zones.map(zone => ({
      _id: zone._id,
      name: zone.name,
      description: zone.description,
      category: zone.category,
      location: zone.location,
      basePricing: zone.basePricing,
      distancePricing: zone.distancePricing,
      serviceOptions: zone.serviceOptions,
      deliveryTimeEstimates: zone.deliveryTimeEstimates,
      availableDeliveryPartners: zone.availableDeliveryPartners,
      preferredPartner: zone.preferredPartner,
      isEnabled: true, // Already exists in database
      partnersCount: zone.availableDeliveryPartners.length
    }));

    res.status(200).json({
      success: true,
      message: 'Default zone templates retrieved',
      data: templates,
      total: templates.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const enableDefaultZone = async (req, res) => {
  try {
    const { templateId, customizations } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, message: 'Template ID is required' });
    }

    // Fetch the template zone
    const template = await DeliveryZone.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Check if this zone already exists (by name)
    const existingZone = await DeliveryZone.findOne({
      name: template.name,
      'location.city': template.location.city
    });

    if (existingZone) {
      return res.status(200).json({
        success: true,
        message: 'Zone already enabled',
        data: existingZone,
        alreadyExists: true
      });
    }

    // Create a new zone based on template with optional customizations
    const newZone = new DeliveryZone({
      name: template.name,
      description: template.description,
      location: template.location,
      category: template.category,
      basePricing: {
        ...template.basePricing,
        ...(customizations?.basePricing || {})
      },
      distancePricing: {
        ...template.distancePricing,
        ...(customizations?.distancePricing || {})
      },
      serviceOptions: template.serviceOptions,
      deliveryTimeEstimates: template.deliveryTimeEstimates,
      availableDeliveryPartners: template.availableDeliveryPartners,
      preferredPartner: template.preferredPartner,
      isActive: true
    });

    await newZone.save();

    // Populate references for response
    await newZone.populate('availableDeliveryPartners', 'name email');
    await newZone.populate('preferredPartner', 'name email');

    res.status(201).json({
      success: true,
      message: 'Delivery zone enabled successfully',
      data: newZone
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// DELIVERY ZONE MANAGEMENT
// ============================================

export const createDeliveryZone = async (req, res) => {
  try {
    const { name, location, category, basePricing, distancePricing, availableDeliveryPartners } = req.body;

    if (!name || !location || !basePricing) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const zone = new DeliveryZone({
      name,
      location,
      category,
      basePricing,
      distancePricing,
      availableDeliveryPartners,
      isActive: true
    });

    await zone.save();

    res.status(201).json({
      success: true,
      message: 'Delivery zone created successfully',
      data: zone
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeliveryZones = async (req, res) => {
  try {
    const { city, country, category, page = 1, limit = 10 } = req.query;

    let filter = { isActive: true };
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (country) filter['location.country'] = new RegExp(country, 'i');
    if (category) filter.category = category;

    const skip = (page - 1) * limit;
    const zones = await DeliveryZone.find(filter)
      .populate('availableDeliveryPartners', 'name logo')
      .skip(skip)
      .limit(Number(limit))
      .sort({ 'location.city': 1 });

    const total = await DeliveryZone.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: zones,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDeliveryZone = async (req, res) => {
  try {
    const { id } = req.params;

    const zone = await DeliveryZone.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    }).populate('availableDeliveryPartners', 'name logo');

    if (!zone) {
      return res.status(404).json({ success: false, message: 'Delivery zone not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery zone updated successfully',
      data: zone
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// DELIVERY CONFIGURATION (Provider Settings)
// ============================================

export const getProviderDeliveryConfig = async (req, res) => {
  try {
    const { providerId } = req.params;

    const config = await DeliveryConfiguration.findOne({ providerId })
      .populate('selectedDeliveryPartner', 'name logo email')
      .populate('serviceCoverage.zoneId', 'name location.city');

    if (!config) {
      // Create default configuration if doesn't exist
      const user = await User.findById(providerId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Provider not found' });
      }

      const newConfig = new DeliveryConfiguration({
        providerId,
        providerType: user.vendorType,
        businessName: user.businessName || user.name,
        offerDelivery: false
      });

      await newConfig.save();
      return res.status(201).json({
        success: true,
        message: 'Delivery configuration created',
        data: newConfig
      });
    }

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProviderDeliveryConfig = async (req, res) => {
  try {
    const { providerId } = req.params;
    const updates = req.body;

    let config = await DeliveryConfiguration.findOne({ providerId });

    if (!config) {
      const user = await User.findById(providerId);
      config = new DeliveryConfiguration({
        providerId,
        providerType: user.vendorType,
        businessName: user.businessName || user.name,
        ...updates
      });
    } else {
      Object.assign(config, updates);
    }

    await config.save();

    await config.populate('selectedDeliveryPartner', 'name logo email');

    res.status(200).json({
      success: true,
      message: 'Delivery configuration updated successfully',
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const selectDeliveryPartner = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { deliveryPartnerId, isDefault } = req.body;

    const partner = await DeliveryPartner.findById(deliveryPartnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    if (partner.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Delivery partner is not active' });
    }

    let config = await DeliveryConfiguration.findOne({ providerId });

    if (!config) {
      const user = await User.findById(providerId);
      config = new DeliveryConfiguration({
        providerId,
        providerType: user.vendorType,
        businessName: user.businessName || user.name,
        selectedDeliveryPartners: [
          {
            partnerId: deliveryPartnerId,
            isDefault: isDefault || true
          }
        ],
        offerDelivery: true
      });
    } else {
      // Check if partner already exists
      const existingPartner = config.selectedDeliveryPartners.find(
        (p) => p.partnerId.toString() === deliveryPartnerId
      );

      if (!existingPartner) {
        // If setting as default, remove default from others
        if (isDefault) {
          config.selectedDeliveryPartners.forEach((p) => {
            p.isDefault = false;
          });
        }

        config.selectedDeliveryPartners.push({
          partnerId: deliveryPartnerId,
          isDefault: isDefault || config.selectedDeliveryPartners.length === 0
        });
      } else if (isDefault) {
        // Update default status
        config.selectedDeliveryPartners.forEach((p) => {
          p.isDefault = p.partnerId.toString() === deliveryPartnerId;
        });
      }

      config.offerDelivery = true;
    }

    await config.save();
    await config.populate('selectedDeliveryPartners.partnerId', 'name logo email phone status');

    res.status(200).json({
      success: true,
      message: 'Delivery partner added successfully',
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeDeliveryPartner = async (req, res) => {
  try {
    const { providerId, partnerId } = req.params;

    const config = await DeliveryConfiguration.findOne({ providerId });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }

    // Remove the partner
    config.selectedDeliveryPartners = config.selectedDeliveryPartners.filter(
      (p) => p.partnerId.toString() !== partnerId
    );

    // If we removed the default, set new default
    if (config.selectedDeliveryPartners.length > 0) {
      const hasDefault = config.selectedDeliveryPartners.some((p) => p.isDefault);
      if (!hasDefault) {
        config.selectedDeliveryPartners[0].isDefault = true;
      }
    } else {
      // No more partners, disable delivery
      config.offerDelivery = false;
    }

    await config.save();
    await config.populate('selectedDeliveryPartners.partnerId', 'name logo email phone');

    res.status(200).json({
      success: true,
      message: 'Delivery partner removed successfully',
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setDefaultDeliveryPartner = async (req, res) => {
  try {
    const { providerId, partnerId } = req.params;

    const config = await DeliveryConfiguration.findOne({ providerId });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }

    // Update default status
    config.selectedDeliveryPartners.forEach((p) => {
      p.isDefault = p.partnerId.toString() === partnerId;
    });

    await config.save();
    await config.populate('selectedDeliveryPartners.partnerId', 'name logo email phone');

    res.status(200).json({
      success: true,
      message: 'Default delivery partner set successfully',
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// DELIVERY TRACKING & MANAGEMENT
// ============================================

export const getDeliveries = async (req, res) => {
  try {
    const { status, providerId, customerId, partnerId, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (providerId) filter.providerId = providerId;
    if (customerId) filter.customerId = customerId;
    if (partnerId) filter.deliveryPartnerId = partnerId;

    const skip = (page - 1) * limit;
    const deliveries = await Delivery.find(filter)
      .populate('orderId', 'orderNumber')
      .populate('deliveryPartnerId', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Delivery.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: deliveries,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status, location, notes } = req.body;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    delivery.status = status;

    // Add to tracking history
    delivery.trackingHistory.push({
      status,
      location,
      timestamp: new Date(),
      notes
    });

    // Update timeline based on status
    if (status === 'confirmed') delivery.timeline.confirmedAt = new Date();
    else if (status === 'assigned') delivery.timeline.assignedAt = new Date();
    else if (status === 'picked-up') delivery.timeline.pickedUpAt = new Date();
    else if (status === 'delivered') delivery.timeline.deliveredAt = new Date();

    await delivery.save();

    res.status(200).json({
      success: true,
      message: 'Delivery status updated successfully',
      data: delivery
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// DELIVERY ANALYTICS & REPORTS
// ============================================

export const getDeliveryAnalytics = async (req, res) => {
  try {
    const { partnerId, zoneId, dateFrom, dateTo } = req.query;

    let filter = {};
    if (partnerId) filter.deliveryPartnerId = partnerId;
    if (zoneId) filter.zoneId = zoneId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const deliveries = await Delivery.find(filter);

    const analytics = {
      totalDeliveries: deliveries.length,
      successfulDeliveries: deliveries.filter((d) => d.status === 'delivered').length,
      failedDeliveries: deliveries.filter((d) => d.status === 'failed').length,
      averageDeliveryTime:
        deliveries.reduce((sum, d) => sum + (d.timeline.deliveredAt ? d.timeline.deliveredAt - d.timeline.createdAt : 0), 0) /
        deliveries.length,
      statusBreakdown: {
        pending: deliveries.filter((d) => d.status === 'pending').length,
        confirmed: deliveries.filter((d) => d.status === 'confirmed').length,
        assigned: deliveries.filter((d) => d.status === 'assigned').length,
        pickUp: deliveries.filter((d) => d.status === 'picked-up').length,
        inTransit: deliveries.filter((d) => d.status === 'in-transit').length,
        delivered: deliveries.filter((d) => d.status === 'delivered').length,
        failed: deliveries.filter((d) => d.status === 'failed').length
      },
      totalDeliveryRevenue: deliveries.reduce((sum, d) => sum + (d.deliveryCost?.total || 0), 0),
      averageRating: deliveries.reduce((sum, d) => sum + (d.rating?.customerRating?.score || 0), 0) / deliveries.length
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const calculateDeliveryCost = async (req, res) => {
  try {
    const { zoneId, distance, weight, itemCount, deliveryType, providerId } = req.body;

    const zone = await DeliveryZone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Delivery zone not found' });
    }

    const config = await DeliveryConfiguration.findOne({ providerId });
    const partner = await DeliveryPartner.findById(config?.selectedDeliveryPartner);

    // Calculate cost based on hybrid model
    let baseCost = zone.basePricing.basePrice.value;
    let distanceFee = 0;
    let surcharge = 0;

    // Distance fee
    if (zone.distancePricing.enabled && distance) {
      distanceFee = distance * zone.distancePricing.pricePerKm.value;
    }

    // Delivery type multiplier
    const deliveryOption = config?.deliveryOptions?.find((opt) => opt.name === deliveryType);
    const typeMultiplier = deliveryOption?.priceMultiplier || 1.0;

    // Partner surcharge if set
    const partnerSurcharge = zone.partnerSurcharges.find((ps) => ps.deliveryPartnerId.toString() === partner?._id?.toString());
    if (partnerSurcharge) {
      surcharge = partnerSurcharge.surcharge;
    }

    const total = Math.max(
      (baseCost + distanceFee + surcharge) * typeMultiplier,
      zone.basePricing.minPrice || 0
    );

    // Apply free delivery threshold
    if (zone.basePricing.freeDeliveryAbove) {
      return res.status(200).json({
        success: true,
        data: {
          baseCost,
          distanceFee,
          surcharge,
          typeMultiplier,
          subtotal: baseCost + distanceFee + surcharge,
          total: 0,
          freeDelivery: true,
          reason: 'Order value exceeds free delivery threshold'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        baseCost,
        distanceFee,
        surcharge,
        typeMultiplier,
        subtotal: baseCost + distanceFee + surcharge,
        total,
        freeDelivery: false,
        currency: zone.basePricing.basePrice.currency
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
