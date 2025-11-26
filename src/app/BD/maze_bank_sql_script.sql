-- ============================================
-- MAZEBANK - ESQUEMA ENFOCADO A TARJETAS Y CARGOS
-- ============================================

DROP DATABASE IF EXISTS MazeBank;
CREATE DATABASE IF NOT EXISTS MazeBank;
USE MazeBank;

-- ============================================
-- ROLES (IDs fijos: 1=Cliente, 2=Ejecutivo, 3=Gerente)
-- ============================================
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'cliente',   'Cliente bancario'),
(2, 'ejecutivo', 'Ejecutivo de cuenta'),
(3, 'gerente',   'Gerente de sucursal');

-- ============================================
-- USERS (SIN 'status', SIN INE)
-- ============================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    password VARCHAR(255) NOT NULL,   -- texto plano en ejemplo (usa hash en prod)
    role_id INT NOT NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- ============================================
-- CARD TYPES (SOLO 3 TIPOS: nómina, crédito, digital)
-- ============================================
CREATE TABLE card_types (
    card_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name ENUM('nomina','credito','digital') NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO card_types (type_name, description) VALUES
('nomina',  'Tarjeta de nómina / débito'),
('credito', 'Tarjeta de crédito'),
('digital', 'Tarjeta digital (virtual)');

-- ============================================
-- CARDS (1 POR TIPO POR USUARIO) + SALDO
-- (SIN COLUMNA status)
-- ============================================
CREATE TABLE cards (
    card_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    card_type_id INT NOT NULL,
    card_number CHAR(16) NOT NULL UNIQUE,     -- número de tarjeta
    account_number CHAR(20) NOT NULL UNIQUE,  -- número de cuenta (20)
    cvc CHAR(3) NOT NULL,                     -- CVC (ajusta a 4 si lo requieres)
    balance DECIMAL(15,2) NOT NULL DEFAULT 0, -- dinero en esa tarjeta
    expiration_date DATE NOT NULL,
    is_virtual BOOLEAN DEFAULT FALSE,         -- útil para 'digital'
    credit_limit DECIMAL(15,2) NULL,          -- útil para 'credito'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (card_type_id) REFERENCES card_types(card_type_id),
    CONSTRAINT uq_user_cardtype UNIQUE (user_id, card_type_id)
);

CREATE INDEX idx_cards_user ON cards(user_id);
CREATE INDEX idx_cards_type ON cards(card_type_id);

-- ============================================
-- CHARGES (CARGOS / MOVIMIENTOS)
-- charge_type: 1 = transferencia, 2 = pago de servicio
-- SIN ESTADOS
-- ============================================
CREATE TABLE charges (
    charge_id INT AUTO_INCREMENT PRIMARY KEY,
    origin_card_id INT NOT NULL,                  -- tarjeta del usuario que hizo el cargo
    charge_type TINYINT NOT NULL,                 -- 1=transferencia, 2=pago servicio
    beneficiary_name VARCHAR(100) NOT NULL,
    beneficiary_account_number VARCHAR(30) NOT NULL,
    beneficiary_bank VARCHAR(100) NULL,
    amount DECIMAL(15,2) NOT NULL,
    concept VARCHAR(200) NULL,
    transaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (origin_card_id) REFERENCES cards(card_id),
    CHECK (charge_type IN (1,2)),
    CHECK (amount > 0)
);

CREATE INDEX idx_charges_origin_time ON charges(origin_card_id, transaction_at);
CREATE INDEX idx_charges_type ON charges(charge_type);

-- ============================================
-- VISTAS PARA CONSULTAS SIMPLES
-- ============================================

-- Tarjetas con el nombre del usuario y tipo legible
CREATE OR REPLACE VIEW v_user_cards AS
SELECT
    c.card_id,
    u.user_id,
    u.name AS user_name,
    ct.type_name AS card_type_name,
    c.card_number,
    c.account_number,
    c.cvc,
    c.balance,
    c.expiration_date,
    c.is_virtual,
    c.credit_limit,
    c.created_at
FROM cards c
JOIN users u  ON u.user_id  = c.user_id
JOIN card_types ct ON ct.card_type_id = c.card_type_id;

-- Cargos con datos del usuario y tipo de tarjeta usada
CREATE OR REPLACE VIEW v_charges_simple AS
SELECT
    ch.charge_id,
    ch.transaction_at,
    ch.charge_type,
    CASE ch.charge_type WHEN 1 THEN 'transferencia' WHEN 2 THEN 'pago_servicio' END AS charge_type_name,
    u.user_id,
    u.name AS user_name,
    ct.type_name AS card_type_name,
    c.card_number AS origin_card_number,
    c.account_number AS origin_account_number,
    ch.beneficiary_name,
    ch.beneficiary_account_number,
    ch.beneficiary_bank,
    ch.amount,
    ch.concept
FROM charges ch
JOIN cards c       ON c.card_id = ch.origin_card_id
JOIN users u       ON u.user_id = c.user_id
JOIN card_types ct ON ct.card_type_id = c.card_type_id;

-- ============================================
-- DATOS DE EJEMPLO (USUARIOS CON role_id NUMÉRICO)
-- ============================================

-- Clientes (role_id = 1)
INSERT INTO users (name, email, phone, address, password, role_id) VALUES
('Juan Pérez González', 'juan.perez@email.com', '555-0101', 'Av. Principal 123, Ciudad de México', 'password123', 1),
('María Carmen López',  'maria.lopez@email.com', '555-0102', 'Calle Secundaria 456, Guadalajara',   'password456', 1),
('Carlos Roberto Díaz', 'carlos.diaz@email.com', '555-0103', 'Boulevard Norte 789, Monterrey',       'password789', 1),
('Ana Isabel Martínez', 'ana.martinez@email.com', '555-0104', 'Av. Sur 321, Puebla',                 'passwordabc', 1);

-- Ejecutivos (role_id = 2)
INSERT INTO users (name, email, phone, address, password, role_id) VALUES
('Luis Fernando Ruiz',       'luis.ruiz@banco.com',        '555-0201', 'Oficina Central, CDMX',  'exec123',   2),
('Patricia Morales Silva',   'patricia.morales@banco.com', '555-0202', 'Sucursal Guadalajara',   'exec456',   2);

-- Gerentes (role_id = 3)
INSERT INTO users (name, email, phone, address, password, role_id) VALUES
('Roberto Carlos Vega',      'roberto.vega@banco.com',     '555-0301', 'Dirección General, CDMX','manager123', 3),
('Claudia Elena Torres',     'claudia.torres@banco.com',   '555-0302', 'Gerencia Regional Norte','manager456', 3);

-- ============================================
-- TARJETAS DE EJEMPLO (3 por cliente: nomina, credito, digital)
-- Usamos a 'Juan Pérez González' y 'Ana Isabel Martínez'
-- ============================================

-- JUAN PÉREZ GONZÁLEZ
INSERT INTO cards (user_id, card_type_id, card_number, account_number, cvc, balance, expiration_date, is_virtual, credit_limit)
VALUES
((SELECT user_id FROM users WHERE email='juan.perez@email.com'),
 (SELECT card_type_id FROM card_types WHERE type_name='nomina'),
 '4556331100000001','700012345678900001','321',15000.00,'2028-12-31',FALSE,NULL),
((SELECT user_id FROM users WHERE email='juan.perez@email.com'),
 (SELECT card_type_id FROM card_types WHERE type_name='credito'),
 '4556331100000002','700012345678900002','987', 2000.00,'2029-05-31',FALSE,30000.00),
((SELECT user_id FROM users WHERE email='juan.perez@email.com'),
 (SELECT card_type_id FROM card_types WHERE type_name='digital'),
 '4556331100000003','700012345678900003','555', 3500.00,'2027-10-31',TRUE,NULL);

-- ANA ISABEL MARTÍNEZ
INSERT INTO cards (user_id, card_type_id, card_number, account_number, cvc, balance, expiration_date, is_virtual, credit_limit)
VALUES
((SELECT user_id FROM users WHERE email='ana.martinez@email.com'),
 (SELECT card_type_id FROM card_types WHERE type_name='nomina'),
 '4556331100000004','700012345678900004','123',32000.00,'2029-01-31',FALSE,NULL),
((SELECT user_id FROM users WHERE email='ana.martinez@email.com'),
 (SELECT card_type_id FROM card_types WHERE type_name='credito'),
 '4556331100000005','700012345678900005','456', 5000.00,'2029-06-30',FALSE,40000.00),
((SELECT user_id FROM users WHERE email='ana.martinez@email.com'),
 (SELECT card_type_id FROM card_types WHERE type_name='digital'),
 '4556331100000006','700012345678900006','789', 2500.00,'2027-09-30',TRUE,NULL);

-- ============================================
-- CARGOS DE EJEMPLO
-- charge_type: 1=transferencia, 2=pago_servicio
-- ============================================
INSERT INTO charges (origin_card_id, charge_type, beneficiary_name, beneficiary_account_number, beneficiary_bank, amount, concept)
VALUES
((SELECT c.card_id FROM cards c
   JOIN users u ON u.user_id=c.user_id
   JOIN card_types t ON t.card_type_id=c.card_type_id
  WHERE u.email='juan.perez@email.com' AND t.type_name='nomina'),
 1, 'Carlos Ramírez', '700099887766554433', 'Banco Ejemplo', 1250.50, 'Apoyo mensual'),

((SELECT c.card_id FROM cards c
   JOIN users u ON u.user_id=c.user_id
   JOIN card_types t ON t.card_type_id=c.card_type_id
  WHERE u.email='juan.perez@email.com' AND t.type_name='digital'),
 2, 'Servicios de Agua CDMX', '110022003300440055', 'AGUAS-CDMX', 485.00, 'Pago recibo #AQUA-2025-09'),

((SELECT c.card_id FROM cards c
   JOIN users u ON u.user_id=c.user_id
   JOIN card_types t ON t.card_type_id=c.card_type_id
  WHERE u.email='ana.martinez@email.com' AND t.type_name='credito'),
 1, 'Cuenta Ahorro Propia', '700012345678900004', 'MazeBank', 3000.00, 'Traspaso a ahorro'),

((SELECT c.card_id FROM cards c
   JOIN users u ON u.user_id=c.user_id
   JOIN card_types t ON t.card_type_id=c.card_type_id
  WHERE u.email='ana.martinez@email.com' AND t.type_name='nomina'),
 2, 'CFE', '998877665544332211', 'CFE', 760.00, 'Pago servicio SEP-2025');

-- ============================================
-- CONSULTAS RÁPIDAS (opcional)
-- ============================================
-- SELECT * FROM v_user_cards WHERE user_id = (SELECT user_id FROM users WHERE email='ana.martinez@email.com');
-- SELECT * FROM v_charges_simple WHERE user_name='Juan Pérez González' AND card_type_name='digital' ORDER BY transaction_at DESC;

-- ============================================
-- SP: data_user_by_id (conservado)
-- ============================================
DELIMITER //
DROP PROCEDURE IF EXISTS data_user_by_id//
CREATE PROCEDURE data_user_by_id(IN p_user_id INT)
BEGIN
  SELECT 
      user_id,
      name,
      email
  FROM users
  WHERE user_id = p_user_id;
END//
DELIMITER ;

-- Ejemplo de uso:
CALL data_user_by_id(3);

-- ==========================================================
-- Ajustes mínimos al esquema existente
-- ==========================================================
-- 1) Comisión por operación dentro del mismo cargo
ALTER TABLE charges
  ADD COLUMN fee DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER amount;

