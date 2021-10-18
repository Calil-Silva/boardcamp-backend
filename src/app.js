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

app.use(cors());

app.use(express.json());

app.get('/categories', async (req, res) => {
    try {
        const promise = await connection.query('SELECT * FROM categories;')
        res.send(promise.rows)
    } catch (error) {
        res.sendStatus(500);
    }
})

app.post('/categories', async (req, res) => {
    const name = req.body.name;

    try {
        const categories = await connection.query('SELECT * FROM categories');
        const namesArr = categories.rows.map(({ name }) => name);
    
        if (name === '' || namesArr.includes(name)) {
            res.sendStatus(400)
        } else {
            await connection.query('INSERT INTO categories (name) VALUES ($1);', [name])
            res.sendStatus(201);
        }
    } catch (error) {
        res.sendStatus(500);
    }
})

app.get('/games', async (req, res) => {
    const filterParam = req.query.name;
    const categories = await connection.query('SELECT * FROM categories');
    const handleCategoryGame = (categoryID) => {
        return categories.rows.filter(({ id }) => id === categoryID)[0].name;
    }

    try {
        if (filterParam) {
            const promise = await connection.query('SELECT * FROM games;');
            res.send(
                    promise.rows.map(g => ({ ...g, categoryName: handleCategoryGame(g.categoryId), pricePerDay: g.pricePerDay.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'}) }))
                        .filter(g => g.name.slice(0, filterParam.length).toLowerCase() === filterParam.toLowerCase())
            );
        } else {
            const promise = await connection.query('SELECT * FROM games;');
                res.send(
                    promise.rows.map(g => ({ ...g, categoryName: handleCategoryGame(g.categoryId), pricePerDay: g.pricePerDay.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'}) }),
                    )
                );
        }
    } catch (error) {
        res.sendStatus(500);
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
    const categories = await connection.query('SELECT * FROM categories');
    const idsArr = categories.rows.map(({ id }) => id);

    try {
        if (!idsArr.includes(categoryId) || error) {
            res.sendStatus(400);
        } else if (handleGamesName.includes(name)) {
            res.sendStatus(409);
        } else {
            await connection.query(`INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);`,
                [name, image, stockTotal, categoryId, pricePerDay]);
            res.sendStatus(201);
        }
    } catch (error) {
        res.sendStatus(500);
    }
})

app.get('/customers', async (req, res) => {
    const { cpf } = req.query;

    try {
        if (cpf) {
            const promise = await connection.query(`SELECT * FROM customers WHERE cpf LIKE '${cpf}%';`);
            const customers = promise.rows.map(c => ({
                ...c,
                birthday: new Date(c.birthday).toLocaleDateString('pt-br')
            }))
    
            res.send(customers);
        } else {
            const promise = await connection.query('SELECT * FROM customers;');
            const customers = promise.rows.map(c => ({
                ...c,
                birthday: new Date(c.birthday).toLocaleDateString('pt-br')
            }))
            res.send(customers);
        }
    } catch (error) {
        res.sendStatus(500);
    }
})

app.get('/customers/:id', async (req, res) => {
    const id = +req.params.id;
    const customersArr = await connection.query('SELECT (id) FROM customers');
    const customersIdsArr = customersArr.rows.map(({ id }) => id);

    if (customersIdsArr.includes(id)) {
        const promise = await connection.query('SELECT * FROM customers WHERE id = $1', [id]);
        const customers = promise.rows.map(c => ({
            ...c,
            birthday: new Date(c.birthday).toLocaleDateString('pt-br')
        }))
        res.send(customers);
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

    if (error) {
        res.sendStatus(400);
    } else if (customersCPF.includes(cpf)) {
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
        if (error) {
            res.sendStatus(400)
        } else if (customersCPF.includes(cpf)) {
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
    const { customerId, gameId } = req.query;
    let promise;

    try {
        if(customerId) {
            promise = await connection.query(
                `SELECT 
                    rentals.*, 
                    customers.id AS cid, customers.name AS cname, 
                    games.id AS gid, games.name AS gname, games."categoryId",
                    categories.name AS "categoryName"
                 FROM 
                    rentals 
                 JOIN 
                    customers ON rentals."customerId" = customers.id 
                 JOIN 
                    games ON rentals."gameId" = games.id
                 JOIN
                    categories ON games."categoryId" = categories.id
                 WHERE
                    rentals."customerId" = $1;`, [customerId]
            );
        } else if (gameId) {
            promise = await connection.query(
                `SELECT 
                    rentals.*, 
                    customers.id AS cid, customers.name AS cname, 
                    games.id AS gid, games.name AS gname, games."categoryId",
                    categories.name AS "categoryName"
                 FROM 
                    rentals 
                 JOIN 
                    customers ON rentals."customerId" = customers.id 
                 JOIN 
                    games ON rentals."gameId" = games.id
                 JOIN
                    categories ON games."categoryId" = categories.id
                 WHERE
                    rentals."gameId" = $1;`, [gameId]
            );
        }
        else {
            promise = await connection.query(
                `SELECT 
                    rentals.*, 
                    customers.id AS cid, customers.name AS cname, 
                    games.id AS gid, games.name AS gname, games."categoryId",
                    categories.name AS "categoryName"
                 FROM 
                    rentals 
                 JOIN 
                    customers ON rentals."customerId" = customers.id 
                 JOIN 
                    games ON rentals."gameId" = games.id
                 JOIN
                    categories ON games."categoryId" = categories.id;`
            );
        }

        const response = promise.rows.map(r => ({
            ...r,
            rentDate: new Date(r.rentDate).toLocaleDateString('pt-br'),
            returnDate: r.returnDate && new Date(r.returnDate).toLocaleDateString('pt-br'),
            originalPrice: r.originalPrice.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'}),
            delayFee: r.delayFee > 0 ? r.delayFee.toLocaleString('pt-br', {style: 'currency', currency: 'BRL'}) : null,
            customer: {
                id: r.cid,
                name: r.cname
            },
            game: {
                id: r.gid,
                name: r.gname,
                categoryId: r.categoryId,
                categoryName: r.categoryName
            }
        }));
        response.forEach(r => {
            delete r.cid;
            delete r.gid;
            delete r.gname;
            delete r.cname;
            delete r.categoryId;
            delete r.categoryName;
        });
        res.send(response)
    } catch (error) {
        res.sendStatus(400);
    }
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
    const originalPrice = pricePerDay * daysRented;
    const handleObjCustomersId = await connection.query('SELECT id FROM customers;');
    const customersIds = handleObjCustomersId.rows.map(({ id }) => id)

    try {
        if (!customersIds.includes(customerId) || /^[0]$/.test(daysRented) || stockTotal === 0) {
            res.sendStatus(400);
        } else {
            await connection.query('INSERT INTO rentals ("customerId", "gameId", "daysRented", "rentDate", "originalPrice") VALUES ($1, $2, $3, $4, $5);',
                [customerId, gameId, daysRented, rentDate, originalPrice]);
            res.sendStatus(201);
        }
    } catch (error) {
        res.sendStatus(400);
    }
})

app.post('/rentals/:id/return', async (req, res) => {
    const { id } = req.params;
    const handleObjRentalId = await connection.query('SELECT id FROM rentals WHERE id = $1;', [id]);
    const handleObjRentalReturnDate = await connection.query('SELECT "returnDate" FROM rentals WHERE id = $1;', [id]);
    const rentalId = handleObjRentalId.rows;
    const { returnDate } = handleObjRentalReturnDate.rows[0];

    if(rentalId.length === 0) {
        res.sendStatus(404);
    } else if (returnDate !== null) {
        res.sendStatus(400);
    }

    const dayReturned = new Date().toLocaleDateString('pt-br');
    const handleObjPricePerDay = await connection.query(
        `SELECT 
            games."pricePerDay" 
         FROM 
            rentals
         JOIN
            games ON rentals."gameId" = games.id
         WHERE 
            rentals.id = $1;`, [id]);
    const pricePerDay = handleObjPricePerDay.rows[0].pricePerDay;

    try {
        await connection.query(
            `UPDATE 
                rentals SET "returnDate" = $1, "delayFee" = ($1 - "rentDate" - "daysRented") * $3 
             WHERE 
                id = $2;`, [dayReturned, id, pricePerDay]
        );
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(400);
    }
})

app.delete('/rentals/:id', async (req, res) => {
    const { id } = req.params;
    const handleObjRentalId = await connection.query('SELECT id FROM rentals WHERE id = $1;', [id]);
    const handleObjRentalReturnDate = await connection.query('SELECT "returnDate"  FROM rentals WHERE id = $1;', [id]);
    const rentalId = handleObjRentalId.rows;
    const { returnDate } = handleObjRentalReturnDate.rows[0];

    if(rentalId.length === 0) {
        res.sendStatus(404);
    } else if (returnDate !== null) {
        res.sendStatus(400);
    } 

    try {
        await connection.query('DELETE FROM rentals WHERE id = $1;', [id]);
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(400);
    }
})

app.listen(4000, () => {
    console.log('Server listening on port 4000.');
});


