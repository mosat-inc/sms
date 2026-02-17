const normalizeIp = (ip) => {
  if (!ip) return '';
  // Express may provide IPv6-mapped IPv4: ::ffff:127.0.0.1
  if (ip.startsWith('::ffff:')) return ip.slice('::ffff:'.length);
  return ip;
};

const ipToInt = (ip) => {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
};

const cidrContains = (cidr, ip) => {
  const [base, maskStr] = cidr.split('/');
  const maskBits = Number(maskStr);
  const baseInt = ipToInt(base);
  const ipInt = ipToInt(ip);
  if (baseInt === null || ipInt === null) return false;
  if (!Number.isInteger(maskBits) || maskBits < 0 || maskBits > 32) return false;
  const mask = maskBits === 0 ? 0 : (~((1 << (32 - maskBits)) - 1) >>> 0) >>> 0;
  return (baseInt & mask) === (ipInt & mask);
};

const parseAllowedIps = () => {
  const raw = (process.env.SCHOOL_ALLOWED_IPS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Enforce "on premises" by restricting to allowed IPs/CIDRs.
 * - Configure env `SCHOOL_ALLOWED_IPS` as comma-separated IPs/CIDRs.
 *   Example: "196.10.10.0/24, 10.0.0.5, 127.0.0.1"
 * - If not configured, allow all (to avoid breaking dev).
 * - Admins can be exempted by passing `{ allowAdminBypass: true }`.
 */
const requireOnPremises = (opts = {}) => {
  const { allowAdminBypass = true } = opts;
  return (req, res, next) => {
    try {
      if (allowAdminBypass && req.user?.role === 'admin') return next();

      const allowed = parseAllowedIps();
      if (allowed.length === 0) return next();

      const ip = normalizeIp(req.ip);
      const ok = allowed.some((entry) => {
        if (entry.includes('/')) return cidrContains(entry, ip);
        return normalizeIp(entry) === ip;
      });

      if (!ok) {
        return res.status(403).json({
          success: false,
          message: 'Action blocked: this operation is only allowed from within the school premises.',
          code: 'ON_PREMISES_REQUIRED',
        });
      }

      return next();
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Premises check failed' });
    }
  };
};

module.exports = { requireOnPremises };

