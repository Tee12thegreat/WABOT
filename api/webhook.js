// Import required modules
const { MessagingResponse } = require('twilio').twiml;

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
    const fromNumber = req.body.From; // Get the sender's phone number

    // Initialize user session if it doesn't exist
    if (!userSessions[fromNumber]) {
        userSessions[fromNumber] = { state: 'menu' };
    }

    let responseText;

    // State-based response handling
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
                responseText = 'This is the Real Estate Bot designed to assist you with your property needs. You can buy, rent, or inquire about mortgages. Just select an option from the menu to get started!';
            } else if (['2', '3', '4', '5', '6', '7', '8'].includes(receivedMessage)) {
                userSessions[fromNumber].state = receivedMessage; // Update state
                responseText = handleOptionSelection(receivedMessage);
            } else if (receivedMessage === 'hello' || receivedMessage === 'hi') {
                responseText = 'Hello! Welcome to Real Estate Bot. How can I assist you today? Type "Menu" or "1" for a list of commands.';
            } else {
                responseText = 'Welcome! Please type "Menu" or "1" for guidance on how to interact with me.';
            }
            break;

        case '2':
            responseText = 'We have several properties available for purchase. Which location do you want?';
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
            break;

        case '3':
            responseText = 'Looking for a rental? We can help with that! Please specify your location and preferences.';
            userSessions[fromNumber].state = 'menu'; // Reset state back to menu after this query
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
            responseText = 'Welcome! Please type "Menu" or "1" for guidance on how to interact with me.';
            break;
    }

    // Reset on goodbye
    if (receivedMessage === 'bye' || receivedMessage === 'goodbye' || userSessions[fromNumber].state === '8') {
        userSessions[fromNumber].state = 'menu'; // Reset state for a fresh start
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
            return 'Let me tell you a joke!';
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
