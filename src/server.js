import express from "express";
import cors from "cors";
import pg from "pg";
import BaseJoi from "joi";
import JoiDate from "@hapi/joi-date";
import dayjs from "dayjs";

const server = express();
server.use(cors());
server.use(express.json());

const joi = BaseJoi.extend(JoiDate);

const { Pool } = pg;

const connection = new Pool ({
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
});

pg.types.setTypeParser(1082, (str) => str);

server.get("/categories", async (req, res) => {
    try {
        const result = await connection.query("SELECT * FROM categories");
        res.send(result.rows);
    } catch(err) {
        console.log(err.message);
        return res.sendStatus(500);
    }
});

server.post("/categories", async (req, res) => {
    const categoriesSchema = joi.object({
        name: joi.string().min(3).max(30).trim().required()
    });

    try {
        const value = await categoriesSchema.validateAsync(req.body);
        const { name } = value;
        const result = await connection.query("SELECT * FROM categories WHERE name = $1", [name]);
        if(result.rows[0]) {
            return res.sendStatus(409);
        }
        await connection.query("INSERT INTO categories (name) VALUES ($1)", [name]);
        res.sendStatus(201);
    } catch(err) {
        if(err.message === '"name" is not allowed to be empty') {
            console.log(err.message);
            return res.sendStatus(400);
        } else {
            console.log(err.message);
            return res.sendStatus(500);
        }
    }
});

server.get("/games", async (req, res) => {
    const { name } = req.query;

    if(name === undefined) {
        try {
            const result = await connection.query(`
                SELECT games.*, categories.name AS "categoryName"
                FROM games JOIN categories
                ON categories.id = games."categoryId"
            `);
            res.send(result.rows);
        } catch(err) {
            console.log(err.message);
            return res.sendStatus(500);
        }
    } else {
        try {
            const result = await connection.query(`
                SELECT games.*, categories.name AS "categoryName"
                FROM games JOIN categories
                ON categories.id = games."categoryId"
                WHERE games.name iLIKE ($1 || '%')
            `, [name]);

            if(result.rows.length === 0) {
                res.sendStatus(404);
            } else {
                res.send(result.rows);
            }
        } catch(err) {
            console.log(err.message);
            return res.sendStatus(500);
        }
    }  
});

server.post("/games", async (req, res) => {
    const result = await connection.query("SELECT id FROM categories");
    const categoriesIds = result.rows.map(item => item.id);

    const gamesSchema = joi.object({
        name: joi.string().min(3).max(30).trim().required(),
        image: joi.string().uri().pattern(/^http([^\s]+(?=\.(jpg|gif|png))\.\2)/).required(),
        stockTotal: joi.number().integer().min(1).required(),
        categoryId: joi.number().integer().min(1).required(),
        pricePerDay: joi.number().integer().min(1).required(),
    });

    try {
        const value = await gamesSchema.validateAsync(req.body);
        const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
        const result = await connection.query("SELECT * FROM games WHERE name = $1", [name]);

        if(result.rows[0]) {
            return res.sendStatus(409);
        }

        if(!categoriesIds.includes(categoryId)) {
            console.log('"categoryId" must be an existing category');
            return res.sendStatus(400);
        }
        await connection.query('INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)', [name, image, stockTotal, categoryId, pricePerDay]);
        res.sendStatus(201);
    } catch(err) {
        if(err.message === '"name" is not allowed to be empty') {
            console.log(err.message);
            return res.sendStatus(400);
        } else if(err.message === '"stockTotal" must be greater than or equal to 1') {
            console.log(err.message);
            return res.sendStatus(400);
        } else if(err.message === '"pricePerDay" must be greater than or equal to 1') {
            console.log(err.message);
            return res.sendStatus(400);
        }
        console.log(err.message);
        return res.sendStatus(500);
    }
});

