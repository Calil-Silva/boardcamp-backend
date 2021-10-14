import express from 'express';
import cors from 'cors';
import pg from 'pg';

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
const namesObj = await connection.query('SELECT (name) FROM categories');
const namesArr = namesObj.rows.map(({name}) => name);

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

app.listen(4000, () => {
    console.log('Server listening on port 4000.');
});


