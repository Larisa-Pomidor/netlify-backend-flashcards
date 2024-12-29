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
                    result = await client.query('SELECT COUNT(*) FROM cards WHERE cards.score < 0');
                } else {
                    result = await client.query('SELECT COUNT(*) FROM cards');
                }
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ count: result.rows[0].count })
                };
            }

            else if (queryParams.option === "selected") {
                const res = await client.query('SELECT * FROM cards WHERE cards.score < 0');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(res.rows)
                };
            } else {
                const res = await client.query('SELECT * FROM cards');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(res.rows),
                };
            }
        }
        else if (event.httpMethod === 'PATCH') {
            const { front, back, image, score, example, pronunciation, id } = JSON.parse(event.body);

            let query;
            let values;

            if (!front && !back) {
                query = 'UPDATE cards SET score = $2 WHERE id = $1 RETURNING *';
                values = [id, score];
            } else {
                query = 'UPDATE cards SET front = $1, back = $2, image_url = $3, score = $4, example = $5, pronunciation = $6 WHERE id = $7 RETURNING *';
                values = [front, back, image, score, example, pronunciation, id];
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
            const { front, back, image, score = 0, example, pronunciation } = JSON.parse(event.body);

            const query = `
                INSERT INTO cards (front, back, image_url, score, example, pronunciation)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`;

            const values = [front, back, image, score, example, pronunciation];
            const res = await client.query(query, values);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(res.rows[0]),
            };
        }

        else if (event.httpMethod === 'DELETE') {
            const id = event.path.split('/').pop(); 

            const res = await client.query('DELETE FROM cards WHERE id = $1 RETURNING *', [id]);

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