-- 2) Campos específicos para pagos de servicios (tipo 2)
ALTER TABLE charges
  ADD COLUMN service_convenio   VARCHAR(30) NULL AFTER concept,
  ADD COLUMN service_reference  VARCHAR(50) NULL AFTER service_convenio;

-- Índices útiles para búsquedas por convenio/referencia (opcional)
CREATE INDEX idx_charges_service ON charges(service_convenio, service_reference);


-- ==========================================================
-- SP: Transferencia (tipo 1) con comisión fija $5.00 en el MISMO cargo
-- ==========================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_hacer_transferencia//
CREATE PROCEDURE sp_hacer_transferencia(
    IN  p_origin_card_id           INT,
    IN  p_beneficiary_name         VARCHAR(100),
    IN  p_beneficiary_account_ref  VARCHAR(30),
    IN  p_beneficiary_bank         VARCHAR(100),
    IN  p_amount                   DECIMAL(15,2),
    IN  p_concept                  VARCHAR(200),
    IN  p_transaction_at           DATETIME  -- NULL => NOW()
)
BEGIN
    DECLARE v_balance DECIMAL(15,2);
    DECLARE v_total   DECIMAL(15,2);
    DECLARE v_when    DATETIME;
    DECLARE v_fee     DECIMAL(15,2) DEFAULT 5.00;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Monto inválido. Debe ser > 0.';
    END IF;

    SET v_when = IFNULL(p_transaction_at, NOW());
    SET v_total = p_amount + v_fee;

    -- Bloquea la fila de la tarjeta para evitar condiciones de carrera
    SELECT balance INTO v_balance
      FROM cards
     WHERE card_id = p_origin_card_id
     FOR UPDATE;

    IF v_balance IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tarjeta de origen no existe.';
    END IF;

    IF v_balance < v_total THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente (monto + comisión).';
    END IF;

    START TRANSACTION;

      -- Inserta un SOLO cargo tipo 1 con fee=5.00
      INSERT INTO charges
        (origin_card_id, charge_type, beneficiary_name, beneficiary_account_number, beneficiary_bank,
         amount, fee, concept, transaction_at)
      VALUES
        (p_origin_card_id, 1, p_beneficiary_name, p_beneficiary_account_ref, p_beneficiary_bank,
         p_amount, v_fee, p_concept, v_when);

      -- Descuenta monto + fee del balance
      UPDATE cards
         SET balance = balance - v_total
       WHERE card_id = p_origin_card_id;

    COMMIT;

    SELECT
      LAST_INSERT_ID() AS charge_id,
      p_amount         AS amount,
      v_fee            AS fee,
      v_total          AS debited_total,
      (SELECT balance FROM cards WHERE card_id = p_origin_card_id) AS new_balance,
      v_when           AS transaction_at;
