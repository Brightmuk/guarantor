var mysql = require('mysql');
const sendSMS = require('./sendSMS');
const host =  process.env.DB_HOST;
const user =  process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = "guarantors";


exports.getHome = (req, res, next) => {
    res.render('admin', { });
 }