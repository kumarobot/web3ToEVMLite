const request = require('request-promise');
const EthereumTx = require('ethereumjs-tx');
var txDecoder = require('ethereum-tx-decoder');
var provider = require('web3-fake-provider');
var Web3 = require('web3');
var web3 = new Web3(new provider());
var crypto = require('crypto');



var tmHash = '0x' + 'BB44039942D208741413FC6CB8EE9A9CB0D1E33D4F8FD7403845396514C287C5';
//tHash to tbase64

async function tHtoeH(tHash){
//console.log('start');
var data64 = await tHtobase64(tHash);
const buffer = Buffer.from(data64, 'base64');
const rawtx = '0x' + buffer.toString('hex');
//console.log('rawtx:', rawtx);
var hash3 = web3.utils.sha3(rawtx);
console.log('Eth_Hash:', hash3);
//var hash256 = '0x' + crypto.createHash('sha256').update(buffer).digest('hex');
//console.log('TM_Hash:', hash256);
return hash3;
}

async function tHtobase64(tHash){

try {
        let result;
        let error;
        let options = {
            url: 'http://localhost:26657' + '/tx?hash=' + tHash ,

        };
        await request(options, (err, res, body) => {
            if (err) error = err;
            result = res;
        });

        if (error) throw error;
	//console.log('base64', JSON.parse(result.body));
        return JSON.parse(result.body).result.tx;
    } catch (err) {
        throw err;
    }


}

async function main(){
var h = await tHtoeH(tmHash);
//console.log('eHash', h);
}

main();