END//
DELIMITER ;


-- ==========================================================
-- SP: Pago de servicio (tipo 2) con convenio + referencia
--     (sin comisión; si la deseas, ajusta p_fee_default)
-- ==========================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_pagar_servicio//
CREATE PROCEDURE sp_pagar_servicio(
    IN  p_origin_card_id   INT,
    IN  p_service_name     VARCHAR(100),  -- ej. 'CFE', 'AGUAS-CDMX'
    IN  p_convenio         VARCHAR(30),
    IN  p_reference        VARCHAR(50),
    IN  p_amount           DECIMAL(15,2),
    IN  p_concept          VARCHAR(200),
    IN  p_transaction_at   DATETIME,      -- NULL => NOW()
    IN  p_fee_default      DECIMAL(15,2)  -- pasa 0.00 si no hay comisión
)
BEGIN
    DECLARE v_balance DECIMAL(15,2);
    DECLARE v_when    DATETIME;
    DECLARE v_fee     DECIMAL(15,2);

    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Monto inválido. Debe ser > 0.';
    END IF;

    IF p_convenio IS NULL OR p_convenio = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Convenio requerido para pago de servicio.';
    END IF;

    IF p_reference IS NULL OR p_reference = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Referencia requerida para pago de servicio.';
    END IF;

    SET v_when = IFNULL(p_transaction_at, NOW());
    SET v_fee  = IFNULL(p_fee_default, 0.00);

    -- Bloquea saldo
    SELECT balance INTO v_balance
      FROM cards
     WHERE card_id = p_origin_card_id
     FOR UPDATE;

    IF v_balance IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tarjeta de origen no existe.';
    END IF;

    IF v_balance < (p_amount + v_fee) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente (monto + comisión).';
    END IF;

    START TRANSACTION;

      INSERT INTO charges
        (origin_card_id, charge_type, beneficiary_name, beneficiary_account_number, beneficiary_bank,
         amount, fee, concept, service_convenio, service_reference, transaction_at)
      VALUES
        (p_origin_card_id, 2, p_service_name, p_convenio, p_service_name,
         p_amount, v_fee, p_concept, p_convenio, p_reference, v_when);

      UPDATE cards
         SET balance = balance - (p_amount + v_fee)
       WHERE card_id = p_origin_card_id;

    COMMIT;

    SELECT
      LAST_INSERT_ID() AS charge_id,
      p_amount         AS amount,
      v_fee            AS fee,
      (p_amount + v_fee) AS debited_total,
      (SELECT balance FROM cards WHERE card_id = p_origin_card_id) AS new_balance,
      v_when           AS transaction_at,
      p_convenio       AS service_convenio,
      p_reference      AS service_reference;
