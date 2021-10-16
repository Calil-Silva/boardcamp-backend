import express, { json } from 'express';
import cors from 'cors';
import pg from 'pg';
import joi from 'joi';

const app = express();
const { Pool } = pg;
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

app.use(cors());

app.use(express.json());

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

app.get('/games', (req, res) => {
    const filterParam = req.query.name;
    const handleCategoryGame = (categoryID) => {
        return categories.rows.filter(({ id }) => id === categoryID)[0].name;
    }

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
                )
            ))
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
    const gamesSchema = joi.object({
        name: joi.string(),
        image: joi.string(),
        stockTotal: joi.number().min(1),
        categoryId: joi.number(),
        pricePerDay: joi.number().min(1)
    })
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
            .then(() => res.sendStatus(201));
    }
})

app.get('/customers', async (req, res) => {
    const { cpf } = req.query;

    if(cpf) {
        const promise = await connection.query(`SELECT * FROM customers WHERE cpf LIKE '${cpf}%';`);
        res.send(promise.rows);
    } else {
        const promise = await connection.query('SELECT * FROM customers;');
        res.send(promise.rows);
    }

})

app.get('/customers/:id', async (req, res) => {
    const id = +req.params.id;
    const customersArr = await connection.query('SELECT (id) FROM customers');
    const customersIdsArr = customersArr.rows.map(({id}) => id);

        if(customersIdsArr.includes(id)) {
            const customers = await connection.query('SELECT * FROM customers WHERE id = $1', [id]);
            res.send(customers.rows[0]);
        } else {
            res.sendStatus(404);
        }

})

app.post('/customers', async (req, res) => {
    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body;
    const customersSchema = joi.object({
        name: joi.string(),
        phone: joi.string().pattern(/^([0-9]{11})|([0-9]{10})$/),
        cpf: joi.string().pattern(/^[0-9]{11}$/),
        birthday: joi.string().pattern(/^\d{2}[./-]\d{2}[./-]\d{4}$/)
    });
    const { error } = customersSchema.validate(req.body);
    const promise = await connection.query('SELECT * FROM customers;'); 
    const customersCPF = promise.rows.map(c => c.cpf);

    if(error) {
        res.sendStatus(400);
    } else if(customersCPF.includes(cpf)) {
        res.sendStatus(409);
    } else {
        await connection.query('INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4);', 
            [name, phone, cpf, birthday]);
        res.sendStatus(201);
    }
})

app.put('/customers/:id', async (req, res) => {
    const {
        name,
        phone,
        cpf,
        birthday
    } = req.body;
    const id = +req.params.id;
    const customersSchema = joi.object({
        name: joi.string(),
        phone: joi.string().pattern(/^([0-9]{11})|([0-9]{10})$/),
        cpf: joi.string().pattern(/^[0-9]{11}$/),
        birthday: joi.string().pattern(/^\d{2}[./-]\d{2}[./-]\d{4}$/)
    });
    const { error } = customersSchema.validate(req.body);
    const promise = await connection.query('SELECT * FROM customers WHERE id <> $1;', [id]); 
    const customersCPF = promise.rows.map(c => c.cpf);

    try {
        if(error) {
            res.sendStatus(400)
        } else if(customersCPF.includes(cpf)) {
            res.sendStatus(409);
        } else {
            await connection.query(`UPDATE customers SET name = '${name}', phone = '${phone}', cpf = '${cpf}', birthday = '${birthday}' WHERE id = '${id}';`);
            res.sendStatus(200);
        }
    } catch {
        res.sendStatus(400);
    }
});

app.get('/rentals', async (req, res) => {
    res.send('Oie')
})

app.post('/rentals', async (req, res) => {
    const {
        customerId,
        gameId,
        daysRented
      } = req.body;

    const rentDate = new Date().toLocaleDateString('pt-br');
    const handleObjGame = await connection.query('SELECT * FROM games where id = $1;', [gameId]);
    const pricePerDay = handleObjGame.rows[0].pricePerDay;
    const stockTotal = handleObjGame.rows[0].stockTotal;
    const id = handleObjGame.rows[0].id;
    const originalPrice = pricePerDay*daysRented;
    const handleObjCustomersId = await connection.query('SELECT id FROM customers;');
    const customersIds = handleObjCustomersId.rows.map(({id}) => id)

    try {
        if(!customersIds.includes(customerId) || /^[0]$/.test(daysRented) || stockTotal === 0) {
            res.sendStatus(400);
        } else {
            await connection.query('INSERT INTO rentals ("customerId", "gameId", "daysRented", "rentDate", "originalPrice") VALUES ($1, $2, $3);', 
                [customerId, gameId, daysRented, rentDate, originalPrice]);
            res.sendStatus(201);
        }
    } catch (error) {
        res.sendStatus(400);
    }
})

app.listen(4000, () => {
    console.log('Server listening on port 4000.');
});


