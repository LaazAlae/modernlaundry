require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://mongodb:27017/laundry',
    EMAIL_USER: process.env.EMAIL_USER || 'getnotifiedrightnow@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS || '15DECembre2@@3',
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Email configuration
    EMAIL_SERVICE: 'gmail',
    
    // Security
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    
    // Application defaults
    DEFAULT_MACHINE_TIMES: {
        washer: 30,
        dryer: 60
    },
    
    // Time limits (in minutes)
    MIN_TIMER: 5,
    MAX_TIMER: 90
};