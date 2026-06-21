import HotelAmenityService from '../models/HotelAmenityService.js';

const normalizeCategory = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (['airport shuttle', 'airport-shuttle', 'transfer', 'airport transfer'].includes(normalized)) {
    return 'shuttle';
  }

  return normalized;
};

const getAllHotelAmenityServices = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { category, includeInactive = 'false', page = 1, limit = 100 } = req.query;

    const filter = { hotel: hotelId };
    if (category) filter.category = category;
    if (includeInactive !== 'true') filter.isActive = true;

    const skip = (Number(page) - 1) * Number(limit);
    const services = await HotelAmenityService.find(filter)
      .sort({ category: 1, sortOrder: 1, name: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await HotelAmenityService.countDocuments(filter);

    return res.status(200).json({
      status: 'success',
      data: services,
      pagination: {
        total,
        pages: Math.ceil(total / Number(limit)),
        currentPage: Number(page)
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const getHotelAmenityServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await HotelAmenityService.findById(id);

    if (!service) {
      return res.status(404).json({ status: 'failed', message: 'Hotel service not found' });
    }

    return res.status(200).json({ status: 'success', data: service });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const createHotelAmenityService = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { name, description, price, category, ...rest } = req.body;
    const normalizedCategory = normalizeCategory(category);

    if (!name || !description || price === undefined || !normalizedCategory) {
      return res.status(400).json({
        status: 'failed',
        message: 'Missing required fields: name, description, price, category'
      });
    }

    const service = new HotelAmenityService({
      hotel: hotelId,
      name,
      description,
      price,
      category: normalizedCategory,
      ...rest
    });

    await service.save();

    return res.status(201).json({
      status: 'success',
      message: 'Hotel service created successfully',
      data: service
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const updateHotelAmenityService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.category) {
      updates.category = normalizeCategory(updates.category);
    }

    const service = await HotelAmenityService.findByIdAndUpdate(id, updates, { new: true });

    if (!service) {
      return res.status(404).json({ status: 'failed', message: 'Hotel service not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Hotel service updated successfully',
      data: service
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const deleteHotelAmenityService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await HotelAmenityService.findByIdAndDelete(id);

    if (!service) {
      return res.status(404).json({ status: 'failed', message: 'Hotel service not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Hotel service deleted successfully',
      data: service
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

export {
  getAllHotelAmenityServices,
  getHotelAmenityServiceById,
  createHotelAmenityService,
  updateHotelAmenityService,
  deleteHotelAmenityService
};
