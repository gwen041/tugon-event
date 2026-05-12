-- TUGON Database Initialisation Script
-- Run this once before starting the server.
-- mysql -u root -p < database/init.sql

CREATE DATABASE IF NOT EXISTS tugon_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE tugon_db;

-- 1. ADMINS
CREATE TABLE IF NOT EXISTS admins (
    id         INT(11)      NOT NULL AUTO_INCREMENT,
    username   VARCHAR(80)  NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_username (username)
) ENGINE=InnoDB;

-- 2. STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id         INT(11)      NOT NULL AUTO_INCREMENT,
    student_id VARCHAR(20)  NOT NULL,
    first_name VARCHAR(80)  NOT NULL,
    last_name  VARCHAR(80)  NOT NULL,
    email      VARCHAR(160) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    college    VARCHAR(80)  NOT NULL,
    course     VARCHAR(120)          DEFAULT NULL,
    major      VARCHAR(80)           DEFAULT NULL,
    year_level ENUM('1st Year','2nd Year','3rd Year','4th Year') NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_student_email   (email),
    UNIQUE KEY uq_student_id_num  (student_id)
) ENGINE=InnoDB;

-- 3. EVENTS
CREATE TABLE IF NOT EXISTS events (
    id              INT(11)      NOT NULL AUTO_INCREMENT,
    title           VARCHAR(200) NOT NULL,
    description     TEXT                  DEFAULT NULL,
    date            DATE         NOT NULL,
    start_time      TIME                  DEFAULT NULL,
    end_time        TIME                  DEFAULT NULL,
    location        VARCHAR(120)          DEFAULT NULL,
    category        VARCHAR(60)           DEFAULT NULL,
    capacity        INT(11)               DEFAULT NULL,
    target_colleges JSON         NOT NULL,
    target_years    JSON         NOT NULL,
    image_url       VARCHAR(300)          DEFAULT NULL,
    is_featured     TINYINT(1)   NOT NULL DEFAULT 0,
    featured_scope  VARCHAR(80)           DEFAULT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_featured_scope (featured_scope)
) ENGINE=InnoDB;

-- 4. REGISTRATIONS
CREATE TABLE IF NOT EXISTS registrations (
    student_id        INT(11)   NOT NULL,
    event_id          INT(11)   NOT NULL,
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, event_id),
    CONSTRAINT fk_reg_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
    CONSTRAINT fk_reg_event   FOREIGN KEY (event_id)   REFERENCES events   (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Default admin  (password: admin123)
INSERT IGNORE INTO admins (username, password)
VALUES ('admin', '$2b$12$0Feq2lxmYOFfdGvoHW1M5ewQ9cRNod6Y5MTa1AHUlsCF6FwLhGYtC');
