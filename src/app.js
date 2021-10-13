import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();
const { Pool } = pg;

app.use(cors());
app.use(express.json);

const connection = new Pool({
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
});

app.listen(4000);


