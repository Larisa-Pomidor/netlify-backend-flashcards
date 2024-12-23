const { Client } = require('pg');

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: {
        rejectUnauthorized: false, // This is important if you have self-signed certificates
    },
});

exports.handler = async (event, context) => {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        ssl: {
            rejectUnauthorized: false, // This is important if you have self-signed certificates
        },
    });
    
    const headers = {
        'Access-Control-Allow-Origin': '*', // Allow access from any origin
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    try {
        await client.connect(); // Connect to the database
        console.log("Connected to the database"); // Log connection success

        const res = await client.query('SELECT * FROM cards WHERE cards.score < 0'); // Query the cards table
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(res.rows), // Return the rows as JSON
        };
    } catch (error) {
        console.error("Error fetching data:", error); // Log errors
        return {
            statusCode: 500,
            headers,
            body: `Error fetching data: ${error.message}`, // Return error message
        };
    } finally {
        await client.end(); // Close the database connection
        console.log("Disconnected from the database"); // Log disconnection
    }
};