END//
DELIMITER ;


-- Transferencia (tipo 1) con comisión $5 incluida en el mismo cargo:
CALL sp_hacer_transferencia(
  (SELECT card_id FROM v_user_cards WHERE user_name='Juan Pérez González' AND card_type_name='nomina' LIMIT 1),
  'Carlos Ramírez',
  '700099887766554433',
  'Banco Ejemplo',
  1250.50,
  'Apoyo mensual',
  NULL  -- usa NOW()
);

-- Pago de servicio (tipo 2) con convenio y referencia (sin comisión):
CALL sp_pagar_servicio(
  (SELECT card_id FROM v_user_cards WHERE user_name='Ana Isabel Martínez' AND card_type_name='digital' LIMIT 1),
  'CFE',              -- service_name
  '010203',           -- convenio
  'REF-2025-10-XYZ',  -- referencia
  760.00,
  'Pago luz SEP-2025',
  NULL,               -- NOW()
  0.00                -- fee (si tu banco cobra algo, cámbialo aquí)
);


CREATE OR REPLACE VIEW v_charges_simple AS
SELECT
  ch.charge_id,
  ch.transaction_at,
  ch.charge_type,
  CASE ch.charge_type WHEN 1 THEN 'transferencia' WHEN 2 THEN 'pago_servicio' END AS charge_type_name,
  u.user_id,
  u.name AS user_name,
  ct.type_name AS card_type_name,
  c.card_number AS origin_card_number,
  c.account_number AS origin_account_number,
  ch.beneficiary_name,
  ch.beneficiary_account_number,
  ch.beneficiary_bank,
  ch.amount,
  ch.fee,
  (ch.amount + ch.fee) AS total_debited,
  ch.concept,
  ch.service_convenio,
  ch.service_reference
