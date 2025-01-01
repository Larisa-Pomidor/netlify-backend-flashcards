const { Client } = require('pg');

exports.handler = async (event, context) => {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS, DELETE',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    try {
        await client.connect();
        console.log("Connected to the database");
        if (event.httpMethod === 'GET') {
            const queryParams = event.queryStringParameters || {};

            if (queryParams.quantity) {
                let result;
                if (queryParams.option === "selected") {
                    result = await client.query('SELECT COUNT(*) FROM pronunciation WHERE pronunciation.score < 0');
                } else {
                    result = await client.query('SELECT COUNT(*) FROM pronunciation');
                }
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ count: result.rows[0].count })
                };
            }

            else if (queryParams.option === "selected") {
                const res = await client.query('SELECT * FROM pronunciation WHERE pronunciation.score < 0');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(res.rows)
                };
            } else {
                const res = await client.query('SELECT * FROM pronunciation');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(res.rows),
                };
            }
        }
        else if (event.httpMethod === 'PATCH') {
            const { word, transcription, score, id } = JSON.parse(event.body);

            let query;
            let values;

            if (!word && !transcription) {
                query = 'UPDATE pronunciation SET score = $2 WHERE id = $1 RETURNING *';
                values = [id, score];
            } else {
                query = 'UPDATE pronunciation SET word = $1, transcription = $2, score = $3 WHERE id = $4 RETURNING *';
                values = [word, transcription, score, id];
            }

            const res = await client.query(query, values);

            if (res.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ message: 'No matching record found to update' })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(res.rows[0]),
            };
        }
        else if (event.httpMethod === 'POST') {
            const { word, transcription, score = 0 } = JSON.parse(event.body);

            const query = `
                INSERT INTO pronunciation (word, transcription, score)
                VALUES ($1, $2, $3)
                RETURNING *`;

            const values = [word, transcription, score];
            const res = await client.query(query, values);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(res.rows[0]),
            };
        }

        else if (event.httpMethod === 'DELETE') {
            const id = event.path.split('/').pop(); 

            const res = await client.query('DELETE FROM pronunciation WHERE id = $1 RETURNING *', [id]);

            if (res.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ message: 'Item not found' }),
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Item deleted successfully', item: res.rows[0] }),
            };
        }

    } catch (error) {
        console.error("Error fetching data:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: `Error fetching data: ${error.message}` })
        };
    } finally {
        await client.end();
        console.log("Disconnected from the database");
    }
};