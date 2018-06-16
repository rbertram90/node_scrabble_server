var mysql = require('mysql');
var db = require('../database');

var connection = db.connection;

exports.getRecent = function() {
    return new Promise(function(resolve, reject) {
        var sql = "SELECT c.message, u.id, u.realname FROM chat_messages as c LEFT JOIN users as u ON c.user = u.id";

        connection.query(sql, function (error, result) {
            if (error) reject(error);

            resolve(result);
        });
    });
};