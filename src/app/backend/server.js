const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const nodemailer = require('nodemailer'); // <--- AÑADIDO
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

// ============================================================
// [CONFIGURACIÓN] NODEMAILER (ENVÍO DE CORREOS)
// ============================================================
// Vamos a leer las credenciales de email desde tu archivo .env
// ¡Asegúrate de agregar EMAIL_USER y EMAIL_PASS a tu .env!
// Ejemplo para .env:
// EMAIL_USER=tu_correo_de_mazebank@gmail.com
// EMAIL_PASS=tu_contraseña_de_app_de_16_letras_de_google
//
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail', // O tu proveedor SMTP
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log(`[Email] Transportador de email configurado para: ${process.env.EMAIL_USER}`);
} else {
    console.warn('[Email] FALTAN CREDENCIALES (EMAIL_USER, EMAIL_PASS) en .env. El envío de correos no funcionará.');
}
// ============================================================


//GENERAR LA SAL PARA EL LOGIN CON PASSWORD ENCRIPTADA

const SALT_ROUNDS = 10;

// ... (Tu endpoint /login se queda exactamente igual) ...
app.post('/login', async (req, res) => {
    // ... (código sin cambios)
    const { email, password } = req.body;

    if (!email || !password) {
        console.log('[LOGIN][0] Faltan campos ->', { email: !!email, password: !!password });
        return res.status(400).json({ status: 'error', message: 'Todos los campos son obligatorios.' });
    }

    const emailN = (email || '').trim().toLowerCase();
    console.log('[LOGIN][1] Body recibido ->', { emailN, passLen: String(password).length });

    try {
        const [rows] = await db.execute(
            `SELECT user_id, role_id, email, password FROM users WHERE email = ?`,
            [emailN]
        );

        console.log('[LOGIN][2] Filas encontradas ->', rows.length);

        if (!rows.length) {
            console.log('[LOGIN][2.1] Usuario NO encontrado:', emailN);
            return res.status(404).json({ status: 'error', message: 'Usuario no registrado.' });
        }

        const user = rows[0];
        const stored = user.password || '';
        const looksHashed = typeof stored === 'string' && (/^\$2[aby]\$/.test(stored));
        console.log('[LOGIN][3] Usuario ->', {
            user_id: user.user_id,
            role_id: user.role_id,
            email: user.email,
            status: user.status,
            passLen: stored.length,
            passPrefix: stored.slice(0, 4),
            looksHashed
        });

        if (looksHashed) {
            const ok = await bcrypt.compare(password, stored);
            console.log('[LOGIN][4] bcrypt.compare ->', ok);
            if (!ok) {
                console.log('[LOGIN][4.1] Credenciales inválidas (hash no coincide)');
                return res.status(401).json({ status: 'error', message: 'Credenciales inválidas.' });
            }
            console.log('[LOGIN][5] Login OK (hash)');
            return res.json({
                status: 'success',
                message: 'Login exitoso',
                user_id: user.user_id,
                role_id: user.role_id,
                email: user.email // <--- Devuelve el email para tu componente
            });
        } else {
            const plainMatch = password === stored;
            console.log('[LOGIN][4] Texto plano detectado. Comparación directa ->', plainMatch);
            if (!plainMatch) {
                console.log('[LOGIN][4.1] Credenciales inválidas (texto plano no coincide)');
                return res.status(401).json({ status: 'error', message: 'Credenciales inválidas.' });
            }
            try {
                const newHash = await bcrypt.hash(password, SALT_ROUNDS);
                await db.execute('UPDATE users SET password = ? WHERE user_id = ?', [newHash, user.user_id]);
                console.log('[LOGIN][5] Migración a bcrypt OK para user_id=', user.user_id);
            } catch (mErr) {
                console.error('[LOGIN][5][ERROR] Falló la migración a bcrypt:', mErr?.message);
                return res.json({
                    status: 'success',
                    message: 'Login exitoso (no se pudo migrar el hash, revisar logs)',
                    user_id: user.user_id,
                    role_id: user.role_id,
                    email: user.email // <--- Devuelve el email para tu componente
                });
            }
            console.log('[LOGIN][6] Login OK (migrado a hash)');
            return res.json({
                status: 'success',
                message: 'Login exitoso (migrado a hash)',
                user_id: user.user_id,
                role_id: user.role_id,
                email: user.email // <--- Devuelve el email para tu componente
            });
        }
    } catch (err) {
        console.error('[LOGIN][X][ERROR] Excepción no controlada:', err?.message);
        return res.status(500).json({ status: 'error', message: 'Error del servidor en login.' });
    }
});


