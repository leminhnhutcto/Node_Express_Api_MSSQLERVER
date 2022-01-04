const Db = require('./dboperations');
var https = require('https');
const md5 = require('md5');
const axios = require('axios');
const dboperations = require('./dboperations');
const FormData = require('form-data');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// app.use(cors({
//    credentials: true,
//    origin: 'http://localhost:7456',
//    'Access-Control-Allow-Origin': 'http://localhost:7456',
// }));

// app.use(cors({ credentials: true, origin: 'http://localhost:7456', 'Access-Control-Allow-Origin': '*' }));
app.use(function (req, res, next) {

   // Website you wish to allow to connect
   res.setHeader('Access-Control-Allow-Origin', 'http://localhost:7456');

   // Request methods you wish to allow
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

   // Request headers you wish to allow
   res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

   // Set to true if you need the website to include cookies in the requests sent
   // to the API (e.g. in case you use sessions)
   res.setHeader('Access-Control-Allow-Credentials', true);

   // Pass to next layer of middleware
   next();
});

//Environment URL

const urlApi247 = "https://api.pay247.pro/api/SendBank";
const apiKey247 = '135e213397f924a8862ce935c478dc5a2d55a4636392e3dbaefed46cd34d688b';


//url nap AUTO (Bank|MoMo)
app.route('/chargeRegister').post(async (req, res) => {
   //CongThuc sign = md5(userId:amount:Momo:transaction_id)
   console.log('chargeRegister', req.body);
   const userId = req.body.userId;
   const amount = req.body.amount;
   const type = req.body.type;
   // const transaction_id = req.body.transaction_id;
   const transaction_id = new Date().getTime();

   // const sign = req.body.sign;
   // const signSv = md5(userId + ":" + amount + ":" + type + ":" + transaction_id);
   const signature = md5(apiKey247 + "|" + type + "|" + amount + "|" + transaction_id);//signature of 247
   //create dataForm
   let data = new FormData();

   data.append('apikey', apiKey247);
   data.append('amount', amount);
   data.append('type', type);
   data.append('signature', signature);
   data.append('transaction_id', transaction_id);
   let dataResponse;
   //Check signature
   // if (sign === signSv) {
   //Signature OK after check type (database store bank diff momo)
   //Post data to api247 after store database
   try {
      const dataPromise = await axios.post(urlApi247, data, { headers: data.getHeaders() })
      if (dataPromise.status == 200 && dataPromise.data.status == 'success') {
         dataResponse = dataPromise.data;
         console.log('dataResponse', dataResponse);
         //type ==momo
         if (type.toUpperCase() === 'MOMO') {
            //create dataMomo
            let dataMomo = {
               RequestCode: dataResponse.comment,
               UserId: userId,
               Amount: amount,
               ReceivedMoney: amount,
               Status: 0,
               PartnerErrorCode: 200,
               Description: transaction_id,
               RefKey: dataResponse.comment,
               RefSendKey: dataResponse.comment,
               PartnerID: 1,

            }
            dboperations.addMomoRequest(dataMomo).then(result => {
               var dataSend = {
                  ResponseCode: 1,
                  Orders: {
                     Message: dataResponse.comment,
                     WalletAccountName: dataResponse.name,
                     WalletAccount: dataResponse.phone,
                     Rate: 1,
                     List: amount
                  }
               };
               res.send(dataSend);
            })
         }

         //type ==bank
         else if (type.toUpperCase() === 'BANK') {
            //create dataBank
            let dataBank = {
               RequestCode: dataResponse.comment,
               UserId: userId,
               Amount: amount,
               ReceivedMoney: amount,
               Status: 0,
               PartnerStatus: 'pending',
               PartnerErrorCode: 200,
               BankName: dataResponse.type_bank,
               BankAccount: dataResponse.name,
               BankNumber: dataResponse.stk,
               Description: transaction_id,
            }

            dboperations.addBankRequest(dataBank).then(result => {
               const dataSend = {
                  "ResponseCode": 1,
                  "Orders": {
                     "Amount": amount, //tien VND
                     "Code": dataResponse.comment,
                     "Timeout": 120,
                     "Remain": 0,
                     "AmountReceived": amount, //tien Game
                     "Banks": {
                        "BankName": dataResponse.type_bank,
                        "MasterBankAccount": dataResponse.name,
                        "MasterBankName": dataResponse.stk
                     }
                  }
               }
               res.send(dataSend);
            })


         } else {
            res.send('error1');
         }

      }
   } catch (e) {
      res.send('error', e);
   }

   // } else {
   //    res.send('error2');
   // }



})

// callback response from api247 (header JSON)
app.route('/resRechagre').post((request, response) => {
   console.log('response247', request.body);
   //callback
   if (request.body.status == 1) {
      dboperations.getUser(request.body.comment, request.body.transaction_id).then(result => {
         if (result.UserId > 0) {
            dboperations.updateBalance(request.body.amount, result.UserId).then(recordSet => {
               if (recordSet[0] > 0) {
                  dboperations.updateStatus(result.Table, result.UserId, request.body.comment, request.body.transaction_id).then(recordSet => { })
               }
            })
            response.send('OK');
         } else {
            response.send('error');

         }
      })
   } else {
      response.send('error');
   }

})

//----------------------------------------------------------------------------------------
//For Card

app.route('/cardRegister').post(async (req, res) => {
   const apikeyCard = 'd8ddd09515a0064cfc9d56ba25a85f41';
   const urlCard247 = 'https://api.pay247.pro/api/ApiNapCard';



   let dataCard = {
      telco: req.body.nhamang,
      code: req.body.mathe,
      serial: req.body.serial,
      amount: req.body.menhgia,
      note: new Date().getTime(),
      sign: md5(apikeyCard + req.body.mathe + req.body.serial),
      apikey: apikeyCard
   }
   console.log('dataCard', dataCard);
   const dataPromise = await axios.post(urlCard247, dataCard);
   if (dataPromise.status == 200) {
      console.log('dataPromise', dataPromise.data);

   }

   console.log(req.body);
   res.send('OK');

})

app.route('/resRechagreCard').post((request, response) => {
   console.log('responseCard247', request.body);
   //callback
   if (request.body.status == 1) {
      //thanh cong update thang where serial and mathe

   } else {
      response.send('error');
   }
})


app.route('/GetListCard').get((request, res) => {
   let dataResponse;
   dboperations.getListCard('G63').then(result => {
      dataResponse={
         ResponseCode:1,
         list: result
      }
      res.send(dataResponse);
   });

   
})





const port = process.env.PORT || 8090;
app.listen(port);
console.log('Order API is runnning at ' + port);



