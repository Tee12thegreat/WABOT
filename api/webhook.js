const Vonage = require('@vonage/server-sdk');
const fs = require('fs');
const path = require('path');

// In-memory storage for user sessions (for simplicity)
const userSessions = {};

// Initialize the Vonage SDK
const vonage = new Vonage({
    apiKey: "903a5e63",
    apiSecret: "s4Xin3QNUUTHTcpo",
});

// Webhook endpoint
module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    let receivedMessage = req.body.text.toLowerCase().trim();
    const fromNumber = req.body.msisdn; // Vonage uses 'msisdn' for phone number

    // Initialize user session if it doesn't exist
    if (!userSessions[fromNumber]) {
        userSessions[fromNumber] = { state: 'menu', subState: null };
    }

    let responseText;

    switch (userSessions[fromNumber].state) {
        // ... [Your existing state machine logic]

        case '2':
        case '3':
            if (userSessions[fromNumber].subState === 'action') {
                if (receivedMessage === '1') {
                    const publicMediaUrl = 'https://wabot-ruby.vercel.app/public/index.html'; // Update with your actual URL
                    // Here, you would typically send a URL for the user to download the file directly,
                    // as Vonage might not support sending files directly in the same way as WhatsApp
                    responseText = 'Here is the link to the property listings brochure: ' + publicMediaUrl;
                    userSessions[fromNumber].state = 'menu';
                    userSessions[fromNumber].subState = null;
                } else if (receivedMessage === '2') {
                    responseText = 'Please wait while we connect you with a real estate agent. They will contact you shortly.';
                    userSessions[fromNumber].state = 'menu';
                    userSessions[fromNumber].subState = null;
                } else {
                    responseText = 'Invalid selection. Please type "1" for brochure or "2" for agent contact.';
                }
            }
            break;

        // ... [Other cases]

        default:
            responseText = 'Please type "Menu" or "1" for guidance.';
            break;
    }

    // Reset on goodbye
    if (receivedMessage === 'bye' || receivedMessage === 'goodbye') {
        userSessions[fromNumber].state = 'menu';
        userSessions[fromNumber].subState = null;
    }

    // Send response via Vonage
    const from = "VonageAPI";
    const to = fromNumber;
    const text = responseText;

    vonage.message.sendSms(from, to, text, {}, (err, responseData) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error sending message');
        } else {
            if (responseData.messages[0]['status'] === "0") {
                console.log("Message sent successfully.");
                res.status(200).send('Message sent successfully');
            } else {
                console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
                res.status(500).send('Failed to send message');
            }
        }
    });
};