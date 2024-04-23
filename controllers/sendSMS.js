const AfricasTalking = require('africastalking');

const africastalking = AfricasTalking({
    apiKey: process.env.AT_API_KEY, 
    username: 'guarantor'
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