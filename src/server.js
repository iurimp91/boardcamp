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
    console.log('working')
});

server.post("/categories", async (req, res) => {
    let name = "";
    const categoriesSchema = joi.object({
        name: joi.string().min(3).max(30).trim().required()
    });

    try {
        const value = await categoriesSchema.validateAsync(req.body);
        name = value.name;
    } catch(err) {
        if(err.message === '"name" is not allowed to be empty') {
            console.log(err.message);
            return res.sendStatus(400);
        } else {
            console.log(err.message);
            return res.sendStatus(500);
        }
    }

    try {
        const result = await connection.query("SELECT * FROM categories WHERE name = $1", [name]);
        if(result.rows[0]) {
            return res.sendStatus(409);
        }
    } catch(err) {
        console.log(err.message);
        return res.sendStatus(500);
    }

    try {
        const query = "INSERT INTO categories (name) VALUES ($1)";
        await connection.query(query, [name]);
        res.sendStatus(201);
    } catch(err) {
        console.log(err.message);
        return res.sendStatus(500);
    }
});

server.listen(4000, () => {
    console.log("Server running on port 4000.");
});