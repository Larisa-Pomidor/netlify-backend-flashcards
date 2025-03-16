const { Client } = require('pg');

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

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

        if (event.httpMethod === 'POST') {
            let currentDate = new Date('2025-03-25');
            const dietLength = 4;
            //const dietLength = 40;

            const vegetablesList = [12, 13, 14, 15, 16, 17, 18, 28];
            const meatList = [6, 7, 10, 34];
            const porridgeList = [1, 2, 3, 4];

            const breakfastList = (porridge) =>
                [[porridge, 5], [porridge, 8], [29, 8], [30, 8], [porridge, 33], [29, 33], [30, 33],
                [29, 11], [30, 11], [porridge, 11], [5, 31], [5, 32], [31, 8], [32, 8], [31, 33], [32, 33]];

            const beveragesList = [35, 25, 27, 26];
            const snacks = [19, 20, 22, 23, 24, 36]

            let products = [];
            let porridge = null;
            const casseroleProducts = [11, 9, 5, 3];

            const productQuery = `
                INSERT INTO day_products (day_id, product_id)
                VALUES ($1, $2)
                RETURNING *`;

            const dayQuery = `
                INSERT INTO days (date, type_id)
                VALUES ($1, $2)
                RETURNING *`;

            let type = null;

            const typeList_1 = [1, 2, 3, 5];
            const typeList_2 = [1, 3];

            for (i = 0; i < dietLength; i++) {

                if (currentDate.getDay() === 3) {
                    porridge = porridgeList[getRandomInt(porridgeList.length)];
                    products = [];

                    const arrayLength = getRandomInt(1);
                    for (j = 0; j < arrayLength + 1; j++) {
                        products.push(vegetablesList[getRandomInt(vegetablesList.length)]);
                    }

                    type = 6;

                    const dayResult = await client.query(dayQuery, [currentDate, type]);
                    const dayId = dayResult.rows[0].id;

                    for (j = 0; j < casseroleProducts.length; j++) {
                        await client.query(productQuery, [dayId, casseroleProducts[j]]);
                    }
                    for (j = 0; j < products.length; j++) {
                        await client.query(productQuery, [dayId, products[j]]);
                    }

                    await client.query(productQuery, [dayId, beveragesList[getRandomInt(beveragesList.length)]]);
                    await client.query(productQuery, [dayId, snacks[getRandomInt(snacks.length)]]);

                    const breakfastOptions = breakfastList(porridge);
                    const randomBreakfast = breakfastOptions[getRandomInt(breakfastOptions.length)];

                    for (j = 0; j < randomBreakfast.length; j++) {
                        console.log("Inserting product:", randomBreakfast[j], "Type:", typeof randomBreakfast[j]);
                        await client.query(productQuery, [dayId, randomBreakfast[j]]);
                    }
                }

                else if (currentDate.getDay() === 4 || currentDate.getDay() === 5 || currentDate.getDay() === 6) {
                    if (currentDate.getDay() === 4) {
                        products.push(porridge);
                        products.push(meatList[getRandomInt(meatList.length)]);
                        type = typeList_1[getRandomInt(typeList_1.length)];
                    }

                    const dayResult = await client.query(dayQuery, [currentDate, type]);
                    const dayId = dayResult.rows[0].id;

                    for (j = 0; j < products.length; j++) {
                        await client.query(productQuery, [dayId, products[j]]);
                    }

                    await client.query(productQuery, [dayId, beveragesList[getRandomInt(beveragesList.length)]]);
                    await client.query(productQuery, [dayId, snacks[getRandomInt(snacks.length)]]);

                    const breakfastOptions = breakfastList(porridge);
                    const randomBreakfast = breakfastOptions[getRandomInt(breakfastOptions.length)];

                    for (j = 0; j < randomBreakfast.length; j++) {
                        console.log("Inserting product:", randomBreakfast[j], "Type:", typeof randomBreakfast[j]);
                        await client.query(productQuery, [dayId, randomBreakfast[j]]);
                    }
                }

                else if (currentDate.getDay() === 7 || currentDate.getDay() === 0 || currentDate.getDay() === 1) {
                    if (currentDate.getDay() === 7) {
                        porridge = porridgeList[getRandomInt(porridgeList.length)];
                        products = [];
                        products.push(meatList[getRandomInt(meatList.length)]);
                        products.push(porridge);

                        const arrayLength = getRandomInt(1);
                        for (j = 0; j < arrayLength + 1; j++) {
                            products.push(vegetablesList[getRandomInt(vegetablesList.length)]);
                        }

                        type = typeList_2[getRandomInt(typeList_2.length)];
                    }

                    const dayResult = await client.query(dayQuery, [currentDate, type]);
                    const dayId = dayResult.rows[0].id;

                    for (j = 0; j < products.length; j++) {
                        await client.query(productQuery, [dayId, products[j]]);
                    }

                    await client.query(productQuery, [dayId, beveragesList[getRandomInt(beveragesList.length)]]);
                    await client.query(productQuery, [dayId, snacks[getRandomInt(snacks.length)]]);

                    const breakfastOptions = breakfastList(porridge);
                    const randomBreakfast = breakfastOptions[getRandomInt(breakfastOptions.length)];
                    for (j = 0; j < randomBreakfast.length; j++) {
                        console.log("Inserting product:", randomBreakfast[j], "Type:", typeof randomBreakfast[j]);
                        await client.query(productQuery, [dayId, randomBreakfast[j]]);
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            return {
                statusCode: 201,
                headers
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