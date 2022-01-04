var config = require('./dbconfig');
const sql = require('mssql');

async function addMomoRequest(dataMomo) {
    sql.connect(config).then(function () {
        var request = new sql.Request();
        request.query(
            "INSERT INTO UserMomoRequest (RequestType, RequestCode, UserID, Amount,ReceivedMoney,Status, PartnerErrorCode, Description, RefKey, RefSendKey,UpdateUser, RequestDate ,UpdateDate)VALUES" +
            "(1," + dataMomo.RequestCode + "," + dataMomo.UserId + "," + dataMomo.Amount + "," + dataMomo.ReceivedMoney + "," + dataMomo.Status + "," + dataMomo.PartnerErrorCode + ", " +
            dataMomo.Description + "," + dataMomo.RefKey + "," + dataMomo.RefSendKey + ",5,GETDATE(),GETDATE())"
        ).then(function (recordset) {
            console.log('Recordset: ' + recordset);
            console.log('Affected: ' + request.rowsAffected);
        }).catch(function (err) {
            console.log('Request error: ' + err);
        });
    }).catch(function (err) {
        if (err) {
            console.log('SQL Connection Error: ' + err);
        }
    });
}


//UserBankRequest
async function addBankRequest(dataBank) {
    sql.connect(config).then(function () {
        var request = new sql.Request();
        request.query(
            "INSERT INTO UserBankRequest (RequestType,RequestCode, UserID, Amount,ReceivedMoney,Status,PartnerStatus,PartnerErrorCode, Description,BankName,BankAccount,BankNumber, UpdateUser, RequestDate ,UpdateDate)VALUES" +
            "(1," + dataBank.RequestCode + "," + dataBank.UserId + "," + dataBank.Amount + "," + dataBank.ReceivedMoney + "," + dataBank.Status + ",'pending'," +
            dataBank.PartnerErrorCode + ", " + dataBank.Description + ",'" + dataBank.BankName + "',N'" + dataBank.BankAccount + "'," + dataBank.BankNumber + ",5 , GETDATE(),GETDATE())"
        ).then(function (recordset) {
            console.log('Recordset: ' + recordset);
            console.log('Affected: ' + request.rowsAffected);
        }).catch(function (err) {
            console.log('Request error: ' + err);
        });
    }).catch(function (err) {
        if (err) {
            console.log('SQL Connection Error: ' + err);
        }
    });
}

//get UserId
async function getUser(RequestCode, transactionId) {
    let dataUser;
    try {
        let pool = await sql.connect(config);
        let queryMomo = await pool.request()
            .input('input_RequestCoder', sql.BigInt, RequestCode)
            .input('input_transactionId', sql.BigInt, transactionId)
            .query("SELECT UserId from UserMomoRequest WHERE RequestCode=@input_RequestCoder AND Description=@input_transactionId");
        if (typeof (queryMomo.recordsets[0][0]) !== 'undefined') {
            dataUser = {
                UserId: queryMomo.recordsets[0][0].UserId,
                Table: 'UserMomoRequest'
            }
        } else {
            let queryBank = await pool.request()
                .input('input_RequestCoder', sql.BigInt, RequestCode)
                .input('input_transactionId', sql.BigInt, transactionId)
                .query("SELECT UserId from UserBankRequest WHERE RequestCode=@input_RequestCoder AND Description=@input_transactionId");
            dataUser = {
                UserId: queryBank.recordsets[0][0].UserId,
                Table: 'UserBankRequest'
            }

        }
        return dataUser;
    }
    catch (error) {
        console.log(error);
    }

}


//UserBankRequest
async function updateBalance(Amount, UserId) {

    try {
        let pool = await sql.connect(config);
        let request = await pool.request()
            .input('input_Amount', sql.BigInt, Amount)
            .input('input_UserId', sql.BigInt, UserId)
            .query(
                "UPDATE UserBalance SET Balance = Balance+@input_Amount WHERE UserId =@input_UserId"
            )


        return request.rowsAffected;
    }
    catch (error) {
        console.log(error);
    }

}



//Update Status history
async function updateStatus(TableName, UserId, RequestCode, TransactionId) {
    let stringSql;
    if (TableName == "UserMomoRequest") {
        stringSql = "UPDATE UserMomoRequest SET Status =1, UpdateDate= GETDATE() WHERE UserId= " + UserId + " AND RequestCode=" + RequestCode + " AND Description =" + TransactionId
    }
    if (TableName == "UserBankRequest") {
        stringSql = "UPDATE UserBankRequest SET Status =1, PartnerStatus= 'success', UpdateDate= GETDATE() WHERE UserId= " + UserId + " AND RequestCode=" + RequestCode + " AND Description =" + TransactionId

    }
    try {
        let pool = await sql.connect(config);
        let request = await pool.request()
            .query(stringSql)
        return request.rowsAffected;
    }
    catch (error) {
        console.log(error);
    }

}

//getListCard
async function getListCard() {
    try {
        let pool = await sql.connect(config);
        let queryCard = await pool.request()
            .query("SELECT ID,CardCode,CardName,CardValue,CardRate,Status,CreateUser,CreateDate, OperatorCode = CASE "
                + " WHEN LEFT(cardCode, 3) = 'MBP' THEN 'VMS' "
                + " ELSE LEFT(cardCode, 3) "
                + " END from [Cards] WHERE serviceId =1 and status=1");

        return queryCard.recordsets[0];
    }
    catch (error) {
        console.log(error);
    }

}



module.exports = {
    addMomoRequest: addMomoRequest,
    addBankRequest: addBankRequest,
    updateBalance: updateBalance,
    getUser: getUser,
    updateStatus: updateStatus,
    getListCard: getListCard
}