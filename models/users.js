var bcrypt = require('bcrypt');
var mysql = require('mysql');
var db = require('../database');

const saltRounds = 10;
var connection = db.connection;

exports.createUser = function(requestBody) {

    return new Promise(function(resolve, reject) {

        var username = mysql.escape(requestBody.username);
        var name = mysql.escape(requestBody.name);

        // Generate salt
        bcrypt.genSalt(saltRounds, function(error, salt) {

            // Hash password
            bcrypt.hash(requestBody.password, salt, function(error, hash) {

                // Perform database insert
                var sql = "INSERT INTO users (username, password, realname) VALUES (" + username + ", '" + hash + "', " + name + ")";

                connection.query(sql, function (error, result) {
                    if (error) reject(error);
                    resolve(result);
                });
            });
        });
    });
};

exports.login = function(requestBody) {
    return new Promise(function(resolve, reject) {
        var sql = "SELECT id, realname, password FROM users WHERE username = " + mysql.escape(requestBody.username);

        connection.query(sql, function (error, result) {

            if (error) {
                reject(error);
                return;
            }

            if (!result || result.length == 0) {
                reject({
                    message: 'Username not found in database'
                });
                return;
            }

            var userMatch = result[0];
                
            // Load hash from your password DB.
            bcrypt.compare(requestBody.password, userMatch.password, function(error, result) {

                if (result) {
                    resolve({
                        id: userMatch.id,
                        name: userMatch.realname
                    });
                }
                else {
                    reject({
                        message: 'No match found for username and password'
                    });
                }
            });
        });
    });
}