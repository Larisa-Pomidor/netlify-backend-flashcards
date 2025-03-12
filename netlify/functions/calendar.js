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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET',
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

            const res = await client.query
                (`
                SELECT day.id, day.date, day.note, type.name as type, 
                    COALESCE(json_agg(
                        DISTINCT jsonb_build_object('id', symptom.id, 'name', symptom.name)
                    ) FILTER (WHERE symptoms.id IS NOT NULL), '[]') AS symptom
                    
                    COALESCE(json_agg(
                        DISTINCT jsonb_build_object('id', product.id, 'name', product.name, 'imageUrl', 'product_url')
                    ) FILTER (WHERE products.id IS NOT NULL), '[]') AS product

                        FROM days
                        INNER JOIN types as type ON days.type_id = type.id

                        INNER JOIN day_symptoms ON days.id = day_symptoms.day_id
                        INNER JOIN symptoms ON symptoms.id = day_symptoms.symptom_id

                        INNER JOIN day_products ON days.id = day_products.day_id
                        INNER JOIN products ON products.id = day_products.product_id
                        GROUP BY days.id, type.id;
                `);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(res.rows),
            };
        }
        else if (event.httpMethod === 'PUT') {
            const id = event.path.split('/').pop();

            const { description, productId, symptomId } = JSON.parse(event.body);

            let query = '';
            let values = []

            if (description) {
                query = `UPDATE days SET note = $1 WHERE id = $2 RETURNING *`;

                values = [description, id];

            } else if (productId) {
                query = `
                    INSERT INTO day_products (day_id, product_id)
                    VALUES ($1, $2)
                    RETURNING *
                `;

                values = [id, productId];
            }
            else if (symptomId) {
                query = `
                    INSERT INTO day_symptoms (day_id, symptom_id)
                    VALUES ($1, $2)
                    RETURNING *
                `;

                values = [id, symptomId];
            }


            const res = await client.query(query, values);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(res.rows[0]),
            };
        }
        else if (event.httpMethod === 'DELETE') {
            const segments = path.split('/').filter(Boolean);
            const option = segments[segments.length - 2];

            const id = event.path.split('/').pop();

            let res;

            if (option === 'symptom')
                res = await client.query('DELETE FROM day_symptoms WHERE id = $1 RETURNING *', [id]);
            else if (option === 'product')
                res = await client.query('DELETE FROM day_products WHERE id = $1 RETURNING *', [id]);

            if (res?.rows?.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ message: `${option} with id ${id} not found` }),
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