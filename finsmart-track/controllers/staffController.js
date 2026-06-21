import Staff from "../models/Staff.js";
import StaffActivityLog from "../models/StaffActivityLog.js";
import StaffSchedule from "../models/StaffSchedule.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import SmartAccessGrant from "../models/SmartAccessGrant.js";
import { randomBytes } from "crypto";
import { sendStaffWelcomeEmail } from "../services/emailService.js";
import SmartLockService from "../services/smartLockService.js";

const buildTemporaryPassword = () => `HTL-${randomBytes(4).toString("hex").toUpperCase()}`;

const KEY_ELIGIBLE_AREAS = new Set(["guest-rooms", "front-desk", "lobby", "maintenance", "security", "admin-office"]);

const getShiftDateTime = (dateValue, timeValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime()) || !timeValue) return null;
  const [hours, minutes] = String(timeValue).split(":").map((value) => Number(value));
  date.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
};

const resolveEligibleKeyRooms = async (hotelId, entry) => {
  if (!KEY_ELIGIBLE_AREAS.has(entry.assignedArea || "")) {
    return [];
  }

  const roomFilter = {
    hotel: hotelId,
    contactlessReady: true
  };

  if (entry.assignedArea === "guest-rooms") {
    return Room.find(roomFilter).populate("smartLockDevice", "deviceId tuyaDeviceId ttlockDeviceId status");
  }

  return Room.find(roomFilter).populate("smartLockDevice", "deviceId tuyaDeviceId ttlockDeviceId status");
};

const revokeScheduleEntrySmartAccess = async (hotelId, scheduleId, entryId) => {
  const grants = await SmartAccessGrant.find({
    hotel: hotelId,
    scheduleId,
    scheduleEntryId: entryId,
    subjectType: "staff",
    status: "active"
  }).populate("device", "deviceId tuyaDeviceId ttlockDeviceId");

  for (const grant of grants) {
    const smartLockTarget = grant.device?.tuyaDeviceId || grant.device?.ttlockDeviceId || grant.device?.deviceId;
    if (smartLockTarget && grant.accessCode) {
      await SmartLockService.removeTemporaryAccess(smartLockTarget, grant.accessCode);
    }
    grant.status = "revoked";
    grant.revokedAt = new Date();
    await grant.save();
  }

  return grants;
};