FROM charges ch
JOIN cards c       ON c.card_id = ch.origin_card_id
JOIN users u       ON u.user_id = c.user_id
JOIN card_types ct ON ct.card_type_id = c.card_type_id;


SELECT * FROM v_charges_simple;



DELIMITER //

/* ==========================================================
   SP: Transferencia (tipo 1)
   - Mantiene el parámetro p_transaction_at pero SE IGNORA.
   - La fecha/hora se toma automáticamente del DEFAULT de la columna.
   ========================================================== */
DROP PROCEDURE IF EXISTS sp_hacer_transferencia//
CREATE PROCEDURE sp_hacer_transferencia(
    IN  p_origin_card_id           INT,
    IN  p_beneficiary_name         VARCHAR(100),
    IN  p_beneficiary_account_ref  VARCHAR(30),
    IN  p_beneficiary_bank         VARCHAR(100),
    IN  p_amount                   DECIMAL(15,2),
    IN  p_concept                  VARCHAR(200),
    IN  p_transaction_at           DATETIME  -- ignorado; se usa DEFAULT CURRENT_TIMESTAMP
)
BEGIN
    DECLARE v_balance DECIMAL(15,2);
    DECLARE v_total   DECIMAL(15,2);
    DECLARE v_fee     DECIMAL(15,2) DEFAULT 5.00;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Monto inválido. Debe ser > 0.';
    END IF;

    SET v_total = p_amount + v_fee;

    -- Bloquea la fila de la tarjeta para evitar condiciones de carrera
    SELECT balance INTO v_balance
      FROM cards
     WHERE card_id = p_origin_card_id
     FOR UPDATE;

    IF v_balance IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tarjeta de origen no existe.';
    END IF;

    IF v_balance < v_total THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente (monto + comisión).';
    END IF;

    START TRANSACTION;

      -- Inserta SIN especificar transaction_at (usa DEFAULT CURRENT_TIMESTAMP)
      INSERT INTO charges
        (origin_card_id, charge_type, beneficiary_name, beneficiary_account_number, beneficiary_bank,
         amount, fee, concept)
      VALUES
        (p_origin_card_id, 1, p_beneficiary_name, p_beneficiary_account_ref, p_beneficiary_bank,
         p_amount, v_fee, p_concept);

      -- Descuenta monto + fee del balance
      UPDATE cards
         SET balance = balance - v_total
       WHERE card_id = p_origin_card_id;

    COMMIT;

    -- Devuelve la fila recién creada (incluye la fecha/hora real guardada)
    SELECT
      ch.charge_id,
      ch.amount,
      ch.fee,
      (ch.amount + ch.fee) AS debited_total,
      (SELECT balance FROM cards WHERE card_id = p_origin_card_id) AS new_balance,
      ch.transaction_at
    FROM charges ch
    WHERE ch.charge_id = LAST_INSERT_ID();
