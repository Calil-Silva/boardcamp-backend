import express, { json } from 'express';
import cors from 'cors';
import pg from 'pg';
import joi from 'joi';

const app = express();
const { Pool } = pg;

app.use(cors());
app.use(express.json());

const connection = new Pool({
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
});
const categories = await connection.query('SELECT * FROM categories');
const namesArr = categories.rows.map(({ name }) => name);
const idsArr = categories.rows.map(({ id }) => id);
const gamesSchema = joi.object({
    name: joi.string(),
    image: joi.string(),
    stockTotal: joi.number().min(1),
    categoryId: joi.number(),
    pricePerDay: joi.number().min(1)
})

app.get('/categories', (req, res) => {
    connection.query('SELECT * FROM categories;')
        .then(r => res.send(r.rows))
})

app.post('/categories', (req, res) => {
    const name = req.body.name;

    if (name === '' || namesArr.includes(name)) {
        res.sendStatus(400)
    } else {
        connection.query('INSERT INTO categories (name) VALUES ($1);', [name])
            .then(r => res.sendStatus(201))
            .catch(e => res.sendStatus(400));
    }
})

const handleCategoryGame = (categoryID) => {
    return categories.rows.filter(({ id }) => id === categoryID)[0].name;
}

app.get('/games', (req, res) => {

    const filterParam = req.query.name;

    if (filterParam) {
        connection.query('SELECT * FROM games;')
            .then(r => res.send(
                r.rows.map(g => ({ ...g, categoryName: handleCategoryGame(g.categoryId) }))
                    .filter(g => g.name.slice(0, filterParam.length).toLowerCase() === filterParam.toLowerCase())
            ))
    } else {
        connection.query('SELECT * FROM games;')
            .then(r => res.send(
                r.rows.map(g => ({ ...g, categoryName: handleCategoryGame(g.categoryId) }),
                )))
    }

})

app.post('/games', async (req, res) => {

    const {
        name,
        image,
        stockTotal,
        categoryId,
        pricePerDay
    } = req.body

    const { error } = gamesSchema.validate(req.body);

    const games = await connection.query('SELECT (name) FROM games;');
    const handleGamesName = games.rows.map(g => g.name);

    if (!idsArr.includes(categoryId) || error) {
        res.sendStatus(400);
    } else if (handleGamesName.includes(name)) {
        res.sendStatus(409);
    } else {
        connection.query(`INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);`,
            [name, image, stockTotal, categoryId, pricePerDay])
                .then(() => res.sendStatus(201))
    }
})


app.listen(4000, () => {
    console.log('Server listening on port 4000.');
});