const issueScheduleEntrySmartAccess = async (hotelId, schedule, entry) => {
  if (!entry?.staff || entry.responseStatus !== "accepted") {
    entry.keyAccessAudit = {
      status: "not-generated",
      reason: "Shift has not been accepted by the assigned staff member.",
      generatedAt: null,
      revokedAt: null,
      grants: []
    };
    await schedule.save();
    return [];
  }

  const staffId = entry.staff?.toString?.() || entry.staff?._id?.toString?.();
  if (!staffId) {
    entry.keyAccessAudit = {
      status: "not-generated",
      reason: "Assigned staff record is missing.",
      generatedAt: null,
      revokedAt: null,
      grants: []
    };
    await schedule.save();
    return [];
  }

  await revokeScheduleEntrySmartAccess(hotelId, schedule._id, entry._id);

  const validFrom = getShiftDateTime(entry.date, entry.startTime);
  const validUntil = getShiftDateTime(entry.date, entry.endTime);
  if (!validFrom || !validUntil || validUntil <= validFrom) {
    entry.keyAccessAudit = {
      status: "not-generated",
      reason: "Shift start and end times are invalid for key issuance.",
      generatedAt: null,
      revokedAt: null,
      grants: []
    };
    await schedule.save();
    return [];
  }

  if (!KEY_ELIGIBLE_AREAS.has(entry.assignedArea || "")) {
    entry.keyAccessAudit = {
      status: "not-generated",
      reason: "Assigned area is not eligible for electronic key access.",
      generatedAt: null,
      revokedAt: null,
      grants: []
    };
    await schedule.save();
    return [];
  }

  const eligibleRooms = await resolveEligibleKeyRooms(hotelId, entry);
  if (!eligibleRooms.length) {
    entry.keyAccessAudit = {
      status: "not-generated",
      reason: "No contactless-ready rooms are available for this shift area.",
      generatedAt: null,
      revokedAt: null,
      grants: []
    };
    await schedule.save();
    return [];
  }
  const createdGrants = [];
  let provisioningFailed = false;

  for (const room of eligibleRooms) {
    const device = room.smartLockDevice;
    if (!device?._id) {
      continue;
    }

    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
    const smartLockTarget = device.tuyaDeviceId || device.ttlockDeviceId || device.deviceId;
    const expiresIn = Math.max(300, Math.floor((validUntil.getTime() - Date.now()) / 1000));

    let deviceProvisioned = false;
    if (smartLockTarget) {
      const provisionResult = await SmartLockService.addTemporaryAccess(
        smartLockTarget,
        entry.staffName || "Staff",
        accessCode,
        expiresIn
      );
      deviceProvisioned = provisionResult.success === true;
      if (!deviceProvisioned) {
        provisioningFailed = true;
      }
    }

    const grant = await SmartAccessGrant.create({
      hotel: hotelId,
      room: room._id,
      device: device._id,
      subjectType: "staff",
      subjectStaff: staffId,
      grantType: "staff-shift",
      accessCode,
      validFrom,
      validUntil,
      scheduleId: schedule._id,
      scheduleEntryId: entry._id,
      metadata: {
        assignedArea: entry.assignedArea || "",
        shiftType: entry.shiftType || "",
        deviceProvisioned
      }
    });

    createdGrants.push(grant);
  }

  entry.keyAccessAudit = {
    status: createdGrants.length > 0 ? "generated" : "not-generated",
    reason: createdGrants.length > 0
      ? (provisioningFailed
          ? "Some provisioning requests failed. Review generated keys below."
          : "Electronic keys generated successfully.")
      : (provisioningFailed
          ? "Provisioning failed for all eligible smart locks."
          : "No smart-lock grants could be generated."),
    generatedAt: new Date(),
    revokedAt: null,
    grants: createdGrants.map((grant) => {
      const matchingRoom = eligibleRooms.find((room) => room._id.toString() === grant.room.toString());
      return {
        grantId: grant._id,
        roomId: grant.room,
        roomNumber: matchingRoom?.roomNumber || "",
        deviceId: matchingRoom?.smartLockDevice?.deviceId || "",
        accessCode: grant.accessCode,
        status: grant.status
      };
    })
  };
  await schedule.save();

  return createdGrants;
};

const accessProfiles = {
  manager: {
    accessRole: "admin",
    allowedModules: ["overview", "bookings", "rooms", "guests", "revenue", "analytics", "food-orders", "maintenance", "staff", "services", "pre-checkin", "chat"],
    allowedAreas: ["front-desk", "lobby", "guest-rooms", "restaurant", "kitchen", "maintenance", "admin-office"],
    permissions: {
      canManageBookings: true,
      canManageRooms: true,
      canManageOrders: true,
      canViewRevenue: true,
      canViewAnalytics: true,
      canManageStaff: true,
      canHandleMaintenance: true
    }
  },
  receptionist: {
    accessRole: "front-desk",
    allowedModules: ["overview", "bookings", "rooms", "guests", "pre-checkin", "chat"],
    allowedAreas: ["front-desk", "lobby", "guest-rooms"],
    permissions: {
      canManageBookings: true,
      canManageRooms: true,
      canManageOrders: false,
      canViewRevenue: false,
      canViewAnalytics: false,
      canManageStaff: false,
      canHandleMaintenance: false
    }
  },
  housekeeping: {
    accessRole: "housekeeping",
    allowedModules: ["overview", "rooms", "housekeeping"],
    allowedAreas: ["guest-rooms", "lobby"],
    permissions: {
      canManageBookings: false,
      canManageRooms: true,
      canManageOrders: false,
      canViewRevenue: false,
      canViewAnalytics: false,
      canManageStaff: false,
      canHandleMaintenance: false
    }
  },
  housekeeper: {
    accessRole: "housekeeping",
    allowedModules: ["overview", "rooms", "housekeeping"],
    allowedAreas: ["guest-rooms", "lobby"],
    permissions: {
      canManageBookings: false,
      canManageRooms: true,
      canManageOrders: false,
      canViewRevenue: false,
      canViewAnalytics: false,
      canManageStaff: false,
      canHandleMaintenance: false
    }
  },
  chef: {
    accessRole: "food-service",
    allowedModules: ["overview", "food-orders", "food-menu"],
    allowedAreas: ["kitchen", "restaurant"],
    permissions: {
      canManageBookings: false,
      canManageRooms: false,
      canManageOrders: true,
      canViewRevenue: false,
      canViewAnalytics: false,
      canManageStaff: false,
      canHandleMaintenance: false
    }
  },
  waiter: {
    accessRole: "food-service",
    allowedModules: ["overview", "food-orders", "services"],
    allowedAreas: ["restaurant", "lobby"],
    permissions: {
      canManageBookings: false,
      canManageRooms: false,
      canManageOrders: true,
      canViewRevenue: false,
      canViewAnalytics: false,
      canManageStaff: false,
      canHandleMaintenance: false
    }
  },
  maintenance: {
    accessRole: "maintenance",
    allowedModules: ["overview", "maintenance", "rooms"],
    allowedAreas: ["guest-rooms", "maintenance", "lobby"],
    permissions: {
      canManageBookings: false,
      canManageRooms: true,
      canManageOrders: false,
      canViewRevenue: false,
      canViewAnalytics: false,
      canManageStaff: false,
      canHandleMaintenance: true
    }
  },
  security: {
    accessRole: "security",
    allowedModules: ["overview", "guests"],
    allowedAreas: ["security", "lobby", "guest-rooms"],
    permissions: {
      canManageBookings: false,
      canManageRooms: false,
      canManageOrders: false,
      canViewRevenue: false,
      canViewAnalytics: false,
      canManageStaff: false,
      canHandleMaintenance: false
    }
  }
};

