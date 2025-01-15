const { MessagingResponse } = require('twilio').twiml;

// In-memory storage for user sessions (for simplicity)
const userSessions = {};

// URL for the PDF brochure
const BROCHURE_URL = 'https://example.com/property-listings.pdf'; // Replace with actual URL

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
                               '5. Property Prices\n' +
                               '6. Available Locations\n' +
                               '7. Tell a Joke\n' +
                               '8. Exit';
            } else if (receivedMessage === '1') {
                responseText = 'This bot helps with real estate inquiries. Select an option to proceed.';
            } else if (['2', '3'].includes(receivedMessage)) {
                userSessions[fromNumber].state = receivedMessage;
                userSessions[fromNumber].subState = 'action';
                responseText = 'Would you like to:\n1. Download the property listings brochure\n2. Get in touch with a real estate agent';
            } else if (['4', '5', '6', '7', '8'].includes(receivedMessage)) {
                userSessions[fromNumber].state = receivedMessage;
                responseText = handleOptionSelection(receivedMessage);
            } else if (receivedMessage === 'hello' || receivedMessage === 'hi') {
                responseText = 'Hello! How can I assist you today? Type "Menu" for options.';
            } else {
                responseText = 'Please type "Menu" or "1" for guidance.';
            }
            break;

        case '2':
        case '3':
            if (userSessions[fromNumber].subState === 'action') {
                if (receivedMessage === '1') {
                    responseText = 'Here is the link to the property listings brochure: ' + BROCHURE_URL;
                    userSessions[fromNumber].state = 'menu';
                    userSessions[fromNumber].subState = null;
                } else if (receivedMessage === '2') {
                    responseText = 'Please wait while we connect you with a real estate agent. They will contact you shortly.';
                    userSessions[fromNumber].state = 'menu';
                    userSessions[fromNumber].subState = null;
                    // Here you would typically trigger an event to notify an agent or use a CRM system
                } else {
                    responseText = 'Invalid selection. Please type "1" for brochure or "2" for agent contact.';
                }
            }
            break;

        case '4':
            responseText = 'Need help with mortgage options? We can connect you with our financial advisors. What is your budget?';
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
            break;

        case '5':
            responseText = 'Prices vary by location, size, and amenities. Can you provide more details?';
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
            break;

        case '6':
            responseText = 'We operate in multiple areas. Can you specify which location you are interested in?';
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
            break;

        case '7':
            const joke = await getRandomJoke();
            responseText = joke;
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
            break;

        case '8':
            responseText = 'Goodbye! Feel free to reach out anytime for real estate assistance.';
            delete userSessions[fromNumber]; // Remove session data
            break;

        default:
            responseText = 'Please type "Menu" or "1" for guidance.';
            break;
    }

    // Reset on goodbye
    if (receivedMessage === 'bye' || receivedMessage === 'goodbye' || userSessions[fromNumber].state === '8') {
        userSessions[fromNumber].state = 'menu';
        userSessions[fromNumber].subState = null;
    }

    message.body(responseText);

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(messagingResponse.toString());
};

// Function to handle option selection responses
function handleOptionSelection(option) {
    switch (option) {
        case '2':
            return 'We have several properties available for purchase. Which location do you want?';
        case '3':
            return 'Looking for a rental? We can help with that! Please specify your location and preferences.';
        case '4':
            return 'Need help with mortgage options? We can connect you with our financial advisors. What is your budget?';
        case '5':
            return 'Prices vary by location, size, and amenities. Can you provide more details?';
        case '6':
            return 'We operate in multiple areas. Can you specify which location you are interested in?';
        case '7':
            return 'Let me tell you a funny joke!';
        case '8':
            return 'Goodbye! Feel free to reach out anytime for real estate assistance.';
        default:
            return 'Invalid option. Please type "Menu" or "1" for guidance.';
    }
}

// Function to get a random real estate-related joke
async function getRandomJoke() {
    const realEstateJokes = [
        'Why do real estate agents always carry a compass? Because they need to find the right direction for your dream home!',
        'What do you call a real estate agent who can play the piano? A property note-ary!',
        'Why was the real estate agent good at poker? Because they knew when to hold ‘em and when to fold ‘em in negotiations!'
    ];
    const randomIndex = Math.floor(Math.random() * realEstateJokes.length);
    return realEstateJokes[randomIndex];
}
