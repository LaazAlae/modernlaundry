const getEmailTemplate = (type, { machineName, completionTime }) => {
    const baseStyle = `
        body { 
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
        }
        .header {
            background-color: #0052CC;
            color: white;
            text-align: center;
            padding: 30px;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
            text-align: center;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            padding: 0;
        }
        .message {
            font-size: 16px;
            color: #333333;
            margin: 20px 0;
            line-height: 1.6;
        }
        .time {
            background-color: #E3F2FD;
            padding: 15px;
            border-radius: 6px;
            display: inline-block;
            margin: 15px 0;
            font-weight: bold;
            color: #0052CC;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666666;
            font-size: 14px;
        }
    `;

    const templates = {
        almostDone: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Laundry is Almost Done!</title>
                <style>${baseStyle}</style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="title">Your Laundry is Almost Done!</h1>
                    </div>
                    <div class="content">
                        <p class="message">
                            Your laundry in <span class="highlight">${machineName}</span> will complete 
                            its cycle in about 5 minutes.
                        </p>
                        <div class="time-container">
                            <div class="time">
                                Expected Completion Time<br>
                                ${completionTime}
                            </div>
                        </div>
                        <p class="message">
                            Please make sure to collect your items promptly 
                            to allow others to use the machine.
                        </p>
                    </div>
                    <div class="footer">
                        This is an automated notification from 
                        <span class="highlight">Flint Laundry Service</span>
                    </div>
                </div>
            </body>
            </html>
        `,
        
        almostAvailable: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Machine Available Soon!</title>
                <style>${baseStyle}</style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="title">Machine Available Soon!</h1>
                    </div>
                    <div class="content">
                        <p class="message">
                            Good news! The <span class="highlight">${machineName}</span> you're waiting 
                            for will be available in about 5 minutes.
                        </p>
                        <div class="time-container">
                            <div class="time">
                                Expected Availability<br>
                                ${completionTime}
                            </div>
                        </div>
                        <p class="message">
                            The current user has been notified that their laundry is almost done. 
                            Get ready to start your cycle!
                        </p>
                    </div>
                    <div class="footer">
                        This is an automated notification from 
                        <span class="highlight">Flint Laundry Service</span>
                    </div>
                </div>
            </body>
            </html>
        `,

        test: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Test Email Confirmation</title>
                <style>${baseStyle}</style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="title">Test Email Confirmation</h1>
                    </div>
                    <div class="content">
                        <p class="message">
                            Your email notifications are working correctly!
                        </p>
                        <div class="time-container">
                            <div class="time">
                                Email Sent<br>
                                ${new Date().toLocaleTimeString('en-US', { 
                                    timeZone: 'America/New_York',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                        <p class="message">
                            You will receive notifications:<br>
                            • 5 minutes before your laundry is complete<br>
                            • When a machine you're waiting for becomes available
                        </p>
                    </div>
                    <div class="footer">
                        This is an automated notification from 
                        <span class="highlight">Flint Laundry Service</span>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    return templates[type];
};

module.exports = getEmailTemplate;