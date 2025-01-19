require('dotenv').config(); // Load environment variables from .env file
const { MessagingResponse } = require('twilio').twiml;
const axios = require('axios');

// In-memory storage for user sessions (for simplicity)
const userSessions = {};

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
                               '1. Help\n' +
                               '2. Buy Property\n' +
                               '3. Rent Property\n' +
                               '4. Mortgage/Loan Information\n' +
                               '5. Real Estate Information\n' +
                               '6. Exit\n' +
                               '7. Type "clear chat" to delete our session data';
            } else if (['2', '3'].includes(receivedMessage)) {
                userSessions[fromNumber].state = receivedMessage;
                userSessions[fromNumber].subState = 'action';
                responseText = 'Would you like to:\n1. Download the property listings brochure\n2. Get in touch with a real estate agent';
            } else if (receivedMessage === 'hello' || receivedMessage === 'hi') {
                responseText = 'Hello! How can I assist you today? Type "Menu" for options.';
            } else if (receivedMessage === 'clear chat') { // Correctly handle Clear Chat command
                delete userSessions[fromNumber]; // Clear the session
                responseText = 'Your chat has been cleared. Type "Menu" to start again.';
            } else {
                responseText = 'Please type "Menu" or "1" for guidance.';
            }
            break;

        case '2':
        case '3':
            if (userSessions[fromNumber].subState === 'action') {
                if (receivedMessage === '1') {
                    // Use the public URL for the brochure
                    const publicMediaUrl = 'https://wabot-ruby.vercel.app/public/index.html'; // Update with your actual URL
                    message.media(publicMediaUrl);
                    responseText = 'Here is the property listings brochure link.';
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

        case '4': // Mortgage/Loan Information
            responseText = await getOpenAIResponse("Explain mortgage loans and how they work.");
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
            break;

        case '5': // Real Estate Information
            responseText = await getOpenAIResponse("What is real estate and how does it work?");
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
            break;

        case '6': // Exit
            responseText = 'Goodbye! Feel free to reach out anytime for real estate assistance.';
            delete userSessions[fromNumber]; // Remove session data
            break;

        default:
            responseText = 'Please type "Menu" or "1" for guidance.';
            break;
    }

    // Reset on goodbye
    if (receivedMessage === 'bye' || receivedMessage === 'goodbye') {
        userSessions[fromNumber].state = 'menu';
        userSessions[fromNumber].subState = null;
    }

    message.body(responseText);

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(messagingResponse.toString());
};

// Function to get responses from OpenAI API
async function getOpenAIResponse(prompt) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo", // or any other model you choose
            messages: [{ role: "user", content: prompt }],
        }, {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Accessing API key from .env file
                "Content-Type": "application/json",
            }
        });

        return response.data.choices[0].message.content; // Extract the response text
    } catch (error) {
        console.error('Error fetching data from OpenAI:', error);
        return "Sorry, I couldn't retrieve the information at this time.";
    }
}
