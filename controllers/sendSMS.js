const AfricasTalking = require('africastalking');

const africastalking = AfricasTalking({
    apiKey: '4a4f6ad794cb7209e0d6e02658c7d9351d280b8cd1b8685bcbdb386515ea3c51', 
    username: 'sakagariapp'
  });
  
  module.exports = async function sendSMS(message,receiver) {
      
    try {
    const result=await africastalking.SMS.send({
      to: receiver, 
      message: message,
      from: ''
    });
    console.log(result);
  } catch(ex) {
    console.error(ex);
  } 
  };