import express from "express";
import cors from "cors";
import pg from "pg";
import joi from "joi";

const server = express();
server.use(cors());
server.use(express.json());

const { Pool } = pg;

const connection = new Pool ({
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
});

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
    try {
        const result = await connection.query("SELECT * FROM games");
        res.send(result.rows);
    } catch(err) {
        console.log(err.message);
        return res.sendStatus(500);
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

server.listen(4000, () => {
    console.log("Server running on port 4000.");
});