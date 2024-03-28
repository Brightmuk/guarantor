var mysql = require('mysql');
const sendSMS = require('./sendSMS');
var admin = require("firebase-admin");
var serviceAccount = require("../key.json");
const { Timestamp, FieldValue } = require('firebase-admin/firestore');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

exports.getLogin = (req, res, next) => {
    res.render('login', { msg: [], err: [] });
 }

exports.postLogin = async(req, res, next) => {
    
    var number = req.body.number;
    
    const userDoc = await admin.firestore().doc('members/'+number).get();
    
    if (userDoc.exists) {
        req.session.user = ({ id: userDoc.id, ...userDoc.data() });
        const snapshot = await admin.firestore()
        .collection('requests')
        .where('status','==','review')
        .where('to.name','==',userDoc.data().name)
        .get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const snapshot2 = await admin.firestore()
        .collection('requests')
        .where('requester','==',userDoc.data().name)
        .get();
        const data2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.render('home', {requests: data, user: req.session.user,user_requests:data2});
     }
     else {
        res.render('login', { user: "", msg: [], err: ["Please Check Your information again"] });
     }

 }

exports.getHome = async(req, res, next) => {
    if(req.session.user==undefined){
        res.render('login', { user: "", msg: [], err: [] });
    }else{
        const snapshot = await admin.firestore()
        .collection('requests')
        .where('to.name','==',req.session.user.name)
        .where('status','==','review')
        .get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const snapshot2 = await admin.firestore()
        .collection('requests')
        .where('requester','==',req.session.user.name)
        .get();
        const data2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(data2)
        console.log(req.session.user.name)
        
        res.render('home', {requests: data,user: req.session.user, user_requests:data2 });
    }

}

exports.getAdd = async(req, res, next) => { 
    const snapshot = await admin.firestore()
    .collection('members').where('name','!=',req.session.user.name)
    .get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.render('add',{'members': data});
 
 }
exports.postAdd = async(req, res, next) => {
    var name = req.body.name;
    var phone = req.body.phone;
    var id = req.body.id;
    var amount = req.body.amount;
    var currentUser = req.session.user;


    await admin.firestore()
    
    .collection('requests')
    .add({
        'amount':amount,
        'to':{ 
            'name':name,
            'id':id,
            'phone':phone
        },
        'date':Timestamp.now(),
        'requester': req.session.user.name,
        'status':'review',
        'portfolio':{ 
            'guarantees':currentUser.guarantees,
            'repaymentRate':currentUser.repayment,
            'savingsRange': currentUser.savings < 400 ? "below 400k" : 
               currentUser.savings >= 400000 && currentUser.savings < 1000000 ? "400k-1M" :
               currentUser.savings >= 1000000 ? "above 1M" : "Unknown"

        },
    }).then((v)=>console.log('Request sent'));

    const snapshot = await admin.firestore()
    .collection('requests')
    .where('to.name','==',req.session.user.name)
    .get()
    const data = snapshot.docs.map(doc => doc.data());

    const snapshot2 = await admin.firestore()
    .collection('requests')
    .where('requester','==',req.session.user.name)
    .get();
    const data2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sendSMS(`Hello ${name}, ${req.session.user.name} from Hauna Hela nini sacco is requesting you to become their guarnter. Visit this link to review their request.`,phone)

    res.render('home', {requests: data,'msg':'Success',user: req.session.user,user_requests:data2 });
 }


exports.postReview = async(req, res, next) => {
    var id = req.body.id;
    
    const doc = await admin.firestore().doc('requests/'+id).get();
     
    return res.render('review',{request:doc.data(), id: doc.id});
 
 }
exports.postApprove = async(req, res, next) => {
    var id = req.body.id
    var receiver = req.body.receiver
    var phone = req.body.phone

    await admin.firestore().collection('requests').doc(id).update({'status':'approved'});

    const snapshot = await admin.firestore().collection('requests')
    .where('to.name','==',req.session.user.name)
    .where('status','==','review').get();
    const data = snapshot.docs.map(doc => doc.data());

    const snapshot2 = await admin.firestore()
    .collection('requests')
    .where('requester','==',req.session.user.name)
    .get();
    const data2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sendSMS(`Hello ${receiver}, ${req.session.user.name} from Hauna Hela nini sacco has accepted your request to become their guaranter.`,phone)

    res.render('home', {requests: data,'msg':'Success' ,user: req.session.user,user_requests:data2}); 
  
 }

