require('dotenv').config(); // Load environment variables from .env file
const { MessagingResponse } = require('twilio').twiml;
const axios = require('axios');

// In-memory storage for user sessions (for simplicity)
const userSessions = {};

// OpenAI API configuration
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Ensure this is set in your .env file

// Webhook endpoint
module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const messagingResponse = new MessagingResponse();
    const message = messagingResponse.message();

    let receivedMessage = req.body.Body.toLowerCase().trim();
    const fromNumber = req.body.From;

    // Initialize user session if it doesn't exist
    if (!userSessions[fromNumber]) {
        userSessions[fromNumber] = { state: 'menu', subState: null };
    }

    let responseText;

    switch (userSessions[fromNumber].state) {
        case 'menu':
            if (receivedMessage === 'menu' || receivedMessage === '1') {
                responseText = 'Welcome to Real Estate Bot! Please choose an option by typing the corresponding number:\n' +
                               '   Help\n' +
                               '1. Buy Property\n' +
                               '2. Rent Property\n' +
                               '3. Mortgage/Loan Information\n' +
                               '4. Real Estate Information\n' +
                               '5. Exit\n' +
                               '6. Type "clear chat" to delete our session data';
            } else if (['1', '2'].includes(receivedMessage)) {
                userSessions[fromNumber].state = receivedMessage;
                userSessions[fromNumber].subState = 'action';
                responseText = 'Would you like to:\n1. Download the property listings brochure\n2. Get in touch with a real estate agent';
            } else if (receivedMessage === 'hello' || receivedMessage === 'hi') {
                responseText = 'Hello! How can I assist you today? Type "Menu" for options.';
            } else if (receivedMessage === 'clear chat') {
                delete userSessions[fromNumber]; // Clear the session
                responseText = 'Your chat has been cleared. Type "Menu" to start again.';
            } else {
                responseText = 'Good day!. Please type "Menu" or "1" for guidance.';
            }
            break;

        case '1':
        case '2':
            if (userSessions[fromNumber].subState === 'action') {
                if (receivedMessage === '1') {
                    const publicMediaUrl = 'https://wabot-ruby.vercel.app/public/index.html'; // Update with your actual URL
                    message.media(publicMediaUrl);
                    responseText = 'Here is the property listings brochure link.';
                } else if (receivedMessage === '2') {
                    responseText = 'Please wait while we connect you with a real estate agent. They will contact you shortly.';
                } else {
                    responseText = 'Invalid selection. Please type "1" for brochure or "2" for agent contact.';
                }
                userSessions[fromNumber].state = 'menu';
                userSessions[fromNumber].subState = null;
            }
            break;

        case '3': // Mortgage/Loan Information
            responseText = await getOpenAIResponse("Explain mortgage loans and how they work.");
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
            break;

        case '4': // Real Estate Information
            responseText = await getOpenAIResponse("What is real estate and how does it work?");
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
            break;

        case '5': // Exit
            responseText = await getOpenAIResponse("Generate a friendly goodbye message for a real estate bot.");
            delete userSessions[fromNumber]; // Remove session data
            break;

        default:
            responseText = 'Good day!. Please type "Menu" or "1" for guidance.';
            break;
    }

    // Reset on goodbye
    if (receivedMessage === 'bye' || receivedMessage === 'goodbye') {
        responseText = await getOpenAIResponse("Generate a friendly goodbye message for a real estate bot.");
        delete userSessions[fromNumber]; // Remove session data
    }

    message.body(responseText);

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(messagingResponse.toString());
};

// Function to get responses from OpenAI API
async function getOpenAIResponse(prompt) {
    try {
        const response = await axios.post(OPENAI_API_ENDPOINT, {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150 // Adjust as necessary for your use case
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error fetching data from OpenAI:', error);
        return "Sorry, I couldn't retrieve the information at this time. Please try again later.";
    }
}