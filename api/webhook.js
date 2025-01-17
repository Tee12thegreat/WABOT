const Vonage = require('@vonage/server-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Ensure this path is correct

// In-memory storage for user sessions - consider using a database for production
const userSessions = {};

// Initialize the Vonage SDK
const vonage = new Vonage({
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET,
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

    let responseText = handleState(userSessions[fromNumber], receivedMessage);

    // Reset on goodbye
    if (receivedMessage === 'bye' || receivedMessage === 'goodbye') {
        responseText = 'Goodbye! Feel free to reach out anytime for real estate assistance.';
        delete userSessions[fromNumber]; // Remove session data
    }

    // Send response via Vonage
    const from = "VonageAPI";
    const to = fromNumber;
    const text = responseText;

    vonage.message.sendSms(from, to, text, {}, (err, responseData) => {
        if (err) {
            console.error('Error sending message:', err);
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

// Function to handle different states of the conversation
function handleState(session, message) {
    switch (session.state) {
        case 'menu':
            return handleMenuState(message);
        case '2':
        case '3':
            return handleBuyOrRentState(session, message);
        case '4':
            return 'Need help with mortgage options? We can connect you with our financial advisors. What is your budget?';
        case '5':
            return getRandomJoke();
        case '6':
            return 'Goodbye! Feel free to reach out anytime for real estate assistance.';
        default:
            return 'Please type "Menu" or "1" for guidance.';
    }
}

// Function to handle menu state
function handleMenuState(message) {
    if (message === 'menu' || message === '1') {
        return 'Welcome to Real Estate Bot! Please choose an option by typing the corresponding number:\n' +
               '1. Help\n2. Buy Property\n3. Rent Property\n4. Mortgage/Loan Information\n5. Tell a Joke\n6. Exit';
    } else if (message === '1') {
        return 'This bot helps with real estate inquiries. Select an option to proceed.';
    } else if (['2', '3', '4', '5', '6'].includes(message)) {
        userSessions[req.body.msisdn].state = message;
        return handleOptionSelection(message);
    } else if (message === 'hello' || message === 'hi') {
        return 'Hello! How can I assist you today? Type "Menu" for options.';
    }
    return 'Invalid input. Type "Menu" or "1" for guidance.';
}

// Function to handle buy or rent property states
function handleBuyOrRentState(session, message) {
    if (session.subState === 'action') {
        if (message === '1') {
            const publicMediaUrl = 'https://wabot-ruby.vercel.app/public/index.html'; // Update with your actual URL
            session.state = 'menu';
            session.subState = null;
            return 'Here is the link to the property listings brochure: ' + publicMediaUrl;
        } else if (message === '2') {
            session.state = 'menu';
            session.subState = null;
            return 'Please wait while we connect you with a real estate agent. They will contact you shortly.';
        } else {
            return 'Invalid selection. Please type "1" for brochure or "2" for agent contact.';
        }
    }
    return 'Please select an action by typing "1" for brochure or "2" for agent contact.';
}

// Function to handle option selection responses
function handleOptionSelection(option) {
    switch (option) {
        case '2':
        case '3':
            userSessions[req.body.msisdn].subState = 'action';
            return 'Would you like to:\n1. Download the property listings brochure\n2. Get in touch with a real estate agent';
        case '4':
            return 'Need help with mortgage options? We can connect you with our financial advisors. What is your budget?';
        case '5':
            return 'Let me tell you a funny joke!';
        case '6':
            return 'Goodbye! Feel free to reach out anytime for real estate assistance.';
        default:
            return 'Invalid option. Please type "Menu" or "1" for guidance.';
    }
}

// Function to get a random real estate-related joke
function getRandomJoke() {
    const realEstateJokes = [
        'Why do real estate agents always carry a compass? Because they need to find the right direction for your dream home!',
        'What do you call a real estate agent who can play the piano? A property note-ary!',
        'Why was the real estate agent good at poker? Because they knew when to hold ‘em and when to fold ‘em in negotiations!'
    ];
    const randomIndex = Math.floor(Math.random() * realEstateJokes.length);
    return realEstateJokes[randomIndex];
}