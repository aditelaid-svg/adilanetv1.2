CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    balance DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('active', 'blocked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mikrotik_routers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status ENUM('online', 'offline', 'warning') DEFAULT 'offline',
    connected_users INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    speed VARCHAR(50) NOT NULL,
    quota VARCHAR(50) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    badge_color VARCHAR(50) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    package_id INT,
    voucher_code VARCHAR(100) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('saldo', 'qris') NOT NULL,
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (package_id) REFERENCES packages(id)
);

CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert demo admin
INSERT INTO users (name, email, password, role) VALUES ('Admin Web', 'admin@wifivoucher.com', 'admin123', 'admin');
INSERT INTO users (name, email, password, role, balance) VALUES ('Pelanggan Demo', 'user@wifivoucher.com', 'user123', 'user', 50000.00);

-- Insert demo packages
INSERT INTO packages (name, speed, quota, duration, price, badge_color) VALUES 
('Harian Hemat', '10 Mbps', 'Unlimited', '1 Hari', 5000, 'blue'),
('Mingguan Super', '20 Mbps', 'Unlimited', '7 Hari', 25000, 'purple'),
('Bulanan Pro', '50 Mbps', 'Unlimited', '30 Hari', 100000, 'cyan');

-- Insert demo routers
INSERT INTO mikrotik_routers (name, ip_address, username, password, status, connected_users) VALUES 
('Router Pusat', '192.168.1.1', 'admin', 'pass', 'online', 45),
('Router Cabang 1', '192.168.2.1', 'admin', 'pass', 'online', 12);
