const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    inUse: {
        type: Boolean,
        default: false
    },
    startTime: Date,
    endTime: Date,
    lastEndTime: Date,
    defaultTime: {
        type: Number,
        default: 30
    },
    currentUserEmail: String,
    notifyUsers: [{
        email: String,
        notified: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});

// Add index for better query performance
machineSchema.index({ inUse: 1 });

module.exports = mongoose.model('Machine', machineSchema);