const getDefaultAccessProfile = (position) => {
  return accessProfiles[position] || {
    accessRole: "custom",
    allowedModules: ["overview"],
    allowedAreas: ["lobby"],
    permissions: {
      canManageBookings: false,
      canManageRooms: false,
      canManageOrders: false,
      canViewRevenue: false,
      canViewAnalytics: false,
      canManageStaff: false,
      canHandleMaintenance: false
    }
  };
};

const normalizeDepartment = (department, position) => {
  const value = (department || '').toString().trim().toLowerCase();
  const mapping = {
    'front desk': 'front-office',
    'front office': 'front-office',
    'front-office': 'front-office',
    'housekeeping': 'housekeeping',
    'kitchen': 'kitchen',
    'restaurant': 'restaurant',
    'maintenance': 'maintenance',
    'security': 'security',
    'admin': 'admin',
    'administration': 'admin',
    'staff': 'admin'
  };

  if (mapping[value]) {
    return mapping[value];
  }

  const defaultsByPosition = {
    manager: 'admin',
    receptionist: 'front-office',
    housekeeping: 'housekeeping',
    housekeeper: 'housekeeping',
    chef: 'kitchen',
    waiter: 'restaurant',
    maintenance: 'maintenance',
    security: 'security',
    other: 'admin'
  };

  return defaultsByPosition[position] || 'admin';
};

const SHIFT_WINDOWS = {
  morning: { startTime: "07:00", endTime: "15:00" },
  evening: { startTime: "15:00", endTime: "23:00" },
  night: { startTime: "23:00", endTime: "07:00" }
};

