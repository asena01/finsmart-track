const sseStreams = new Map();

/**
 * Register a client for identity verification status updates
 * @param {string} bookingId 
 * @param {Object} res Express response object
 */
export const registerIdentitySseStream = (bookingId, res) => {
  const streams = sseStreams.get(bookingId) || new Set();
  streams.add(res);
  sseStreams.set(bookingId, streams);

  // Send initial ping to keep connection alive
  res.write(': ping\n\n');
};

/**
 * Unregister a client
 * @param {string} bookingId 
 * @param {Object} res Express response object
 */
export const unregisterIdentitySseStream = (bookingId, res) => {
  const streams = sseStreams.get(bookingId);
  if (!streams) return;
  streams.delete(res);
  if (streams.size === 0) {
    sseStreams.delete(bookingId);
  }
};

/**
 * Notify all registered clients about an update to the identity verification session
 * @param {string} bookingId 
 * @param {Object} session The updated IdentityVerificationSession document
 */
export const notifyIdentityUpdate = (bookingId, session) => {
  const streams = sseStreams.get(bookingId);
  if (!streams || streams.size === 0) return;

  const payload = {
    status: 'success',
    data: {
      bookingId,
      verification: session,
      updatedAt: new Date().toISOString()
    }
  };

  const data = `event: identity-verification-updated\ndata: ${JSON.stringify(payload)}\n\n`;
  
  for (const res of streams) {
    try {
      res.write(data);
    } catch (err) {
      console.warn(`Failed to write to SSE stream for booking ${bookingId}:`, err.message);
    }
  }
};

export default {
  registerIdentitySseStream,
  unregisterIdentitySseStream,
  notifyIdentityUpdate
};
