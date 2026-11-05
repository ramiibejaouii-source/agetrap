CREATE USER 'agetrap_user'@'%' IDENTIFIED BY 'agetrap';
GRANT ALL PRIVILEGES ON agetrap_db.* TO 'agetrap_user'@'%';
FLUSH PRIVILEGES;
EXIT;