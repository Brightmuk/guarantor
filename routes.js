const express = require('express');
const path = require('path');

const router = express.Router();

const adminControler = require('./controllers/admin');
const userControler = require('./controllers/user');

router.route('/login')
   .get(userControler.getLogin) 
   .post(userControler.postLogin)  
router.route('/admin') 
      .get(adminControler.getHome) 
router.route('/') 
      .get(userControler.getHome)
router.route('/review') 
      .post(userControler.postReview)
router.route('/approve') 
      .post(userControler.postApprove)
router.route('/add') 
      .get(userControler.getAdd)  
      .post(userControler.postAdd)
module.exports = router;