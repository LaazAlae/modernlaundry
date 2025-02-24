const { createHash } = require('crypto');
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return false;
    }
    return emailRegex.test(email.trim());
};

const validateDuration = (duration) => {
    // Convert to number if string
    const numDuration = Number(duration);
    
    // Check if it's a valid number
    if (isNaN(numDuration)) {
        return false;
    }
    
    // Check if it's within bounds and is an integer
    return Number.isInteger(numDuration) && numDuration >= 5 && numDuration <= 90;
};

const validationMiddleware = {
    validateStartMachine: (req, res, next) => {
        const { duration, email } = req.body;

        // Validate duration
        if (!validateDuration(duration)) {
            return res.status(400).json({
                error: 'Invalid duration. Must be between 5 and 90 minutes.',
                details: 'Duration validation failed'
            });
        }

        // Validate email if provided
        if (email && !validateEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email format',
                details: 'Email validation failed'
            });
        }

        // If validation passes, convert duration to number
        req.body.duration = Number(duration);
        if (email) {
            req.body.email = email.trim().toLowerCase();
        }

        next();
    },

    validateSubscribe: (req, res, next) => {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email format',
                details: 'Email validation failed'
            });
        }

        req.body.email = email.trim().toLowerCase();
        next();
    },

    validateTestEmail: (req, res, next) => {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email format',
                details: 'Email validation failed'
            });
        }

        req.body.email = email.trim().toLowerCase();
        next();
    }
};

module.exports = validationMiddleware;

// Rate limiting with IP tracking
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.blocked = new Map();
        this.windowMs = 10 * 1000; // 10 seconds
        this.maxRequests = 50;     // 50 requests per window
        this.blockDuration = 30 * 1000; // 30 seconds block
    }

    getKey(ip) {
        return createHash('sha256').update(ip).digest('hex');
    }

    isBlocked(ip) {
        const key = this.getKey(ip);
        const blockedUntil = this.blocked.get(key);
        if (blockedUntil && Date.now() < blockedUntil) {
            return true;
        }
        this.blocked.delete(key);
        return false;
    }

    checkLimit(ip) {
        if (this.isBlocked(ip)) {
            return false;
        }

        const key = this.getKey(ip);
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];

        // Remove old requests
        while (userRequests.length && userRequests[0] < now - this.windowMs) {
            userRequests.shift();
        }

        // Add new request
        userRequests.push(now);
        this.requests.set(key, userRequests);

        // Check if limit exceeded
        if (userRequests.length > this.maxRequests) {
            this.blocked.set(key, now + this.blockDuration);
            return false;
        }

        return true;
    }

    clean() {
        const now = Date.now();
        for (const [key, blockedUntil] of this.blocked.entries()) {
            if (blockedUntil < now) {
                this.blocked.delete(key);
                this.requests.delete(key);
            }
        }
    }
}

// Security middleware
const rateLimiter = new RateLimiter();

// Clean up old records periodically
setInterval(() => rateLimiter.clean(), 60000);

const securityMiddleware = {
    rateLimiter: (req, res, next) => {
        const ip = req.headers['x-real-ip'] || 
                  req.headers['x-forwarded-for'] || 
                  req.connection.remoteAddress;

        if (!rateLimiter.checkLimit(ip)) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.'
            });
        }
        next();
    },

    securityHeaders: (req, res, next) => {
        // Security headers
        res.set({
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;",
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        });
        next();
    }
};

module.exports = securityMiddleware;