END//
DELIMITER ;




-- origin_card_id, beneficiary_name, beneficiary_account_ref, beneficiary_bank, amount, concept, p_transaction_at(ignored)
CALL sp_hacer_transferencia(1, 'Carlos Ramírez', '700099887766554433', 'Banco Ejemplo', 1250.50, 'Apoyo mensual', NULL);




-- 1) Saldo de la TARJETA NÓMINA de Ana (la que usarás como destino)
SELECT 
  c.card_id,
  ct.type_name      AS card_type,
  c.account_number,
  c.balance
FROM v_user_cards c
JOIN card_types ct ON ct.type_name = c.card_type_name
WHERE c.user_name = 'Ana Isabel Martínez'
  AND c.card_type_name = 'nomina'
LIMIT 1;


CALL sp_hacer_transferencia(
  (SELECT card_id FROM v_user_cards WHERE user_name='Juan Pérez González' AND card_type_name='nomina' LIMIT 1),
  'Ana Isabel Martínez',
  '700012345678900004',  -- account_number de la tarjeta nómina de Ana
  'MazeBank',
  500.00,
  'Transferencia a Ana',
  NULL
);

use mazebank;

DROP PROCEDURE IF EXISTS registrar_cliente//


USE MazeBank;

DELIMITER //

DROP PROCEDURE IF EXISTS registrar_cliente//

