const express = require('express');
const { Web3 } = require('web3');
const dotenv = require('dotenv');
const router = express.Router();
dotenv.config();

const INFURA_URL = process.env.INFURA_URL;
const web3 = new Web3(new Web3.providers.HttpProvider(INFURA_URL));

const contractAddress = process.env.CONTRACT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

// Create account from private key
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const fromAddress = account.address;

// Add account to wallet
web3.eth.accounts.wallet.add(account);

const contractABI = [
    {
        "constant": false,
        "inputs": [
            { "internalType": "string", "name": "_name", "type": "string" },
            { "internalType": "uint256", "name": "_age", "type": "uint256" },
            { "internalType": "string", "name": "_email", "type": "string" }
        ],
        "name": "addUser",
        "outputs": [],
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "internalType": "string", "name": "name", "type": "string" },
            { "internalType": "uint256", "name": "age", "type": "uint256" },
            { "internalType": "string", "name": "email", "type": "string" }
        ],
        "name": "UserAdded",
        "type": "event"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "getAllUserNames",
        "outputs": [
            { "internalType": "string[]", "name": "", "type": "string[]" }
        ],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            { "internalType": "string", "name": "_name", "type": "string" }
        ],
        "name": "getUserByName",
        "outputs": [
            { "internalType": "string", "name": "name", "type": "string" },
            { "internalType": "uint256", "name": "age", "type": "uint256" },
            { "internalType": "string", "name": "email", "type": "string" }
        ],
        "type": "function"
    }
];

// Create Contract Instance
const contract = new web3.eth.Contract(contractABI, contractAddress);

router.post('/addUser', async (req, res) => {
    const { name, age, email } = req.body;

    try {
        // Get the current nonce for the from address
        const nonce = await web3.eth.getTransactionCount(fromAddress);

        // Get current gas price
        const gasPrice = await web3.eth.getGasPrice();

        // Prepare the transaction
        const tx = {
            from: fromAddress,
            to: contractAddress,
            gas: 3000000,
            gasPrice: gasPrice,
            nonce: nonce,
            data: contract.methods.addUser(name, age, email).encodeABI(),
        };

        // Estimate gas
        const estimatedGas = await web3.eth.estimateGas(tx);
        tx.gas = estimatedGas;

        // Sign and send the transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.json({
            success: true,
            message: 'User added successfully',
            transactionHash: receipt.transactionHash,
            from: fromAddress
        });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add user',
            error: error.message,
            from: fromAddress
        });
    }
});

router.get('/getAllUserNames', async (req, res) => {
    try {
        const userNames = await contract.methods.getAllUserNames().call();
        res.json({ success: true, userNames });
    } catch (error) {
        console.error('Error fetching user names:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch user names', error: error.message });
    }
});

router.get('/getUserByName/:name', async (req, res) => {
    const { name } = req.params;

    try {
        const user = await contract.methods.getUserByName(name).call();
        res.json({
            success: true,
            user: {
                name: user.name,
                age: Number(user.age),
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Error fetching user by name:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch user by name', error: error.message });
    }
});

router.get('/listenUserAdded', async (req, res) => {
    try {
        contract.events.UserAdded({}, (error, event) => {
            if (error) {
                console.error('Error in UserAdded event listener:', error.message);
            } else {
                console.log('UserAdded event:', event.returnValues);
            }
        });

        res.json({ success: true, message: 'Listening for UserAdded events' });
    } catch (error) {
        console.error('Error setting up event listener:', error.message);
        res.status(500).json({ success: false, message: 'Failed to listen to events', error: error.message });
    }
});

module.exports = router;
