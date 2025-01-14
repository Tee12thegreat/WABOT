const { MessagingResponse } = require('twilio').twiml;
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

// Setup database
db.serialize(() => {
    db.run("CREATE TABLE user_sessions (phone TEXT PRIMARY KEY, state TEXT, preferences TEXT)");
    db.run("CREATE TABLE properties (id INTEGER PRIMARY KEY, location TEXT, price INTEGER, type TEXT)");
});

// Sample data for testing
db.run("INSERT INTO properties (location, price, type) VALUES ('New York', 500000, 'Apartment')");
db.run("INSERT INTO properties (location, price, type) VALUES ('Los Angeles', 700000, 'House')");
db.run("INSERT INTO properties (location, price, type) VALUES ('San Francisco', 1000000, 'Condo')");

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const messagingResponse = new MessagingResponse();
    const message = messagingResponse.message();

    const fromNumber = req.body.From;
    const receivedMessage = req.body.Body.toLowerCase().trim();

    // Fetch or initialize user session
    let session;
    db.get("SELECT state, preferences FROM user_sessions WHERE phone = ?", [fromNumber], (err, row) => {
        if (err) {
            console.error(err);
            return;
        }
        session = row || { state: 'menu', preferences: '{}' };
        handleMessage(session, receivedMessage, message);
    });

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(messagingResponse.toString());
};

function handleMessage(session, receivedMessage, message) {
    let responseText;
    let newState = session.state;
    const preferences = JSON.parse(session.preferences);

    switch (session.state) {
        case 'menu':
            responseText = handleMenu(receivedMessage, session);
            newState = receivedMessage === '2' || receivedMessage === '3' ? 'location' : 'menu';
            break;
        
        case 'location':
            preferences.location = receivedMessage;
            responseText = 'Great! Now, what is your budget?';
            newState = 'budget';
            break;

        case 'budget':
            preferences.budget = receivedMessage;
            responseText = 'Thank you! Here are some properties that might interest you:';
            newState = 'menu';
            listProperties(message, preferences);
            break;

        default:
            responseText = 'I did not understand that. Type "menu" for options.';
            newState = 'menu';
    }

    message.body(responseText);
    db.run("INSERT OR REPLACE INTO user_sessions (phone, state, preferences) VALUES (?, ?, ?)", [req.body.From, newState, JSON.stringify(preferences)]);
}

function handleMenu(receivedMessage, session) {
    switch (receivedMessage) {
        case '1':
            return 'Here are your options:\n1. Help\n2. Buy Property\n3. Rent Property\n4. Mortgage/Loan Information\n5. Exit';
        case '2':
        case '3':
            return 'Which location are you interested in?';
        case '4':
            return 'Our mortgage advisors are available. Please call 1-800-REAL-ESTATE.';
        case '5':
            return 'Goodbye!';
        default:
            return 'Please choose an option by number: 1 for help, 2 for buying, 3 for renting, 4 for mortgage info, 5 to exit.';
    }
}

function listProperties(message, preferences) {
    db.all("SELECT * FROM properties WHERE location LIKE ? AND price <= ?", 
           [`%${preferences.location}%`, parseInt(preferences.budget) || 1000000], 
           (err, rows) => {
        if (err) {
            console.error(err);
            message.body('An error occurred while fetching properties.');
        } else if (rows.length === 0) {
            message.body('No properties found matching your criteria.');
        } else {
            rows.forEach(prop => {
                message.body(`\n${prop.type} in ${prop.location} for $${prop.price}`);
            });
        }
    });
}
