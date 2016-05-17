require('dotenv').load();

module.exports = {
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    host: process.env.HOST,
};