CREATE PROCEDURE sp_registrar_cliente_completo(
    IN p_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_address TEXT,
    IN p_password VARCHAR(255)
)
BEGIN
    DECLARE v_user_id INT;
    DECLARE v_email_exists INT;
    DECLARE v_card_id_nomina INT;
    DECLARE v_card_id_credito INT;
    DECLARE v_card_id_digital INT;
    
    -- Variables para los números generados
    DECLARE v_card_number_nomina CHAR(16);
    DECLARE v_card_number_credito CHAR(16);
    DECLARE v_card_number_digital CHAR(16);
    DECLARE v_account_number_nomina CHAR(20);
    DECLARE v_account_number_credito CHAR(20);
    DECLARE v_account_number_digital CHAR(20);
    DECLARE v_cvc_nomina CHAR(3);
    DECLARE v_cvc_credito CHAR(3);
    DECLARE v_cvc_digital CHAR(3);
    
    -- Validar que el email no sea nulo o vacío
    IF p_email IS NULL OR p_email = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El email es requerido.';
    END IF;
    
    -- Verificar si el email ya existe
    SELECT COUNT(*) INTO v_email_exists
    FROM users
    WHERE email = p_email;
    
    IF v_email_exists > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El email ya está registrado en el sistema.';
    END IF;
    
    -- Generar números de tarjeta únicos (16 dígitos)
    SET v_card_number_nomina = CONCAT('4556', LPAD(FLOOR(RAND() * 1000000000000), 12, '0'));
    SET v_card_number_credito = CONCAT('4557', LPAD(FLOOR(RAND() * 1000000000000), 12, '0'));
    SET v_card_number_digital = CONCAT('4558', LPAD(FLOOR(RAND() * 1000000000000), 12, '0'));
    
    -- Generar números de cuenta únicos (20 caracteres: prefijo de 16 + 4 aleatorios)
    SET v_account_number_nomina = CONCAT('7000123456789000', LPAD(FLOOR(RAND() * 10000), 4, '0'));
    SET v_account_number_credito = CONCAT('7000123456789001', LPAD(FLOOR(RAND() * 10000), 4, '0'));
    SET v_account_number_digital = CONCAT('7000123456789002', LPAD(FLOOR(RAND() * 10000), 4, '0'));
    
    -- Generar CVCs aleatorios (3 dígitos)
    SET v_cvc_nomina = LPAD(FLOOR(RAND() * 1000), 3, '0');
    SET v_cvc_credito = LPAD(FLOOR(RAND() * 1000), 3, '0');
    SET v_cvc_digital = LPAD(FLOOR(RAND() * 1000), 3, '0');
    
    START TRANSACTION;
    
    -- 1. Insertar el usuario con role_id = 1 (cliente)
    INSERT INTO users (name, email, phone, address, password, role_id)
    VALUES (p_name, p_email, p_phone, p_address, p_password, 1);
    
    -- Obtener el user_id recién creado
    SET v_user_id = LAST_INSERT_ID();
    
    -- 2. Crear tarjeta de NÓMINA (card_type_id = 1)
    INSERT INTO cards (
        user_id, card_type_id, card_number, account_number, cvc, 
        balance, expiration_date, is_virtual, credit_limit
    ) VALUES (
        v_user_id, 
        1,  -- nómina
        v_card_number_nomina, 
        v_account_number_nomina, 
        v_cvc_nomina,
        5000.00,  -- Balance inicial de $5,000
        '2028-12-31',
        FALSE,
        NULL
    );
    
    SET v_card_id_nomina = LAST_INSERT_ID();
    
    -- 3. Crear tarjeta de CRÉDITO (card_type_id = 2)
    INSERT INTO cards (
        user_id, card_type_id, card_number, account_number, cvc, 
        balance, expiration_date, is_virtual, credit_limit
    ) VALUES (
        v_user_id, 
        2,  -- crédito
        v_card_number_credito, 
        v_account_number_credito, 
        v_cvc_credito,
        5000.00,  -- Balance inicial de $5,000
        '2028-12-31',
        FALSE,
        30000.00  -- Límite de crédito
    );
    
    SET v_card_id_credito = LAST_INSERT_ID();
    
    -- 4. Crear tarjeta DIGITAL (card_type_id = 3)
    INSERT INTO cards (
        user_id, card_type_id, card_number, account_number, cvc, 
        balance, expiration_date, is_virtual, credit_limit
    ) VALUES (
        v_user_id, 
        3,  -- digital
        v_card_number_digital, 
        v_account_number_digital, 
        v_cvc_digital,
        5000.00,  -- Balance inicial de $5,000
        '2027-10-31',
        TRUE,
        NULL
    );
    
    SET v_card_id_digital = LAST_INSERT_ID();
    
    COMMIT;
    
    -- Devolver información del usuario y sus tarjetas
    SELECT 
        v_user_id AS user_id,
        p_name AS user_name,
        p_email AS user_email,
        v_card_number_nomina AS card_number_nomina,
        v_account_number_nomina AS account_number_nomina,
        v_card_number_credito AS card_number_credito,
        v_account_number_credito AS account_number_credito,
        v_card_number_digital AS card_number_digital,
        v_account_number_digital AS account_number_digital,
        'Cliente registrado exitosamente con 3 tarjetas' AS mensaje;
        
END//

DELIMITER ;

-- ============================================
-- EJEMPLO DE USO DEL PROCEDIMIENTO
-- ============================================

-- ============================================
-- EJEMPLOS DE LLAMADAS CON DATOS RANDOM
-- ============================================

-- Ejemplo 1: Cliente random
CALL sp_registrar_cliente_completo(
    'Sofía Ramírez Hernández',
    'sofia.ramirez@gmail.com',
    '555-8923',
    'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX',
    'SofiaPass2024!'
);

-- Ejemplo 2: Otro cliente random
CALL sp_registrar_cliente_completo(
    'Diego Fernández Castillo',
    'diego.fernandez@hotmail.com',
    '555-4567',
    'Calle Reforma 567, Col. Juárez, Guadalajara, Jalisco',
    'Diego#Secure890'
);

