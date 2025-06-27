const { Sequelize } = require('sequelize');
const path = require('path');

// Use environment variable for database path or default to container path
const dbPath = process.env.NODE_ENV === 'production' 
    ? '/usr/src/app/data/database.sqlite'
    : path.join(__dirname, '../data/database.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: console.log, // Enable logging for debugging
    define: {
        timestamps: true,
        underscored: true
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Test the connection
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

module.exports = sequelize;
