const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return false;
    }
    return emailRegex.test(email.trim());
};

const validateDuration = (duration) => {
    const numDuration = Number(duration);
    return !isNaN(numDuration) && 
           Number.isInteger(numDuration) && 
           numDuration >= 5 && 
           numDuration <= 90;
};

const validationMiddleware = {
    validateStartMachine: (req, res, next) => {
        const { duration, email } = req.body;

        if (!validateDuration(duration)) {
            return res.status(400).json({
                error: 'Invalid duration. Must be between 5 and 90 minutes.'
            });
        }

        if (email && !validateEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        req.body.duration = Number(duration);
        if (email) {
            req.body.email = email.trim().toLowerCase();
        }

        next();
    },

    validateSubscribe: (req, res, next) => {
        const { email } = req.body;

        if (!validateEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        req.body.email = email.trim().toLowerCase();
        next();
    },

    validateTestEmail: (req, res, next) => {
        const { email } = req.body;

        if (!validateEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        req.body.email = email.trim().toLowerCase();
        next();
    }
};

module.exports = validationMiddleware;