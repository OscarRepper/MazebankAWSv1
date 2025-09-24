const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
 
let db;
(async () => {
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        console.log('Conectado a MySQL exitosamente!');
    } catch (err) {
        console.error('Error conectando a MySQL:', err.message);
    }
})();

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Todos los campos son obligatorios.' });
    }

    try {
        const [exRows] = await db.execute(
            'SELECT user_id, role_id, email, password FROM users WHERE email = ?',
            [email]
        );

        console.log(exRows);

        if (exRows.length > 0) {
            const userEX = exRows[0];
            //const passMatch = await bcrypt.compare(password, userEX.password);
            const passMatch = password;

            if (passMatch) {
                return res.json({ 
                    status: 'success', 
                    message: 'Login exitoso', 
                    user_id: userEX.user_id,
                    role_id: userEX.role_id 
                });
            } else {
                return res.status(401).json({ status: 'error', message: 'Contraseña incorrecta.' });
            }
        }

        return res.status(404).json({ status: 'error', message: 'Usuario no registrado.' });

    } catch (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ status: 'error', message: 'Error del servidor en login.' });
    }
});

/*
// Registro Extranjeros
app.post('/registro_EX', async (req, res) => {
    const { pasaporte, nombre, apellidos, correo, phone, contrasena, pais } = req.body;

    if (!pasaporte || !nombre || !apellidos || !correo || !phone || !contrasena || !pais) {
        return res.status(400).json({ status: 'error', message: 'Todos los campos son obligatorios.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        const sql = `
            INSERT INTO Clientes_EX 
            (pasaporte, nombre, apellidos, correo, telefono, password, pais_origen) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [pasaporte, nombre, apellidos, correo, phone, hashedPassword, pais];

        await db.execute(sql, values);
        res.json({ status: 'success', message: 'Registro exitoso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Error al registrar el usuario.' });
    }
});



// Registro Mexicanos
app.post('/registro_MX', async (req, res) => {
    const { nombre, apellidos, correo, phone, contrasena, claveElectoral, curpElectoral, fechaEmision, fechaVencimiento } = req.body;

    if (!nombre || !apellidos || !correo || !phone || !contrasena || !claveElectoral || !curpElectoral || !fechaEmision || !fechaVencimiento) {
        return res.status(400).json({ status: 'error', message: 'Todos los campos son obligatorios.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        const sqlCliente = `
            INSERT INTO Clientes_MX 
            (nombre, apellidos, telefono, correo, password, ine)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const valuesCliente = [nombre, apellidos, phone, correo, hashedPassword, claveElectoral];

        const [resultCliente] = await db.execute(sqlCliente, valuesCliente);
        const clienteId = resultCliente.insertId;

        const sqlINE = `
            INSERT INTO INE
            (clave_electoral, curp, cliente_id, fecha_emision, fecha_vencimiento)
            VALUES (?, ?, ?, ?, ?)
        `;
        const valuesINE = [claveElectoral, curpElectoral, clienteId, fechaEmision, fechaVencimiento];

        await db.execute(sqlINE, valuesINE);

        res.json({ status: 'success', message: 'Registro exitoso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Error al registrar al usuario.' });
    }
});


// info ROL
app.get('/usuario_info', async (req, res) => {
    const clienteId = req.query.cliente_id;
    const tipo = req.query.tipo;

    if (!clienteId || !tipo) {
        return res.status(400).json({ status: 'error', message: 'Faltan parámetros.' });
    }

    try {
        let tablaClientes = tipo === 'MX' ? 'Clientes_MX' : 'Clientes_EX';
        const [usuario] = await db.execute(`SELECT rol_id FROM ${tablaClientes} WHERE cliente_id = ?`, [clienteId]);

        if (usuario.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
        }

        const rolId = usuario[0].rol_id;

        const [rol] = await db.execute(`SELECT nombre FROM rol WHERE rol_id = ?`, [rolId]);

        if (rol.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Rol no encontrado' });
        }

        res.json({
            status: 'success',
            usuario: {
                cliente_id: clienteId,
                tipo,
                rol: rol[0].nombre
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Error consultando información del usuario' });
    }
});
*/


app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