-- Ejemplo 3: Cliente con datos diferentes
CALL sp_registrar_cliente_completo(
    'Valentina Torres Medina',
    'valentina.torres@yahoo.com',
    '555-7890',
    'Boulevard Constitución 890, Monterrey, Nuevo León',
    'Val3nt1na!Pass'
);

-- Ejemplo 4: Más variedad
CALL sp_registrar_cliente_completo(
    'Alejandro Morales Ruiz',
    'alex.morales@outlook.com',
    '555-3456',
    'Av. Universidad 2345, Col. Copilco, Puebla',
    'Alej@ndro2025'
);

-- Ejemplo 5: Usuario adicional
CALL sp_registrar_cliente_completo(
    'Isabella Gutiérrez Luna',
    'isa.gutierrez@gmail.com',
    '555-6789',
    'Calle Madero 123, Centro Histórico, Querétaro',
    'Isa_Bella#456'
);

-- ============================================
-- CONSULTA PARA VER USUARIO Y SUS TARJETAS
-- ============================================

-- Vista completa de un usuario con todas sus tarjetas
SELECT 
    u.user_id,
    u.name AS usuario,
    u.email,
    u.phone,
    u.address,
    r.role_name AS rol,
    c.card_id,
    ct.type_name AS tipo_tarjeta,
    c.card_number AS numero_tarjeta,
    c.account_number AS numero_cuenta,
    c.cvc,
    c.balance AS saldo,
    c.credit_limit AS limite_credito,
    c.expiration_date AS fecha_expiracion,
    c.is_virtual AS es_virtual,
    c.created_at AS fecha_creacion_tarjeta
FROM users u
JOIN roles r ON u.role_id = r.role_id
LEFT JOIN cards c ON u.user_id = c.user_id
LEFT JOIN card_types ct ON c.card_type_id = ct.card_type_id
WHERE u.email = 'eemiliano813@gmail.com'  -- Cambia por el email que desees consultar
ORDER BY c.card_type_id;

-- ============================================
-- ACTUALIZAR SALDO DE $5000 A TODOS LOS USUARIOS EXISTENTES
-- ============================================

-- Actualizar el saldo de TODAS las tarjetas a $5,000
UPDATE cards
SET balance = 5000.00
WHERE user_id IN (SELECT user_id FROM users WHERE role_id = 1);

-- Verificar los saldos actualizados
SELECT 
    u.name AS usuario,
    ct.type_name AS tipo_tarjeta,
    c.card_number AS numero_tarjeta,
    c.balance AS saldo_actual
FROM cards c
JOIN users u ON c.user_id = u.user_id
JOIN card_types ct ON c.card_type_id = ct.card_type_id
WHERE u.role_id = 1
ORDER BY u.user_id, c.card_type_id;

-- ============================================
-- CONSULTA ALTERNATIVA: Ver un cliente específico con formato amigable
-- ============================================

SELECT 
    '==================== INFORMACIÓN DEL CLIENTE ====================' AS seccion
UNION ALL
SELECT CONCAT('Usuario ID: ', u.user_id)
FROM users u WHERE u.email = 'pedro.sanchez@email.com'
UNION ALL
SELECT CONCAT('Nombre: ', u.name)
FROM users u WHERE u.email = 'pedro.sanchez@email.com'
UNION ALL
SELECT CONCAT('Email: ', u.email)
FROM users u WHERE u.email = 'pedro.sanchez@email.com'
UNION ALL
SELECT CONCAT('Teléfono: ', IFNULL(u.phone, 'N/A'))
FROM users u WHERE u.email = 'pedro.sanchez@email.com'
UNION ALL
SELECT '==================== TARJETAS DEL CLIENTE ======================'
UNION ALL
SELECT CONCAT(
    UPPER(ct.type_name), 
    ' | ', c.card_number, 
    ' | Cuenta: ', c.account_number,
    ' | Saldo: $', FORMAT(c.balance, 2),
    IF(c.credit_limit IS NOT NULL, CONCAT(' | Límite: $', FORMAT(c.credit_limit, 2)), '')
)
FROM cards c
JOIN card_types ct ON c.card_type_id = ct.card_type_id
JOIN users u ON c.user_id = u.user_id
WHERE u.email = 'pedro.sanchez@email.com'
ORDER BY ct.card_type_id;


use mazebank;