// ... (Tu endpoint /dataUser se queda exactamente igual) ...
app.post('/dataUser', async (req, res) => {
    // ... (código sin cambios)
    console.log('\n[dataUser][IN] --------------------------------------------');
    console.time('[dataUser][TIMER]');
    try {
        const { idUser } = req.body;
        console.log('[dataUser][1] Body recibido ->', req.body);

        // Validación: id requerido y numérico
        const nId = Number(idUser);
        if (!idUser || Number.isNaN(nId)) {
            console.warn('[dataUser][VAL] idUser inválido ->', idUser);
            console.timeEnd('[dataUser][TIMER]');
            return res.status(400).json({ status: 'error', message: 'idUser inválido.' });
        }
        console.log('[dataUser][2] idUser OK ->', nId);

        // Llamada al SP (mysql2/promise)
        console.log('[dataUser][3] Ejecutando SP: CALL data_user_by_id(?) con ->', nId);
        const [resultSets] = await db.query('CALL data_user_by_id(?)', [nId]);

        // Estructura de mysql2 con CALL: [[rows], [meta]]
        const rows = Array.isArray(resultSets) ? resultSets[0] : [];
        console.log('[dataUser][4] Filas devueltas por SP ->', Array.isArray(rows) ? rows.length : 'N/A');

        if (!rows || rows.length === 0) {
            console.warn('[dataUser][5] Usuario NO encontrado ->', nId);
            console.timeEnd('[dataUser][TIMER]');
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }

        // Si esperas una sola fila:
        const user = rows[0];
        console.log('[dataUser][6] Usuario encontrado ->', {
            user_id: user.user_id,
            name: user.name,
            email: user.email
        });

        console.timeEnd('[dataUser][TIMER]');
        return res.json({
            status: 'success',
            data: {
                user_id: user.user_id,
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        console.error('[dataUser][ERROR]:', err?.message);
        console.timeEnd('[dataUser][TIMER]');
        return res.status(500).json({ status: 'error', message: 'Error del servidor en dataUser.' });
    }
});

// ... (Tu endpoint /transaction se queda exactamente igual) ...
app.post('/transaction', async (req, res) => {
    // ... (código sin cambios)
    console.log('\n[transaction][IN] --------------------------------------------');
    console.time('[transaction][TIMER]');

    try {
        const {
            origin_card_id,
            beneficiary_name,
            beneficiary_account_ref,
            beneficiary_bank,
            amount,
            concept,
            transaction_at
        } = req.body;

        console.log('[transaction][1] Body recibido ->', req.body);

        // Validaciones básicas
        if (!origin_card_id || !beneficiary_name || !beneficiary_account_ref || !amount) {
            console.warn('[transaction][VAL] Campos faltantes o inválidos.');
            console.timeEnd('[transaction][TIMER]');
            return res.status(400).json({
                status: 'error',
                message: 'Faltan datos obligatorios: origin_card_id, beneficiary_name, beneficiary_account_ref, amount.'
            });
        }

        const nAmount = Number(amount);
        if (Number.isNaN(nAmount) || nAmount <= 0) {
            console.warn('[transaction][VAL] Monto inválido ->', amount);
            console.timeEnd('[transaction][TIMER]');
            return res.status(400).json({
                status: 'error',
                message: 'El monto debe ser un número mayor a 0.'
            });
        }

        // Llamar al procedimiento almacenado
        console.log('[transaction][2] Ejecutando SP sp_hacer_transferencia()...');
        const [resultSets] = await db.query(
            'CALL sp_hacer_transferencia(?, ?, ?, ?, ?, ?, ?)',
            [
                origin_card_id,
                beneficiary_name,
                beneficiary_account_ref,
                beneficiary_bank || null,
                nAmount,
                concept || null,
                transaction_at || null
            ]
        );

        // Estructura típica de resultado: [[rows], [meta]]
        const rows = Array.isArray(resultSets) ? resultSets[0] : [];
        console.log('[transaction][3] Filas devueltas ->', Array.isArray(rows) ? rows.length : 'N/A');

        if (!rows || rows.length === 0) {
            console.warn('[transaction][4] No se devolvieron resultados del SP.');
            console.timeEnd('[transaction][TIMER]');
            return res.status(500).json({
                status: 'error',
                message: 'No se devolvieron datos del procedimiento.'
            });
        }

        const result = rows[0];
        console.log('[transaction][5] Transferencia realizada ->', result);

        console.timeEnd('[transaction][TIMER]');
        return res.json({
            status: 'success',
            message: 'Transferencia realizada exitosamente.',
            data: result
        });
    } catch (err) {
        console.error('[transaction][ERROR]:', err?.message);
        console.timeEnd('[transaction][TIMER]');
        return res.status(500).json({
            status: 'error',
            message: 'Error del servidor en transaction.',
            details: err?.message
        });
    }
});


// ============================================================
// [API] ENVIAR COMPROBANTE POR EMAIL (NUEVO ENDPOINT)
// ============================================================
app.post('/api/enviar-comprobante', async (req, res) => {
    console.log('\n[email][IN] --------------------------------------------');
    console.time('[email][TIMER]');
    
    // 1. Verificar que el transportador esté listo
    if (!transporter) {
        console.error('[email][ERROR] El transportador de email no está configurado. Revisa las variables .env (EMAIL_USER, EMAIL_PASS)');
        console.timeEnd('[email][TIMER]');
        return res.status(500).json({ status: 'error', message: 'Error de configuración del servidor: El servicio de email no está disponible.' });
    }

    // 2. Obtener datos del body
    const { to_email, subject, htmlBody } = req.body;
    console.log('[email][1] Body recibido ->', { to_email, subject: subject, htmlLen: htmlBody ? htmlBody.length : 0 });

    // 3. Validar datos
    if (!to_email || !subject || !htmlBody) {
        console.warn('[email][VAL] Faltan datos (to_email, subject, o htmlBody).');
        console.timeEnd('[email][TIMER]');
        return res.status(400).json({ status: 'error', message: 'Faltan datos para el envío del correo.' });
    }
    
    // 4. Definir opciones del correo
    const mailOptions = {
        from: `"MazeBank" <${process.env.EMAIL_USER}>`, // Remitente (Nombre y correo)
        to: to_email,                                 // Destinatario
        subject: subject,                             // Asunto
        html: htmlBody                                // Cuerpo del correo (El HTML de tu comprobante)
    };

    // 5. Enviar correo
    try {
        console.log(`[email][2] Enviando correo a -> ${to_email}`);
        const info = await transporter.sendMail(mailOptions);
        
        console.log('[email][SUCCESS] Correo enviado exitosamente ->', info.response);
        console.timeEnd('[email][TIMER]');
        res.status(200).json({ status: 'success', message: 'Correo enviado exitosamente' });

    } catch (error) {
        console.error('[email][ERROR] Falló el envío de Nodemailer ->', error?.message);
        console.timeEnd('[email][TIMER]');
        res.status(500).json({ status: 'error', message: 'Error al enviar el correo.', details: error?.message });
    }
});
// ============================================================


// ... (Tu endpoint /register se queda exactamente igual) ...
app.post('/register', async (req, res) => {
    // ... (código sin cambios)
    console.log('\n[register][IN] --------------------------------------------');
    console.time('[register][TIMER]');

    try {
        const {
            name,
            email,
            phone,
            address,
            password
        } = req.body;

        console.log('[register][1] Body recibido ->', {
            name,
            email,
            phone: phone || 'N/A',
            address: address || 'N/A',
            passwordLen: password ? password.length : 0
        });

        // Validaciones básicas
        if (!name || !email || !password) {
            console.warn('[register][VAL] Campos obligatorios faltantes.');
            console.timeEnd('[register][TIMER]');
            return res.status(400).json({
                status: 'error',
                message: 'Los campos name, email y password son obligatorios.'
            });
        }

        // Validar formato de email básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.warn('[register][VAL] Email inválido ->', email);
            console.timeEnd('[register][TIMER]');
            return res.status(400).json({
                status: 'error',
                message: 'El formato del email no es válido.'
            });
        }

        // Validar longitud mínima de contraseña
        if (password.length < 6) {
            console.warn('[register][VAL] Contraseña muy corta ->', password.length);
            console.timeEnd('[register][TIMER]');
            return res.status(400).json({
                status: 'error',
                message: 'La contraseña debe tener al menos 6 caracteres.'
            });
        }

        // Hashear la contraseña
        console.log('[register][2] Hasheando contraseña...');
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        console.log('[register][3] Password hasheado OK ->', {
            originalLen: password.length,
            hashedLen: hashedPassword.length,
            hashPrefix: hashedPassword.slice(0, 7)
        });

        // Llamar al procedimiento almacenado con la contraseña hasheada
        console.log('[register][4] Ejecutando SP sp_registrar_cliente_completo()...');
        const [resultSets] = await db.query(
            'CALL sp_registrar_cliente_completo(?, ?, ?, ?, ?)',
            [
                name,
                email,
                phone || null,
                address || null,
                hashedPassword  // Contraseña ya hasheada
            ]
        );

        // Estructura típica de resultado: [[rows], [meta]]
        const rows = Array.isArray(resultSets) ? resultSets[0] : [];
        console.log('[register][5] Filas devueltas ->', Array.isArray(rows) ? rows.length : 'N/A');

        if (!rows || rows.length === 0) {
            console.warn('[register][6] No se devolvieron resultados del SP.');
            console.timeEnd('[register][TIMER]');
            return res.status(500).json({
                status: 'error',
                message: 'No se pudieron crear el usuario y las tarjetas.'
            });
        }

        const result = rows[0];
        console.log('[register][7] Usuario registrado exitosamente ->', {
            user_id: result.user_id,
            user_name: result.user_name,
            user_email: result.user_email
        });

        console.timeEnd('[register][TIMER]');
        return res.json({
            status: 'success',
            message: 'Usuario registrado exitosamente con 3 tarjetas.',
            data: {
                user_id: result.user_id,
                user_name: result.user_name,
                user_email: result.user_email,
                cards: {
                    nomina: {
                        card_number: result.card_number_nomina,
                        account_number: result.account_number_nomina
                    },
                    credito: {
                        card_number: result.card_number_credito,
                        account_number: result.account_number_credito
                    },
                    digital: {
                        card_number: result.card_number_digital,
                        account_number: result.account_number_digital
                    }
                }
            }
        });
    } catch (err) {
        console.error('[register][ERROR]:', err?.message);
        console.timeEnd('[register][TIMER]');

        // Manejo de errores específicos del SP
        if (err?.message?.includes('ya está registrado')) {
            return res.status(409).json({
                status: 'error',
                message: 'El email ya está registrado en el sistema.'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Error del servidor al registrar usuario.',
            details: err?.message
        });
    }
});


// ... (Todos tus endpoints y ejemplos comentados se quedan igual) ...
/*
//
//app.post('/registro_EX', async (req, res) => {
...
*/


app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});