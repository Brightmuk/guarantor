const express = require('express');
const path = require('path');
const router = express.Router();

const adminControler = require('./controllers/admin');
const userControler = require('./controllers/user');

router.route('/quick/login')
   .post(userControler.postQuickLogin)  

router.route('/login')
   .get(userControler.getLogin) 
   .post(userControler.postLogin)  
router.route('/admin') 
      .get(adminControler.getHome) 
router.route('/') 
      .get(userControler.getHome)
router.route('/review/:id') 
      .get(userControler.getReview)
router.route('/view/:id')
      .get(userControler.getView)
router.route('/approve') 
      .post(userControler.postApprove)
router.route('/decline') 
      .post(userControler.postDecline)
router.route('/add') 
      .get(userControler.getAdd)  
      .post(userControler.postAdd)
router.route('/ussd')
      .post(userControler.ussdCallback)

module.exports = router;