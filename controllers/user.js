var mysql = require('mysql');
const sendSMS = require('./sendSMS');
var admin = require("firebase-admin");
const { Timestamp, FieldValue } = require('firebase-admin/firestore');

const liveUrl="https://506d-41-90-185-254.ngrok-free.app/review/";

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
        .where('requester.name','==',userDoc.data().name)
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
        .where('requester.name','==',req.session.user.name)
        .get();
        const data2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        
        res.render('home', {requests: data,user: req.session.user, user_requests:data2 });
    }

}

exports.getAdd = async(req, res, next) => { 
    const snapshot = await admin.firestore() 
    .collection('members').where('name','!=',req.session.user.name)
    .get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(),savingsRange:doc.data().savings < 400000 ? "below 400k" : 
    doc.data().savings >= 400000 && doc.data().savings < 1000000 ? "400k-1M" :
    doc.data().savings >= 1000000 ? "above 1M" : "Unknown" }));

    return res.render('add',{'members': data});
 
 }
 exports.getView = async(req, res, next) => { 
    var id = req.params.id

    const snapshot = await admin.firestore().doc('requests/'+id).get();

    const data = ({ id: snapshot.id, ...snapshot.data(),})

    return res.render('view',{'request': data});
 
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
        'requester': {
            'name':req.session.user.name,
            'id':currentUser.id,
            'phone':req.session.user.phone,
        },
       
        'status':'review', 
        'portfolio':{ 
            'guarantees':currentUser.guarantees,
            'repaymentRate':currentUser.repayment,
            'savingsRange': currentUser.savings < 400000 ? "below 400k" : 
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
    sendSMS(`Hello ${name}, ${req.session.user.name} from Sacco Guarantor Service is requesting you to become their guaranter. Visit this link to review their request.\n${liveUrl}${resourceId}\nor dial *384*001009#\n`,phone)

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
    sendSMS(`Hello ${receiver}, ${req.session.user.name} from Sacco Guarantor Service has accepted your request to become their guaranter.`,phone)

    res.render('home', {requests: data,'msg':'Success' ,user: req.session.user,user_requests:data2}); 
  
 }
 exports.postDecline = async(req, res, next) => {
    var id = req.body.id
    var receiver = req.body.receiver
    var phone = req.body.phone

    await admin.firestore().collection('requests').doc(id).update({'status':'declined'});

    const snapshot = await admin.firestore().collection('requests')
    .where('to.name','==',req.session.user.name)
    .where('status','==','review').get();
    const data = snapshot.docs.map(doc => doc.data()); 

    const snapshot2 = await admin.firestore()
    .collection('requests')
    .where('requester','==',req.session.user.name)
    .get();
    const data2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sendSMS(`Hello ${receiver}, ${req.session.user.name} from Sacco Guarantor Service has declined your request to become their guaranter.`,phone)

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

                response = `CON  Hi  ${userDoc.name},  welcome to Sacco Guarantor Service \n\n`
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
                response = `CON [${query.docs[0].id}] ${userDoc.name}\nCurrent Savings: ${userDoc.savings < 400000 ? "below 400k" : 
                userDoc.savings >= 400000 && userDoc.savings < 1000000 ? "400k-1M" :
                userDoc.savings >= 1000000 ? "above 1M" : "Unknown" }`

                response += `\nGuarantees: ${userDoc.guarantees}\nLoan repayment rate: ${userDoc.repayment}\nCurrent Loans: ${userDoc.loans}\n\n `
                response+="Please select an option to proceeed:\n"

                response+="1. Get guarantors\n"
                response+="2. View guarantor requests";

            }
        }else if(/^1\*\d{4}\*1$/.test(input)){
            const snapshot = await admin.firestore() 
            .collection('members').where('phone','!=',phoneNumber)
            .limit(5)
            .get();
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(),savingsRange:doc.data().savings < 400000 ? "below 400k" : 
            doc.data().savings >= 400000 && doc.data().savings < 1000000 ? "400k-1M" :
            doc.data().savings >= 1000000 ? "above 1M" : "Unknown" }));
            
            response="CON Here is a list of suggested guarantors\n\n"
            
            for(var i=0;i<data.length;i++){
                response+=`[${data[i].id}] ${data[i].name}
           Loans: ${data[i].loans}
           Loan repayment rate: ${data[i].repayment}%  
           Guarantees ${data[i].guarantees} 
           Savings: ${data[i].savings < 400000 ? "below 400k" : 
                data[i].savings >= 400000 && data[i].savings < 1000000 ? "400k-1M" :
                data[i].savings >= 1000000 ? "above 1M" : "Unknown" }`
                response+="\n\n"
                
            }
            response+="\n\nEnter the member number to continue"
            

        }else if(/^1\*\d{4}\*2$/.test(input)){
            const snapshot = await admin.firestore()
            .collection('requests')
            .where('to.phone','==',phoneNumber)
            .where('status','==','review')
            .get();
            const data = snapshot.docs.map(doc => doc.data());
            response="CON Here are your guarantee requests\n"
            for(var i=0;i<data.length;i++){
                response+=`[${data[i].requester.id}] ${data[i].requester.name}
           Loan Amount: ${data[i].amount}
           Loan repayment rate: ${data[i].portfolio.repaymentRate}%  
           Guarantees ${data[i].portfolio.guarantees} 
           Savings: ${data[i].portfolio.savingsRange} 
           Date: ${data[i].date.toDate().toLocaleString()}`
                response+="\n\n"
                
            }
            response+="Enter member no to continue with approval/rejection"
        }else if(/^1\*\d{4}\*1\*\d{3}$/.test(input)){
            var memberNo = input.slice(-3)
            
            const snapshot = await admin.firestore().doc('members/'+memberNo).get();
            var userDoc = snapshot.data();
            if(userDoc!=undefined){
                response=`CON Request [${memberNo}] ${userDoc.name} to be your guarantor\n\n`
                response+=`Loans: ${userDoc.loans}\nLoan repayment rate: ${userDoc.repayment}%\nGuarantees ${userDoc.guarantees}`
                response+=`\nSavings: ${userDoc.savings < 400000 ? "below 400k" : 
                     userDoc.savings >= 400000 && userDoc.savings < 1000000 ? "400k-1M" :
                     userDoc.savings >= 1000000 ? "above 1M" : "Unknown" }`
                     response+="\n\n" 
                response+="Select 1 to confirm"
            }
            
            
        }else if(/^1\*\d{4}\*2\*\d{3}$/.test(input)){
            var memberNo = input.slice(-3)
            
            const query = await admin.firestore().collection('requests').where('requester.id','==',memberNo).get();
            var request = query.docs[0].data();
            if(request!=undefined){
                response=`CON [${request.requester.memberNo}] ${request.requester.name} has requested you to guarantee them for a loan\n\n`
                response+=`Loan repayment rate: ${request.portfolio.repaymentRate}%\nGuarantees ${request.portfolio.guarantees}`
                response+=`\nSavings: ${request.portfolio.savingsRange}\n\n`
                      
                response+="1. Accept\n2. Reject"
            }
        }
        else if(/^1\*\d{4}\*1\*\d{3}\*1$/.test(input)){
            try{
                var memberNo = input.slice(-5,-2)

                const query = await admin.firestore().collection('members').where('phone','==',phoneNumber).get();
                var senderDoc = query.docs[0].data();
    
                const snapshot = await admin.firestore().doc('members/'+memberNo).get();
                var receiverDoc = snapshot.data();
    
                var resourceId;
                await admin.firestore()
                
                .collection('requests')
                .add({
                    'amount':'10000000',
                    'to':{ 
                        'name':receiverDoc.name,
                        'id':snapshot.id,
                        'phone':receiverDoc.phone
                    },
                    'date':Timestamp.now(),
                    'requester': {
                        'name':senderDoc.name,
                        'id':query.docs[0].id
                    },
                    'status':'review',
                    'portfolio':{ 
                        'guarantees':senderDoc.guarantees,
                        'repaymentRate':senderDoc.repayment,
                        'savingsRange': senderDoc.savings < 400000 ? "below 400k" : 
                           currentUser.savings >= 400000 && currentUser.savings < 1000000 ? "400k-1M" :
                           currentUser.savings >= 1000000 ? "above 1M" : "Unknown"
            
                    },
                }).then(function(docRef) {
                    resourceId = docRef.id;
                    console.log("Document written with ID: ", docRef.id);
                })
    
                if(receiverDoc!=undefined&&senderDoc!=undefined&&resourceId!=undefined){
                    sendSMS(`Hello ${receiverDoc.name}, ${senderDoc.name} from Hauna Hela nini sacco is requesting you to become their guaranter. Visit this link to review their request.\n${liveUrl}${resourceId}\nor dial *384*001009#\n`,receiverDoc.phone)
                    response="END Request sent to the member"
                }else{
                    response="END Sorry, there was an error!"
                }
            }catch(e){
                response="END Sorry, there was an error!"
            }

           
            }else{
            response="END Please Select a valid option"
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




