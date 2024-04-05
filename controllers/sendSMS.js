const AfricasTalking = require('africastalking');

const africastalking = AfricasTalking({
    apiKey: 'de55acffcb839721e773c240c8f84b5ebc5e392ecfd771b087421edf811e57fe', 
    username: 'hhn'
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