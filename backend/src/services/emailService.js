const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: config.EMAIL_SERVICE,
            auth: {
                user: config.EMAIL_USER,
                pass: config.EMAIL_PASS
            }
        });
    }

    async sendSubscriptionConfirmation(email) {
        const mailOptions = {
            from: config.EMAIL_USER,
            to: email,
            subject: 'Welcome to Flint Laundry Notifications',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to Flint Laundry Notifications!</h2>
                    <p>You have successfully subscribed to receive notifications when laundry machines become available.</p>
                    <p>You'll receive an email whenever:</p>
                    <ul>
                        <li>A machine you're waiting for becomes available</li>
                        <li>A machine cycle completes</li>
                    </ul>
                    <p style="color: #666; font-size: 0.9em;">If you didn't request this subscription, please ignore this email.</p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Error sending confirmation email:', error);
            return false;
        }
    }

    async sendMachineAvailableNotification(email, machineName) {
        const mailOptions = {
            from: config.EMAIL_USER,
            to: email,
            subject: `${machineName} is now available!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Machine Available!</h2>
                    <p>Good news! The ${machineName} has completed its cycle and is now available for use.</p>
                    <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                        🔔 Machine: ${machineName}<br>
                        ✅ Status: Available<br>
                        ⏰ As of: ${new Date().toLocaleTimeString()}
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Error sending availability notification:', error);
            return false;
        }
    }
}

module.exports = new EmailService();