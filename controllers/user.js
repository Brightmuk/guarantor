var mysql = require('mysql');
const sendSMS = require('./sendSMS');
var admin = require("firebase-admin");
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
 
admin.initializeApp({
  credential: admin.credential.cert({
      projectId:process.env.PROJECT_ID, 
      clientEmail:process.env.CLIENT_EMAIL,
      privateKey:process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
  })
});  


exports.getLogin = (req, res, next) => {
    res.render('login', { msg: [], err: [] });
 }


exports.postQuickLogin = async(req, res, next) => {
    
    var number = req.body.number;
    var id = req.body.id;

    const userDoc = await admin.firestore().doc('members/'+number).get();
    
    if (userDoc.exists) {
        req.session.user = ({ id: userDoc.id, ...userDoc.data() });
        const doc = await admin.firestore().doc('requests/'+id).get();
        
        return res.render('review',{request:doc.data(), id: doc.id});
     }
     else {
        res.render('quick_login', { user: "", msg: [], err: ["Please Check Your information again"] });
     }

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
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(),savingsRange:doc.data().savings < 400 ? "below 400k" : 
    doc.data().savings >= 400000 && doc.data().savings < 1000000 ? "400k-1M" :
    doc.data().savings >= 1000000 ? "above 1M" : "Unknown" }));

    return res.render('add',{'members': data});
 
 }
exports.postAdd = async(req, res, next) => {
    var name = req.body.name;
    var phone = req.body.phone;
    var id = req.body.id;
    var amount = req.body.amount;
    var currentUser = req.session.user;

    var resourceId;

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
    }).then(function(docRef) {
        resourceId = docRef.id;
        console.log("Document written with ID: ", docRef.id);
    })

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
    sendSMS(`Hello ${name}, ${req.session.user.name} from Hauna Hela nini sacco is requesting you to become their guaranter. Visit this link to review their request.\nhttps://guarantor-85ri.onrender.com/review/${resourceId}`,phone)

    res.render('home', {requests: data,'msg':'Success',user: req.session.user,user_requests:data2 });
 }
 


exports.getReview = async(req, res, next) => {
    var id = req.params.id
    if(req.session.user==undefined){
        return res.render('quick_login',{id: id,msg: [], err: []});

    }else{
        const doc = await admin.firestore().doc('requests/'+id).get();
     
        return res.render('review',{request:doc.data(), id: doc.id});
    }
    

 
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

 exports.ussdCallback = async(req,res, next) => {
     try{
        const sessionId = req.body.sessionId;
        const serviceCode = req.body.serviceCode;
        const phoneNumber = req.body.phoneNumber;
        const input = req.body.text;
        console.log("Current input is: ",input)
        
        var response = '';
        if(input==''){
            const query = await admin.firestore().collection('members').where('phone','==',phoneNumber).get();
            if(query.docs.length<1){
                response = 'END You are not registered to the service!\nPlease visit https://guarantorske.com';
                 
            }else{
                var userDoc = query.docs[0].data();

                response = `CON  Hi  ${userDoc.name},  welcome to Sacco Gaurantor Service \n\n`
                response+="Please select an option to continue\n"
                response+="1. Login\n"
                response+="2. Contact support";
            }

        }else if(input=='1'){

            response="CON Please enter your pin";
        }else if(input=='2'){

            response="END Call 0791670106 for help or visit our website https://guarantorske.com"
        }else if(/^1\*\d{4}$/.test(input)){

            const query = await admin.firestore().collection('members').where('phone','==',phoneNumber).where('pin','==',input.slice(-4)).get();
            if(query.docs.length<1){
                response = 'END You have input the wrong pin, please try again!';
                 
            }else{
                var userDoc = query.docs[0].data();
                response = `CON ${userDoc.name}\nCurrent Savings: ${userDoc.savings < 400 ? "below 400k" : 
                userDoc.savings >= 400000 && userDoc.savings < 1000000 ? "400k-1M" :
                userDoc.savings >= 1000000 ? "above 1M" : "Unknown" }`

                response += `\nGuarantees: ${userDoc.guarantees}\nLoan repayment rate: ${userDoc.repayment},\nCurrent Loans: ${userDoc.loans}\n\n `
                response+="Please select an option to proceeed:\n"

                response+="1. Get guarantors\n"
                response+="2. View guarantor requests";

            }
        }else if(/^1\*\d{4}\*1$/.test(input)){
                response="CON Getting guarantor"
        }else if(/^1\*\d{4}\*2$/.test(input)){
            response="CON Viewing requests"
        }else{
            response="CON Please Select a valid option "
        }
        console.log("Sending response: ",response)
        res.send(response);

     }catch(e){
         console.log(e.toString())
        res.send('END Sorry, there was an error!\n Please try again later.')
     }
 }


// Define your getLogin function
exports.getLogin = (req, res, next) => {
  res.render('login', { msg: [], err: [] });
};




