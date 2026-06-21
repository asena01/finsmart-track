const normalizeIdentityString = (value = '') => String(value || '').trim();

const buildExternalKey = (subjectType, id, suffix = '') => {
  const safeId = normalizeIdentityString(id) || 'unknown';
  const safeSuffix = normalizeIdentityString(suffix);
  return [subjectType, safeId, safeSuffix].filter(Boolean).join(':');
};

export const buildStaffLockIdentity = (staff) => {
  const name = normalizeIdentityString(staff?.name) || 'Staff Member';
  const email = normalizeIdentityString(staff?.email).toLowerCase();
  const phone = normalizeIdentityString(staff?.phone);

  return {
    subjectType: 'staff',
    localId: normalizeIdentityString(staff?._id),
    externalKey: buildExternalKey('staff', staff?._id, email || phone),
    nickName: name,
    contact: email || phone || '',
    displayName: name,
    sex: 1
  };
};

export const buildGuestLockIdentity = ({ guest, booking }) => {
  const name = normalizeIdentityString(guest?.name) || 'Guest';
  const email = normalizeIdentityString(guest?.email).toLowerCase();
  const phone = normalizeIdentityString(guest?.phone);
  const bookingNumber = normalizeIdentityString(booking?.bookingNumber);

  return {
    subjectType: 'guest',
    localId: normalizeIdentityString(guest?._id),
    externalKey: buildExternalKey('guest', guest?._id || booking?._id, bookingNumber),
    nickName: bookingNumber ? `${name} ${bookingNumber}`.trim() : name,
    contact: email || phone || '',
    displayName: name,
    bookingNumber,
    sex: 1
  };
};

export const buildLockIdentityReference = (identity, overrides = {}) => {
  const provider = 'tuya';
  
  return {
    provider: overrides.provider || provider,
    subjectType: identity?.subjectType || null,
    localId: identity?.localId || null,
    externalKey: identity?.externalKey || null,
    nickName: identity?.nickName || null,
    contact: identity?.contact || null,
    displayName: identity?.displayName || null,
    bookingNumber: identity?.bookingNumber || null,
    tuyaUserId: null,
    ttlockUserId: null,
    unlockSn: null,
    unlockType: null,
    pendingPasswordId: null,
    syncState: 'pending',
    lastSyncedAt: null,
    ...overrides
  };
};