server.get("/customers", async (req, res) => {
    const { cpf } = req.query;

    if(cpf === undefined) {
        try {
            const result = await connection.query(`SELECT * FROM customers`);
            
            res.send(result.rows);
        } catch(err) {
            console.log(err.message);
            return res.sendStatus(500);
        }
    } else {
        try {
            const result = await connection.query(`
                SELECT *
                FROM customers
                WHERE cpf LIKE ($1 || '%')`,
                [cpf]
            );

            if(result.rows.length === 0) {
                return res.sendStatus(404);
            } else {
                res.send(result.rows);
            }
        } catch(err) {
            console.log(err.message);
            return res.sendStatus(500);
        }
    }
});

server.get("/customers/:id", async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const result = await connection.query(`
            SELECT * FROM customers WHERE id=$1`,
            [id]
        );

        if(result.rows.length === 0) {
            return res.sendStatus(404);
        } else {
            res.send(result.rows[0]);
        }
    } catch(err) {
        console.log(err.message);
        return res.sendStatus(500);
    }
});

server.post("/customers", async (req, res) => {
    const customersSchema = joi.object({
        name: joi.string().min(3).max(30).trim().required(),
        phone: joi.string().min(10).max(11).pattern(/^[0-9]{10,11}$/).required(),
        cpf: joi.string().length(11).pattern(/^[0-9]{11}$/).required(),
        birthday: joi.date().format('YYYY-MM-DD').required(),
    });

    try {
        const value = await customersSchema.validateAsync(req.body);
        const { name, phone, cpf, birthday } = req.body;
        const result = await connection.query("SELECT * FROM customers WHERE cpf = $1", [cpf]);

        if(result.rows[0]) {
            return res.sendStatus(409);
        }

        await connection.query(`
            INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)`,
            [name, phone, cpf, birthday]
        );
        res.sendStatus(201);
    } catch(err) {
        if(
            err.message.includes("name")
            || err.message.includes("phone")
            || err.message.includes("cpf")
            || err.message.includes("birthday")
        ) {
            console.log(err.message);
            return res.sendStatus(400);
        }else {
            console.log(err.message);
            return res.sendStatus(500);
        }
    }
});

server.put("/customers/:id", async (req, res) => {
    const customersSchema = joi.object({
        name: joi.string().min(3).max(30).trim().required(),
        phone: joi.string().min(10).max(11).pattern(/^[0-9]{10,11}$/).required(),
        cpf: joi.string().length(11).pattern(/^[0-9]{11}$/).required(),
        birthday: joi.date().format('YYYY-MM-DD').required(),
    });

    const id = parseInt(req.params.id);

    try {
        const value = await customersSchema.validateAsync(req.body);
        const { name, phone, cpf, birthday } = req.body;
        const cpfResult = await connection.query("SELECT * FROM customers WHERE cpf = $1", [cpf]);

        if(cpfResult.rows[0]) {
            return res.sendStatus(409);
        }

        const idResult = await connection.query(`SELECT * FROM customers WHERE id=$1`, [id]);

        if(idResult.rows.length === 0) {
            return res.sendStatus(404);
        }

        await connection.query(`
            UPDATE customers
            SET name=$1, phone=$2, cpf=$3, birthday=$4
            WHERE id=$5`,
            [name, phone, cpf, birthday, id]
        );

        res.sendStatus(200);
    } catch(err) {
        if(
            err.message.includes("name")
            || err.message.includes("phone")
            || err.message.includes("cpf")
            || err.message.includes("birthday")
        ) {
            console.log(err.message);
            return res.sendStatus(400);
        }else {
            console.log(err.message);
            return res.sendStatus(500);
        }
    }
});

                // SELECT games.*, categories.name AS "categoryName"
                // FROM games JOIN categories
                // ON categories.id = games."categoryId"

server.get("/rentals", async (req, res) => {
    
    try {
        const result = await connection.query(`
        SELECT rentals.*, customers.* AS customer, games.* AS game
        FROM rentals
        JOIN customers ON customers.id = rentals."customerId"
        JOIN games ON games.id = rentals."gameId" 
        `
    );

    res.send(result.rows);
    } catch(err) {
        console.log(err.message);
        return res.sendStatus(500);
    }
    


});