const getWeekBounds = (weekStartInput) => {
  const weekStart = new Date(weekStartInput || new Date());
  weekStart.setHours(0, 0, 0, 0);

  const day = weekStart.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diffToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

const getScheduleWeekStarts = (weekStartInput, weekEndInput) => {
  const { weekStart: normalizedStart } = getWeekBounds(weekStartInput);
  const { weekStart: normalizedEnd } = getWeekBounds(weekEndInput || weekStartInput);
  const starts = [];
  const cursor = new Date(normalizedStart);

  while (cursor <= normalizedEnd) {
    starts.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return starts;
};

const getShiftCycleForPosition = (position) => {
  const map = {
    manager: ["morning", "evening"],
    receptionist: ["morning", "evening", "night"],
    housekeeping: ["morning", "evening"],
    housekeeper: ["morning", "evening"],
    chef: ["morning", "evening"],
    waiter: ["morning", "evening"],
    maintenance: ["morning", "evening"],
    security: ["morning", "evening", "night"],
    other: ["morning"]
  };

  return map[position] || ["morning"];
};

const sanitizeStaff = (staff) => {
  if (!staff) return staff;
  const result = staff.toObject ? staff.toObject() : { ...staff };
  delete result.password;
  return result;
};

const normalizeStaffPayload = (payload) => {
  const defaultAccess = getDefaultAccessProfile(payload.position);
  const normalizedJoinDate = payload.hireDate || payload.joinDate;
  const normalizedModules = Array.isArray(payload.allowedModules) && payload.allowedModules.length > 0
    ? payload.allowedModules.map((module) => module === 'chat-center' ? 'chat' : module)
    : defaultAccess.allowedModules;

  return {
    ...payload,
    joinDate: normalizedJoinDate,
    department: normalizeDepartment(payload.department, payload.position),
    accessRole: payload.accessRole || defaultAccess.accessRole,
    allowedModules: normalizedModules,
    allowedAreas: Array.isArray(payload.allowedAreas) && payload.allowedAreas.length > 0
      ? payload.allowedAreas
      : defaultAccess.allowedAreas,
    permissions: {
      ...defaultAccess.permissions,
      ...(payload.permissions || {})
    }
  };
};

const getAllStaff = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, position, department, page = 1, limit = 10 } = req.query;

    let filter = { hotel: hotelId };
    if (status) filter.status = status;
    if (position) filter.position = position;
    if (department) filter.department = department;

    const skip = (page - 1) * limit;
    const staff = await Staff.find(filter)
      .select("-password")
      .limit(limit * 1)
      .skip(skip)
      .sort({ name: 1 });

    const total = await Staff.countDocuments(filter);

    return res.status(200).json({
      status: "success",
      data: staff,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id).select("-password");

    if (!staff) return res.status(404).json({ status: "failed", message: "Staff not found" });

    return res.status(200).json({ status: "success", data: staff });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const createStaff = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { name, email, position, department, salary, ...rest } = req.body;

    if (!name || !email || !position || !department) {
      return res.status(400).json({ status: "failed", message: "Missing required fields" });
    }

    const existingStaff = await Staff.findOne({ hotel: hotelId, email });
    if (existingStaff) {
      return res.status(400).json({ status: "failed", message: "Email already exists" });
    }

    const temporaryPassword = rest.password || buildTemporaryPassword();
    const normalizedPayload = normalizeStaffPayload({
      ...rest,
      position
    });

    const staff = new Staff({
      hotel: hotelId,
      name,
      email,
      position,
      department,
      salary,
      ...normalizedPayload,
      password: temporaryPassword,
      mustChangePassword: true,
      temporaryPasswordIssuedAt: new Date()
    });

    await staff.save();

    let emailDelivery = null;
    try {
      const hotel = await Hotel.findById(hotelId).select("name");
      const hotelName = hotel?.name || "Hotel";
      emailDelivery = await sendStaffWelcomeEmail(email, {
        staffName: name,
        hotelName,
        position,
        email,
        temporaryPassword
      });
    } catch (emailError) {
      console.error("Failed to send staff welcome email:", emailError);
    }

    const responseStaff = sanitizeStaff(staff);

    return res.status(201).json({
      status: "success",
      message: "Staff member added successfully",
      data: {
        ...responseStaff,
        temporaryPassword,
        emailSent: Boolean(emailDelivery?.success)
      },
      ...(emailDelivery?.success
        ? {}
        : { warning: "Staff created, but the temporary password email could not be delivered." })
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = normalizeStaffPayload(req.body);

    // Don't allow password update through this endpoint
    if (updates.password) delete updates.password;

    const staff = await Staff.findByIdAndUpdate(id, updates, { new: true }).select("-password");

    if (!staff) return res.status(404).json({ status: "failed", message: "Staff not found" });

    return res.status(200).json({
      status: "success",
      message: "Staff updated successfully",
      data: staff
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({ status: "failed", message: "Staff not found" });
    }

    const temporaryPassword = buildTemporaryPassword();
    staff.password = temporaryPassword;
    staff.mustChangePassword = true;
    staff.temporaryPasswordIssuedAt = new Date();
    await staff.save();

    return res.status(200).json({
      status: "success",
      message: "Temporary password reset successfully",
      data: {
        ...sanitizeStaff(staff),
        temporaryPassword
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getStaffActivitySummary = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const staff = await Staff.findOne({ _id: id, hotel: hotelId }).select("-password");

    if (!staff) {
      return res.status(404).json({ status: "failed", message: "Staff not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allLogs, recentLogs] = await Promise.all([
      StaffActivityLog.find({ hotel: hotelId, staff: id }).sort({ timestamp: -1 }),
      StaffActivityLog.find({ hotel: hotelId, staff: id }).sort({ timestamp: -1 }).limit(8)
    ]);

    const successfulActions = allLogs.filter((log) => log.status === "success").length;
    const pendingActions = allLogs.filter((log) => log.status === "pending").length;
    const failedActions = allLogs.filter((log) => log.status === "failed").length;
    const todayActions = allLogs.filter((log) => new Date(log.timestamp) >= today).length;
    const loginLog = allLogs.find((log) => log.action === "login");

    return res.status(200).json({
      status: "success",
      data: {
        staff: sanitizeStaff(staff),
        summary: {
          totalActions: allLogs.length,
          todayActions,
          successfulActions,
          pendingActions,
          failedActions,
          lastLogin: loginLog?.timestamp || staff.lastLogin || null,
          lastActivityAt: allLogs[0]?.timestamp || null
        },
        recentActivities: recentLogs.map((log) => ({
          _id: log._id,
          action: log.action,
          description: log.description,
          status: log.status,
          timestamp: log.timestamp
        }))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const generateStaffSchedule = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { weekStart, weekEnd, notes, generatedBy } = req.body;
    const scheduleWeekStarts = getScheduleWeekStarts(weekStart, weekEnd);

    const activeStaff = await Staff.find({
      hotel: hotelId,
      status: "active"
    }).select("-password").sort({ department: 1, name: 1 });

    if (activeStaff.length === 0) {
      return res.status(400).json({
        status: "failed",
        message: "No active staff available for schedule generation"
      });
    }

    const existingSchedules = await StaffSchedule.find({
      hotel: hotelId,
      weekStart: { $in: scheduleWeekStarts }
    }).select("weekStart weekEnd");

    const existingMap = new Map(
      existingSchedules.map((schedule) => [new Date(schedule.weekStart).toISOString(), schedule])
    );

    const createdSchedules = [];
    const skippedSchedules = [];

    for (const scheduleWeekStart of scheduleWeekStarts) {
      const scheduleKey = scheduleWeekStart.toISOString();
      if (existingMap.has(scheduleKey)) {
        const existingSchedule = existingMap.get(scheduleKey);
        skippedSchedules.push({
          weekStart: existingSchedule.weekStart,
          weekEnd: existingSchedule.weekEnd,
          reason: "Schedule already exists for this week"
        });
        continue;
      }

      const { weekEnd: normalizedWeekEnd } = getWeekBounds(scheduleWeekStart);
      const entries = [];
      const staffRotation = {};

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const currentDate = new Date(scheduleWeekStart);
        currentDate.setDate(scheduleWeekStart.getDate() + dayIndex);

        activeStaff.forEach((member) => {
          const shifts = member.shiftType
            ? [member.shiftType]
            : getShiftCycleForPosition(member.position);

          const key = member._id.toString();
          const rotation = staffRotation[key] || 0;
          const shiftType = shifts[rotation % shifts.length];
          staffRotation[key] = rotation + 1;
          const shiftWindow = SHIFT_WINDOWS[shiftType] || SHIFT_WINDOWS.morning;

          entries.push({
            staff: member._id,
            staffName: member.name,
            position: member.position,
            department: member.department,
            date: new Date(currentDate),
            shiftType,
            startTime: shiftWindow.startTime,
            endTime: shiftWindow.endTime,
            assignedArea: member.allowedAreas?.[0] || member.department,
            notes: "",
            status: "pending-acceptance",
            responseStatus: "pending"
          });
        });
      }

      const createdSchedule = await StaffSchedule.create({
        hotel: hotelId,
        weekStart: scheduleWeekStart,
        weekEnd: normalizedWeekEnd,
        generatedBy: generatedBy || "hotel-admin",
        notes: notes || "",
        entries
      });

      createdSchedules.push(createdSchedule);
    }

    const allRequestedSchedules = await StaffSchedule.find({
      hotel: hotelId,
      weekStart: { $in: scheduleWeekStarts }
    })
      .sort({ weekStart: 1 })
      .populate("entries.staff", "name email position department shiftType");

    const messageParts = [];
    if (createdSchedules.length > 0) {
      messageParts.push(`${createdSchedules.length} schedule ${createdSchedules.length === 1 ? "week" : "weeks"} generated`);
    }
    if (skippedSchedules.length > 0) {
      messageParts.push(`${skippedSchedules.length} existing ${skippedSchedules.length === 1 ? "week was" : "weeks were"} kept`);
    }

    return res.status(200).json({
      status: "success",
      message: messageParts.join(". ") || "No new schedules were generated",
      data: {
        schedules: allRequestedSchedules,
        createdSchedules,
        skippedSchedules
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getStaffSchedule = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { weekStart, weekEnd } = req.query;
    const scheduleWeekStarts = getScheduleWeekStarts(weekStart, weekEnd);

    const schedules = await StaffSchedule.find({
      hotel: hotelId,
      weekStart: { $in: scheduleWeekStarts }
    })
      .sort({ weekStart: 1 })
      .populate("entries.staff", "name email position department shiftType");

    return res.status(200).json({
      status: "success",
      data: schedules
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateStaffScheduleEntry = async (req, res) => {
  try {
    const { hotelId, scheduleId, entryId } = req.params;
    const {
      staffId,
      date,
      shiftType,
      startTime,
      endTime,
      assignedArea,
      notes,
      status
    } = req.body;

    const schedule = await StaffSchedule.findOne({ _id: scheduleId, hotel: hotelId });
    if (!schedule) {
      return res.status(404).json({ status: 'failed', message: 'Schedule not found' });
    }

    const entry = schedule.entries.id(entryId);
    if (!entry) {
      return res.status(404).json({ status: 'failed', message: 'Schedule entry not found' });
    }

    let assignedStaff = null;
    if (staffId) {
      assignedStaff = await Staff.findOne({ _id: staffId, hotel: hotelId }).select('-password');
      if (!assignedStaff) {
        return res.status(404).json({ status: 'failed', message: 'Assigned staff member not found' });
      }

      entry.staff = assignedStaff._id;
      entry.staffName = assignedStaff.name;
      entry.position = assignedStaff.position;
      entry.department = assignedStaff.department;
      entry.assignedArea = assignedArea || assignedStaff.allowedAreas?.[0] || assignedStaff.department;
    }

    if (date) {
      entry.date = new Date(date);
    }

    if (shiftType) {
      if (!Object.keys(SHIFT_WINDOWS).includes(shiftType)) {
        return res.status(400).json({ status: 'failed', message: 'Invalid shift type' });
      }
      entry.shiftType = shiftType;
      const shiftWindow = SHIFT_WINDOWS[shiftType] || SHIFT_WINDOWS.morning;
      entry.startTime = startTime || shiftWindow.startTime;
      entry.endTime = endTime || shiftWindow.endTime;
    } else {
      if (startTime) entry.startTime = startTime;
      if (endTime) entry.endTime = endTime;
    }

    if (assignedArea !== undefined) {
      entry.assignedArea = assignedArea;
    }

    if (notes !== undefined) {
      entry.notes = notes;
    }

    if (status) {
      entry.status = status;
    } else {
      entry.status = 'pending-acceptance';
    }

    entry.responseStatus = 'pending';
    entry.responseNote = '';
    entry.respondedAt = null;
    entry.swapRequest = undefined;

    await schedule.save();
    await revokeScheduleEntrySmartAccess(hotelId, schedule._id, entry._id);

    const revokedGrants = await revokeScheduleEntrySmartAccess(hotelId, schedule._id, entry._id);
    entry.keyAccessAudit = {
      status: 'pending',
      reason: revokedGrants.length ? 'Existing electronic keys were revoked because the shift changed.' : 'Shift updated. Electronic key issuance is pending acceptance.',
      generatedAt: entry.keyAccessAudit?.generatedAt || null,
      revokedAt: revokedGrants.length ? new Date() : null,
      grants: []
    };
    await schedule.save();

    const updatedSchedule = await StaffSchedule.findById(scheduleId)
      .populate('entries.staff', 'name email position department shiftType allowedAreas');

    return res.status(200).json({
      status: 'success',
      message: 'Schedule entry updated successfully',
      data: updatedSchedule
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const deleteStaffScheduleEntry = async (req, res) => {
  try {
    const { hotelId, scheduleId, entryId } = req.params;

    const schedule = await StaffSchedule.findOne({ _id: scheduleId, hotel: hotelId });
    if (!schedule) {
      return res.status(404).json({ status: 'failed', message: 'Schedule not found' });
    }

    const entry = schedule.entries.id(entryId);
    if (!entry) {
      return res.status(404).json({ status: 'failed', message: 'Schedule entry not found' });
    }

    await revokeScheduleEntrySmartAccess(hotelId, schedule._id, entry._id);
    entry.deleteOne();

    if (schedule.entries.length === 0) {
      await StaffSchedule.deleteOne({ _id: scheduleId, hotel: hotelId });
      return res.status(200).json({
        status: 'success',
        message: 'Schedule entry removed and empty schedule week deleted',
        data: null
      });
    }

    await schedule.save();

    const updatedSchedule = await StaffSchedule.findById(scheduleId)
      .populate('entries.staff', 'name email position department shiftType allowedAreas');

    return res.status(200).json({
      status: 'success',
      message: 'Schedule entry deleted successfully',
      data: updatedSchedule
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const deleteStaffScheduleWeek = async (req, res) => {
  try {
    const { hotelId, scheduleId } = req.params;

    const activeGrants = await SmartAccessGrant.find({
      hotel: hotelId,
      scheduleId,
      subjectType: "staff",
      status: "active"
    }).populate("device", "deviceId tuyaDeviceId ttlockDeviceId");

    for (const grant of activeGrants) {
      const smartLockTarget = grant.device?.tuyaDeviceId || grant.device?.ttlockDeviceId || grant.device?.deviceId;
      if (smartLockTarget && grant.accessCode) {
        await SmartLockService.removeTemporaryAccess(smartLockTarget, grant.accessCode);
      }
      grant.status = "revoked";
      grant.revokedAt = new Date();
      await grant.save();
    }

    const deleted = await StaffSchedule.findOneAndDelete({ _id: scheduleId, hotel: hotelId });
    if (!deleted) {
      return res.status(404).json({ status: 'failed', message: 'Schedule week not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Schedule week deleted successfully',
      data: deleted
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const getStaffScheduleForStaff = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const { weekStart } = req.query;
    const { weekStart: normalizedWeekStart } = getWeekBounds(weekStart);

    const schedule = await StaffSchedule.findOne({
      hotel: hotelId,
      weekStart: normalizedWeekStart,
      'entries.staff': id
    }).populate('entries.staff', 'name email position department shiftType');

    if (!schedule) {
      return res.status(200).json({ status: 'success', data: null });
    }

    const filteredEntries = schedule.entries.filter((entry) => entry.staff?.toString?.() === id || entry.staff?._id?.toString?.() === id);
    const colleagueEntries = schedule.entries
      .filter((entry) => entry.staff?.toString?.() !== id && entry.staff?._id?.toString?.() !== id)
      .map((entry) => ({
        _id: entry._id,
        staff: entry.staff,
        staffName: entry.staffName,
        position: entry.position,
        department: entry.department,
        date: entry.date,
        shiftType: entry.shiftType,
        startTime: entry.startTime,
        endTime: entry.endTime,
        assignedArea: entry.assignedArea,
        status: entry.status,
        responseStatus: entry.responseStatus
      }));

    return res.status(200).json({
      status: 'success',
      data: {
        ...schedule.toObject(),
        entries: filteredEntries,
        colleagueEntries
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const requestScheduleSwap = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const { entryId, targetEntryId, reason } = req.body;

    if (!entryId || !targetEntryId) {
      return res.status(400).json({ status: 'failed', message: 'entryId and targetEntryId are required' });
    }

    const schedule = await StaffSchedule.findOne({
      hotel: hotelId,
      'entries._id': { $in: [entryId, targetEntryId] }
    });

    if (!schedule) {
      return res.status(404).json({ status: 'failed', message: 'Schedule not found' });
    }

    const ownEntry = schedule.entries.id(entryId);
    const targetEntry = schedule.entries.id(targetEntryId);

    if (!ownEntry || !targetEntry) {
      return res.status(404).json({ status: 'failed', message: 'Schedule entry not found' });
    }

    const ownStaffId = ownEntry.staff?.toString?.() || ownEntry.staff?._id?.toString?.();
    const targetStaffId = targetEntry.staff?.toString?.() || targetEntry.staff?._id?.toString?.();

    if (ownStaffId !== id) {
      return res.status(403).json({ status: 'failed', message: 'You can only request swaps for your own shift' });
    }

    ownEntry.swapRequest = {
      requestedByStaff: ownEntry.staff,
      requestedByName: ownEntry.staffName,
      targetStaff: targetEntry.staff,
      targetStaffName: targetEntry.staffName,
      targetEntryId: targetEntry._id,
      reason: reason || '',
      status: 'pending',
      requestedAt: new Date()
    };

    await schedule.save();

    return res.status(200).json({
      status: 'success',
      message: 'Swap request submitted',
      data: schedule
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const respondToScheduleEntry = async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const { entryId, responseStatus, responseNote } = req.body;

    if (!entryId || !['accepted', 'rejected'].includes(responseStatus)) {
      return res.status(400).json({ status: 'failed', message: 'entryId and valid responseStatus are required' });
    }

    const schedule = await StaffSchedule.findOne({
      hotel: hotelId,
      'entries._id': entryId,
      'entries.staff': id
    });

    if (!schedule) {
      return res.status(404).json({ status: 'failed', message: 'Schedule entry not found' });
    }

    const entry = schedule.entries.id(entryId);
    entry.responseStatus = responseStatus;
    entry.status = responseStatus === 'accepted' ? 'accepted' : 'rejected';
    entry.responseNote = responseNote || '';
    entry.respondedAt = new Date();

    const allResponded = schedule.entries.every((item) => item.responseStatus !== 'pending');
    const allAccepted = schedule.entries.every((item) => item.responseStatus === 'accepted');

    if (allAccepted) {
      schedule.entries.forEach((item) => {
        item.status = 'final';
      });
    } else if (allResponded) {
      schedule.entries.forEach((item) => {
        if (item.responseStatus === 'accepted') {
          item.status = 'accepted';
        }
      });
    }

    await schedule.save();

    if (responseStatus === 'accepted') {
      await issueScheduleEntrySmartAccess(hotelId, schedule, entry);
    } else {
      const revokedGrants = await revokeScheduleEntrySmartAccess(hotelId, schedule._id, entry._id);
      entry.keyAccessAudit = {
        status: 'revoked',
        reason: revokedGrants.length ? 'Electronic keys were revoked after the shift was rejected.' : 'No active electronic keys remained for this rejected shift.',
        generatedAt: entry.keyAccessAudit?.generatedAt || null,
        revokedAt: new Date(),
        grants: []
      };
      await schedule.save();
    }

    return res.status(200).json({
      status: 'success',
      message: `Schedule ${responseStatus} successfully`,
      data: schedule
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findByIdAndDelete(id);
    if (!staff) return res.status(404).json({ status: "failed", message: "Staff not found" });

    return res.status(200).json({
      status: "success",
      message: "Staff deleted successfully",
      data: staff
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

export {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  getStaffActivitySummary,
  generateStaffSchedule,
  getStaffSchedule,
  updateStaffScheduleEntry,
  deleteStaffScheduleEntry,
  deleteStaffScheduleWeek,
  getStaffScheduleForStaff,
  respondToScheduleEntry,
  requestScheduleSwap
};
