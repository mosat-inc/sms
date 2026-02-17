const jwt = require('jsonwebtoken');

function authenticateParent(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.slice('Bearer '.length);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (!decoded || decoded.type !== 'parent' || !decoded.student_id) {
      return res.status(401).json({ success: false, message: 'Invalid parent token' });
    }

    req.parent = {
      student_id: Number(decoded.student_id),
      admission_number: decoded.admission_number,
      must_change_password: Boolean(decoded.must_change_password),
    };

    next();
  } catch (error) {
    console.error('Parent auth error:', error);
    return res.status(500).json({ success: false, message: 'Authentication failed' });
  }
}

module.exports = { authenticateParent };
