const { Client } = require('pg');

exports.handler = async (event, context) => {
  const client = new Client({
    user: process.env.DB_USER,      
    host: process.env.DB_HOST,      
    database: process.env.DB_NAME,   
    password: process.env.DB_PASSWORD,
    port: 5432,                      
  });

  try {
    await client.connect(); 
    console.log("Connected to the database");

    const res = await client.query('SELECT * FROM cards'); 
    return {
      statusCode: 200,
      body: JSON.stringify(res.rows),
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      statusCode: 500,
      body: `Error fetching data: ${error.message}`,
    };
  } finally {
    await client.end(); 
    console.log("Disconnected from the database");
  }
};