const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const path = require('path'); 
const Machine = require('./models/machine');
const validationMiddleware = require('./middleware/validation');
const getEmailTemplate = require('./emailTemplates');
const serverStartTime = Date.now();

const app = express();

// Basic middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for email functionality
}));

// Serve static files from frontend/public directory
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// Email configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'getnotifiedrightnow@gmail.com',
        pass: 'lkrdlkqddwgfxasr'
    },
    debug: true
});

// Store scheduled notification timers to prevent duplicates
const notificationTimers = new Map();

// Helper function to clear existing notification timers for a user
function clearExistingNotificationTimers(machineId, email) {
    const timerId = `${machineId}-${email}`;
    if (notificationTimers.has(timerId)) {
        clearTimeout(notificationTimers.get(timerId));
        notificationTimers.delete(timerId);
        console.log(`Cleared existing notification timer for ${email} on machine ${machineId}`);
    }
}

// Verify email configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('Email verification failed:', error);
    } else {
        console.log('Email server is ready');
    }
});

// Helper function to send email
async function sendEmail(to, subject, type, data) {
    try {
        console.log('Attempting to send email:', {
            to: to,
            subject: subject,
            type: type
        });

        const mailOptions = {
            from: {
                name: 'Flint Laundry',
                address: 'getnotifiedrightnow@gmail.com'
            },
            to: to,
            subject: subject,
            html: getEmailTemplate(type, data)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
    }
}

// Routes
app.post('/api/test-email', validationMiddleware.validateTestEmail, async (req, res) => {
    const { email } = req.body;
    try {
        await sendEmail(
            email,
            'Test Email from Flint Laundry',
            'test',
            {
                completionTime: new Date().toLocaleTimeString('en-US', {
                    timeZone: 'America/New_York',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }
        );
        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Failed to send test email:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});

app.get('/api/machines/:id', async (req, res) => {
    try {
        const machine = await Machine.findById(req.params.id);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        res.json(machine);
    } catch (error) {
        console.error('Error fetching machine:', error);
        res.status(500).json({ error: 'Failed to fetch machine' });
    }
});

app.get('/api/machines', async (req, res) => {
    try {
        const machines = await Machine.find();
        
        // Check and update machine status if needed
        const updatedMachines = await Promise.all(machines.map(async (machine) => {
            if (machine.inUse && machine.endTime && new Date(machine.endTime) < new Date()) {
                machine.inUse = false;
                machine.lastEndTime = machine.endTime;
                machine.currentUserEmail = null;
                machine.notifyUsers = [];
                await machine.save();
            }
            return machine;
        }));
        
        res.json(updatedMachines);
    } catch (error) {
        console.error('Error fetching machines:', error);
        res.status(500).json({ error: 'Failed to fetch machines' });
    }
});

app.post('/api/machines/:id/start', validationMiddleware.validateStartMachine, async (req, res) => {
        try {
        const { id } = req.params;
        const { duration, email } = req.body;
        
        const machine = await Machine.findById(id);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        if (machine.inUse) {
            return res.status(400).json({ error: 'Machine is already in use' });
        }
        
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + duration * 60000);
        
        machine.inUse = true;
        machine.endTime = endTime;
        machine.startTime = startTime;
        machine.currentUserEmail = email;
        machine.notifyUsers = email ? [{ email, notified: false }] : [];
        
        await machine.save();

        // Schedule notification 5 minutes before completion
        if (email && duration > 5) {
            // Clear any existing timer for this user and machine
            clearExistingNotificationTimers(id, email);
            
            // Schedule the new notification
            const notifyTimer = setTimeout(async () => {
                try {
                    // Remove this timer from the map when it executes
                    notificationTimers.delete(`${id}-${email}`);
                    
                    // Check if user is still subscribed before sending email
                    const updatedMachine = await Machine.findById(id);
                    if (updatedMachine) {
                        // Find the user in the notifyUsers array
                        const userRecord = updatedMachine.notifyUsers.find(
                            user => user.email === email.toLowerCase() && !user.notified
                        );
                        
                        if (userRecord) {
                            console.log('Sending 5-minute warning email to:', email);
                            await sendEmail(
                                email.toLowerCase(),
                                `${updatedMachine.name} Almost Done!`,
                                'almostDone',
                                {
                                    machineName: updatedMachine.name,
                                    completionTime: new Date(endTime).toLocaleTimeString('en-US', {
                                        timeZone: 'America/New_York',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                }
                            );
                            
                            console.log('5-minute warning email sent successfully');
                            
                            // Mark user as notified
                            const userIndex = updatedMachine.notifyUsers.findIndex(
                                user => user.email === email.toLowerCase()
                            );
                            
                            if (userIndex !== -1) {
                                updatedMachine.notifyUsers[userIndex].notified = true;
                                await updatedMachine.save();
                            }
                        } else {
                            console.log(`Not sending email to ${email} - user unsubscribed or already notified`);
                        }
                    }
                } catch (error) {
                    console.error('Error sending 5-minute warning:', error);
                }
            }, (duration - 5) * 60000);
            
            // Store the timer reference
            notificationTimers.set(`${id}-${email}`, notifyTimer);
            
            console.log('Timer set for 5-minute warning in:', (duration - 5), 'minutes');
        }

        res.json(machine);
    } catch (error) {
        console.error('Error starting machine:', error);
        res.status(500).json({ error: 'Failed to start machine' });
    }
});

app.post('/api/machines/:id/subscribe', validationMiddleware.validateSubscribe, async (req, res) => {
        try {
        const { id } = req.params;
        const { email } = req.body;

        const machine = await Machine.findById(id);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        if (!machine.inUse) {
            return res.status(400).json({ error: 'Machine is not in use' });
        }

        // Add new subscriber if not already subscribed
        if (!machine.notifyUsers.some(user => user.email === email)) {
            machine.notifyUsers.push({ email, notified: false });
            await machine.save();

            // Calculate time until 5 minutes before completion
            const now = new Date();
            const endTime = new Date(machine.endTime);
            const notifyTime = new Date(endTime.getTime() - 5 * 60000);
            
            if (notifyTime > now) {
                // Clear any existing timer for this user and machine
                clearExistingNotificationTimers(id, email);
                
                // Schedule the new notification
                const notifyTimer = setTimeout(async () => {
                    try {
                        // Remove this timer from the map when it executes
                        notificationTimers.delete(`${id}-${email}`);
                        
                        // Check if user is still subscribed before sending email
                        const updatedMachine = await Machine.findById(id);
                        if (updatedMachine) {
                            // Find the user in the notifyUsers array
                            const userRecord = updatedMachine.notifyUsers.find(
                                user => user.email === email.toLowerCase() && !user.notified
                            );
                            
                            if (userRecord) {
                                await sendEmail(
                                    email.toLowerCase(),
                                    `${updatedMachine.name} Almost Available!`,
                                    'almostAvailable',
                                    {
                                        machineName: updatedMachine.name,
                                        completionTime: endTime.toLocaleTimeString('en-US', {
                                            timeZone: 'America/New_York',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                    }
                                );
                                
                                console.log(`Email sent to ${email} for machine ${updatedMachine.name}`);
                                
                                // Mark user as notified
                                const userIndex = updatedMachine.notifyUsers.findIndex(
                                    user => user.email === email.toLowerCase()
                                );
                                
                                if (userIndex !== -1) {
                                    updatedMachine.notifyUsers[userIndex].notified = true;
                                    await updatedMachine.save();
                                }
                            } else {
                                console.log(`Not sending email to ${email} - user unsubscribed or already notified`);
                            }
                        }
                    } catch (error) {
                        console.error('Error sending notification:', error);
                    }
                }, notifyTime - now);
                
                // Store the timer reference
                notificationTimers.set(`${id}-${email}`, notifyTimer);
                
                console.log(`Notification scheduled for ${email} at ${notifyTime.toLocaleString()}`);
            }
        }

        res.json({ message: 'Successfully subscribed to notifications' });
    } catch (error) {
        console.error('Error subscribing:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Updated with proper validation
app.post('/api/machines/:id/unsubscribe', validationMiddleware.validateUnsubscribe, async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body; // Already standardized to lowercase by validation middleware
        
        // Clear any scheduled notification timers
        clearExistingNotificationTimers(id, email);
        
        const machine = await Machine.findById(id);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        // Remove user from notification list if they exist
        if (machine.notifyUsers && machine.notifyUsers.length > 0) {
            const initialCount = machine.notifyUsers.length;
            machine.notifyUsers = machine.notifyUsers.filter(user => user.email !== email);
            
            if (initialCount !== machine.notifyUsers.length) {
                await machine.save();
                console.log(`User ${email} unsubscribed from notifications for machine ${id}`);
            } else {
                console.log(`User ${email} was not subscribed to machine ${id}`);
            }
        }
        
        res.json({ message: 'Successfully unsubscribed from notifications' });
    } catch (error) {
        console.error('Error unsubscribing:', error);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});
// Catch-all route to return the main index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

// MongoDB connection - Use environment variable or fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/laundry';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
    initializeMachines();
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Initialize default machines if they don't exist
async function initializeMachines() {
    try {
        const count = await Machine.countDocuments();
        if (count === 0) {
            const defaultMachines = [
                { name: 'Washer 1', defaultTime: 30 },
                { name: 'Washer 2', defaultTime: 30 },
                { name: 'Dryer 1', defaultTime: 60 },
                { name: 'Dryer 2', defaultTime: 60 }
            ];

            await Machine.insertMany(defaultMachines);
            console.log('Default machines initialized');
        }
    } catch (error) {
        console.error('Error initializing machines:', error);
    }
}


const https = require('https');

// Keep the app awake by pinging itself every 14 minutes
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const APP_URL = 'https://modernlaundry.onrender.com';

setInterval(() => {
  https.get(APP_URL, (res) => {
    console.log(`Ping successful. Status code: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Ping failed:', err.message);
  });
}, PING_INTERVAL);

let lastPingTime = Date.now();
let pingCount = 0;

setInterval(() => {
  https.get(APP_URL, (res) => {
    pingCount++;
    lastPingTime = Date.now();
    console.log(`Ping #${pingCount} successful. Status code: ${res.statusCode}. App has been awake for ${Math.floor((Date.now() - serverStartTime) / (60 * 1000))} minutes.`);
  }).on('error', (err) => {
    console.error('Ping failed:', err.message);
  });
}, PING_INTERVAL);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;