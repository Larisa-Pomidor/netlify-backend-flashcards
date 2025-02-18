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
                SELECT DISTINCT ON (songs.id)
                    songs.id, songs.name, songs.admin_rating, songs.performance, songs.created_at,
                    CAST(ROUND(AVG(user_songs.rating)) AS INTEGER) AS currentRating, songs.remark,
                    author.id AS author_id, author.name AS author_name,
                    lyrics.id AS lyrics_id, lyrics.code AS lyrics_code, lyrics.text AS lyrics_text
                        FROM songs
                            LEFT JOIN authors AS author ON songs.author_id = author.id
                            LEFT JOIN user_songs ON songs.id = user_songs.song_id
                            LEFT JOIN lyrics ON songs.id = lyrics.song_id
                            GROUP BY songs.id, author.id, lyrics.id;
                `);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(res.rows),
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