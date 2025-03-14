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
        'Access-Control-Allow-Methods': 'GET, DELETE, POST, PUT',
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

        let query = '';

        if (event.httpMethod === 'GET') {
            const optionalId = Number(event.path.split('/').pop());
            const isId = Number.isInteger(optionalId);

            if (isId) {
                query = `
                    SELECT
                        days.id,
                        days.date,
                        days.note,
                        type.name AS type,
                        COALESCE(json_agg(
                            DISTINCT jsonb_build_object('id', symptoms.id, 'name', symptoms.name)
                        ) FILTER (WHERE symptoms.id IS NOT NULL), '[]') AS symptoms,
                        COALESCE(json_agg(
                            DISTINCT jsonb_build_object('id', products.id, 'name', products.name, 'imageUrl', products.image_url)
                        ) FILTER (WHERE products.id IS NOT NULL), '[]') AS products
                    FROM days
                    LEFT JOIN types AS type ON days.type_id = type.id
                    LEFT JOIN day_symptoms ON days.id = day_symptoms.day_id
                    LEFT JOIN symptoms ON symptoms.id = day_symptoms.symptom_id
                    LEFT JOIN day_products ON days.id = day_products.day_id
                    LEFT JOIN products ON products.id = day_products.product_id
                    WHERE days.id = $1
                    GROUP BY days.id, type.id;
                `;
                queryParams = [optionalId];

                const res = await client.query(query, queryParams);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(res.rows[0]),
                };

            } else {
                query = `
                    SELECT 
                        days.id,
                        days.date,
                        days.note,
                        type.name AS type,
                        COALESCE(json_agg(
                            DISTINCT jsonb_build_object('id', symptoms.id, 'name', symptoms.name)
                        ) FILTER (WHERE symptoms.id IS NOT NULL), '[]') AS symptoms,
                        COALESCE(json_agg(
                            DISTINCT jsonb_build_object('id', products.id, 'name', products.name, 'imageUrl', products.image_url)
                        ) FILTER (WHERE products.id IS NOT NULL), '[]') AS products
                    FROM days
                    LEFT JOIN types AS type ON days.type_id = type.id
                    LEFT JOIN day_symptoms ON days.id = day_symptoms.day_id
                    LEFT JOIN symptoms ON symptoms.id = day_symptoms.symptom_id
                    LEFT JOIN day_products ON days.id = day_products.day_id
                    LEFT JOIN products ON products.id = day_products.product_id
                    GROUP BY days.id, type.id;
                `;

                const res = await client.query(query);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(res.rows),
                };
            }
        }
        else if (event.httpMethod === 'POST') {
            const ALLOWED_OPTIONS = ['symptom', 'product'];

            const segments = event.path.split('/').filter(Boolean);
            const optionId = segments[segments.length - 1];
            const option = segments[segments.length - 2];
            const dayId = segments[segments.length - 3];

            if (!ALLOWED_OPTIONS.includes(option)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: "Invalid option type" }),
                };
            }

            const tableName = `day_${option}s`;
            const columnName = `${option}_id`;

            const query = `
                INSERT INTO ${tableName} (day_id, ${columnName})
                VALUES ($1, $2)
                RETURNING *
            `;

            const values = [dayId, optionId];
            const res = await client.query(query, values);

            const tableNameSingular = `${option}s`;

            let optionQuery;

            if (option === 'product') {
                optionQuery = `
                SELECT id, name, image_url as "imgUrl" FROM ${tableNameSingular} WHERE ${tableNameSingular}.id = $1;
            `;
            } else {
                optionQuery = `
                SELECT * FROM ${tableNameSingular} WHERE ${tableNameSingular}.id = $1;
            `;
            }

            const optionValues = [res.rows[0][`${option}_id`]];
            const optionRes = await client.query(optionQuery, optionValues);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(optionRes.rows[0]),
            };
        }
        else if (event.httpMethod === 'PUT') {
            const id = event.path.split('/').pop();

            const { description } = JSON.parse(event.body);

            query = `UPDATE days SET note = $1 WHERE id = $2 RETURNING *`;

            values = [description, id];
            const res = await client.query(query, values);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(res.rows[0]),
            };
        }
        else if (event.httpMethod === 'DELETE') {

            const segments = event.path.split('/').filter(Boolean);
            const optionId = segments[segments.length - 1];
            const option = segments[segments.length - 2];
            const dayId = segments[segments.length - 3];

            let res;

            if (option === 'symptom')
                res = await client.query('DELETE FROM day_symptoms WHERE day_id = $1 AND symptom_id = $2 RETURNING *', [dayId, optionId]);
            else if (option === 'product')
                res = await client.query('DELETE FROM day_products WHERE day_id = $1 AND product_id = $2 RETURNING *', [dayId, optionId]);

            if (res?.rows?.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ message: `${option} with id ${optionId} not found` }),
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