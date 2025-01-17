const express = require('express')
const bodyParser = require('body-parser')
const jayson = require('jayson')
const app = express()
const env = require('./env');
const request = require('request');
const moment = require('moment');
const EthereumTx = require('ethereumjs-tx')
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
var txDecoder = require('ethereum-tx-decoder');

var evmliteAPI = 'http://' + env.apiHost + ':' + env.evmlitePort;
var tendermintAPI = 'http://' + env.apiHost + ':' + env.tendermintPort;

const server = jayson.server({
  net_listening: (args, callback) => {
    // web3.eth.net.isListening
    console.log("Get /isListening");
    request.get(evmliteAPI + '/info', (err, res) => {
      if (err) {
        console.log(err);
        callback({code: 404, message: err.code + " on tendermint node"});
      } else {
        var body = JSON.parse(res.body);
        //console.log(body);
        if (body.type === 'tendermint') {
          callback(null, true);
        } else {
          callback({code: 404, message: "tendermint node not found"})
        }
      }
    });
  },
  eth_coinbase: (args, callback) => {
    // web3.eth.getCoinbase
    console.log("GET /getCoinbase");
    request.get(evmliteAPI + '/accounts', (err, res) => {
      if (err) {
        console.log(err);
      } else {
        var body = JSON.parse(res.body);
        var coinbase = body.accounts[0].address
        callback(null, coinbase);
      }
    });
  },
  eth_blockNumber: (args, callback) =>  {
    // web3.eth.getBlockNumber
    console.log("GET /getBlockNumber");
    request.get(tendermintAPI + '/block?height=', (err, res) => {
      if (err) {
        console.log(err);
      } else {
        var body = JSON.parse(res.body);
        var height = body.result.block.header.height;
        //console.log(height);
        callback(null, height);
      }
    });
  },
  eth_getBlockByNumber: (args, callback) => {
    // web3.eth.getBlock
    console.log("POST /getBlock");
    console.log("block: " + args[0]);
    var height = parseInt(args[0]);
    request.get(tendermintAPI + '/block?height=' + height, (err, res) => {
      if (err) {
        console.log(err);
      } else {
        var body = JSON.parse(res.body);
        var tendermintblock = body.result.block;
        var timestamp = moment(tendermintblock.header.time).unix();
        var txs = [];
        for (let val of tendermintblock.data.txs) {
          let buffer = Buffer.from(val, 'base64');
          let rawtx = '0x' + buffer.toString('hex');
          let decodedTx = txDecoder.decodeTx(rawtx);
          let ethereumTx = new EthereumTx(decodedTx);
          let txHash = ethereumTx.hash();
          txs.push('0x' + txHash.toString('hex'));
        }
        var returnBlock = {
          "number": Number(height).toString(16),
          "timestamp": timestamp.toString(16),
          "transactions": txs,
        }
        callback(null, returnBlock);
      }
    });
  },
  eth_gasPrice: (args, callback) => {
    // web3.eth.getPrice
    console.log("POST /getPrice");
    callback(null, 0);
  },
  eth_getTransactionReceipt: (args, callback) => {
    // web3.eth.getTransactionReceipt
    console.log("POST /getTransactionReceipt");
    console.log("tx: " + args[0]);
    request.get(evmliteAPI + '/tx/' + args[0], (err, res) => {
      if (err) {
        console.log(err);
      } else {
        try {
          var body = JSON.parse(res.body);
          callback(null, body);
        } catch (err) {
          console.log(err);
          callback(null, null);
        }
      }
    });
  },
  eth_call: (args, callback) => {
    console.log("POST /call");
    let data = JSON.stringify(args[0], (key, value) => {
      if (key === 'value' || key === 'gasPrice' || key === 'gas') {
        return parseInt(value, 16);
      }
      return value;
    });
    console.log("transactionObject: " + data);
    request.post({
      url: evmliteAPI + '/call',
      body: data,
    }, (err, res) => {
      if (err) {
        console.log(err);
      } else {
        try {
          var body = JSON.parse(res.body);
          callback(null, body.data);
        } catch {
          callback(null, res.body);
        }
      }
    });
  },
  eth_sendTransaction: (args, callback) => {
    // web3.eth.sendTransaction
    console.log("POST /sendTransaction");
    let data = JSON.stringify(args[0], (key, value) => {
      if (key === 'value' || key === 'gasPrice' || key === 'gas') {
        return parseInt(value, 16);
      }
      return value;
    });
    console.log("transactionObject: " + data);
    request.post({
      url: evmliteAPI + '/tx',
      body: data,
    }, (err, res) => {
      if (err) {
        console.log(err);
      } else {
        try {
          var txHash = JSON.parse(res.body.txHash);
          callback(null, txHash);
        } catch {
          callback(null, res.body);
        }
      }
    });
  },
  eth_sendRawTransaction: (args, callback) => {
    // web3.eth.sendSignedTransaction
    console.log("POST /sendSignedTransaction");
    console.log("signedTx: " + args[0]);
    request.post({
      url: evmliteAPI + '/rawtx',
      body: args[0],
    }, (err, res) => {
      if (err) {
        console.log(err);
      } else {
        try {
          var txHash = JSON.parse(res.body.txHash);
          callback(null, txHash);
        } catch {
          callback(null, res.body);
        }
      }
    });
  },
  eth_getTransactionCount: (args, callback) => {
    // web3.eth.getTransactionCount
    console.log("POST /getTransactionCount");
    console.log("address: " + args[0]);
    request.get(evmliteAPI + '/account/' + args[0], (err, res) => {
      if (err) {
        console.log(err);
      } else {
        var body = JSON.parse(res.body);
        callback(null, body.nonce);
      }
    });
  },
  eth_getTransactionByHash: (args, callback) =>{
    //web3.eth.getTransaction
    console.log("POST /getTransaction");
    console.log("txHash: " + args[0]);
    request.get(tendermintAPI + '/tx?hash=' + args[0], (err, res) => {
    if (err){
      console.log(err);
    } else {
      try{
      var body = JSON.parse(res.body);
      request.get(tendermintAPI + '/block?height=' + body.result.height, (err, res) => {
      if (err){
        console.log(err)
      } else {
	try{
        var blockResult = JSON.parse(res.body).result.block_meta.block_id;
        var data64 = body.result.tx;
        const buffer = Buffer.from(data64, 'base64');
        const rawtx = '0x' + buffer.toString('hex');
        //console.log('rawtx:', rawtx);
        var decodedTx = txDecoder.decodeTx(rawtx);
        //console.log('transaction object: ');
        //console.log(decodedTx);
        var nonce = parseInt(decodedTx.nonce, 16) || 0;
        var from = web3.eth.accounts.recoverTransaction(rawtx);
        var to = decodedTx.to;
        var value = decodedTx.value.toString(16);
        var gas = parseInt(decodedTx.gasLimit, 16) || 0;
        var gasPrice = decodedTx.gasPrice.toString(16);
        var input = decodedTx.data;
        var getResult = {
        hash: body.result.hash,
        nonce: nonce,
        blockHash: blockResult.hash,
        blockNumber: body.result.height,
        transactionIndex: body.result.index,
        from: from,
        to: to,
        value: value,
        gas: gas,
        gasPrice: gasPrice,
        input: input
        }

	callback(null, getResult);
        } catch{
	  console.log(err);
	  callback(null, res.body);
	}
    }
    
    })
    } catch (err) {
      console.log(err)
      callback(null, res.body);
    }
    }
    })






  }
  // , {
  //   router: (method, params) => {
  //     console.log("method:")
  //     console.log(method)
  //     console.log("params:")
  //     console.log(params)
  //   }
  // }
});

//tmHash to ethHash

  
// parse request body before the jayson middleware
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(server.middleware());

app.listen(8545, () => {
  console.log('tendermint node is listening on port ' + env.tendermintPort);
  console.log('EVM_lite is listening on port '+ env.evmlitePort)
  console.log('RPC server is listening on port 8545');
});