server.post("/rentals", async (req, res) => {
    const rentalsSchema = joi.object({
        customerId: joi.number().integer().required(),
        gameId: joi.number().integer().required(),
        daysRented: joi.number().integer().min(1).required(),
    });

    try {
        const value = await rentalsSchema.validateAsync(req.body);
        const { customerId, gameId, daysRented } = req.body;

        const stockTotalResult = await connection.query(`
            SELECT "stockTotal" FROM games
            WHERE id=$1`,
            [gameId]
        );
        const stockTotal = stockTotalResult.rows[0].stockTotal;

        const stockRentedResult = await connection.query(`
            SELECT * FROM rentals
            WHERE "gameId"=$1 AND "returnDate" IS null`,
            [gameId]
        );
        const stockRented = stockRentedResult.rows.length; 
        
        const stockAvailable = stockTotal - stockRented;
        
        if(stockAvailable <= 0) {
            return res.sendStatus(400);
        }

        const customerAndGameIdResult = await connection.query(`
            SELECT customers.id as "customerId", games.id as "gameId"
            FROM customers, games
            WHERE customers.id=$1 AND games.id=$2`,
            [customerId, gameId]
        );

        if(customerAndGameIdResult.rows.length === 0) {
            return res.sendStatus(400);
        } else {
            const rentDate = dayjs().format('YYYY-MM-DD');
            const returnDate = null;
            const pricePerDayResult = await connection.query(`
                SELECT "pricePerDay"
                FROM games
                WHERE id=$1`,
                [gameId]
            );
            const pricePerDay = pricePerDayResult.rows[0].pricePerDay;
            const originalPrice = pricePerDay * daysRented;
            const delayFee = null;
            await connection.query(`
                INSERT INTO rentals
                ("customerId",
                "gameId",
                "rentDate",
                "daysRented",
                "returnDate",
                "originalPrice",
                "delayFee")
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [customerId, gameId, rentDate, daysRented, returnDate, originalPrice, delayFee]
            );
            res.sendStatus(201);
        }
    } catch(err) {
        if(err.message.includes("daysRented")) {
            console.log(err.message);
            return res.sendStatus(400);
        } else {
            console.log(err.message);
            return sendStatus(500);
        }
    }
});

server.post("/rentals/:id/return", async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const result = await connection.query(`
            SELECT * FROM rentals
            WHERE id = $1`,
            [id]
        );

        if(result.rows.length === 0) {
            return res.sendStatus(404);
        }

        let { rentDate, daysRented, returnDate, originalPrice, delayFee } = result.rows[0];
        console.log(rentDate, daysRented, returnDate, originalPrice, delayFee);
            
        if(returnDate !== null) {
            return res.sendStatus(400);
        }
        
        const miliSecondsOneDay = 86400000;
        const miliSecondsDaysRented = daysRented * miliSecondsOneDay;
        console.log(miliSecondsDaysRented);

        returnDate = dayjs().format('YYYY-MM-DD');
        const miliSecondsUntilReturn = new Date(returnDate).valueOf() - new Date(rentDate).valueOf();
        console.log(miliSecondsUntilReturn);

        const miliSecondsDifference = miliSecondsDaysRented - miliSecondsUntilReturn; 
        console.log(miliSecondsDifference);

        if(miliSecondsDifference >= 0) {
            delayFee = 0;
        } else {
            const pricePerDay = originalPrice / daysRented;
            console.log(pricePerDay);
            delayFee = pricePerDay * (-miliSecondsDifference/miliSecondsOneDay);
            console.log(delayFee);
        }

        await connection.query(`
            UPDATE rentals
            SET "returnDate"=$1, "delayFee"=$2
            WHERE id=$3`,
            [returnDate, delayFee, id]
        );

        res.sendStatus(200);
    } catch(err) {
        console.log(err.message);
        res.sendStatus(500);
    }
});

server.delete("/rentals/:id", async (req, res) => {

});

server.listen(4000, () => {
    console.log("Server running on port 4000.");
});