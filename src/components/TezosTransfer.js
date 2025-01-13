import React, { useState, useEffect } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { NETWORK, RPC_URL, DEPOSIT_WALLET, WITHDRAW_WALLET, WITHDRAW_USDT_WALLET } from '../config';
import { InMemorySigner } from '@taquito/signer';


const USDT_CONTRACT = "KT1FmKiWBtqAoCCPd47yqvaR892uzztWmTkA";

const TezosTransfer = () => {
  const [wallet, setWallet] = useState(null);
  const [userAddress, setUserAddress] = useState('');
  const [tezos, setTezos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('1');
  const [balance, setBalance] = useState(0);
  

  useEffect(() => {
    const initTezos = () => {
      const tezosInstance = new TezosToolkit(RPC_URL);
      setTezos(tezosInstance);
    };

    initTezos();
  }, []);

  useEffect(() => {
    const updateBalance = async () => {
      if (tezos && userAddress) {
        try {
          const balanceMutez = await tezos.tz.getBalance(userAddress);
          console.log('Raw balance (Mutez):', balanceMutez.toString());
console.log('Converted balance (Tez):', balanceMutez.toNumber() / 1000000);
          setBalance(balanceMutez.toNumber() / 1000000); // Convert from mutez to tez
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      }
    };

    updateBalance();
  }, [tezos, userAddress]);

  const setupWallet = async () => {
    try {
      const wallet = new BeaconWallet({
        name: 'Tezos Transfer Demo',
        preferredNetwork: NETWORK
      });

      setWallet(wallet);
      return wallet;
    } catch (error) {
      console.error('Error setting up wallet:', error);
      setError('Failed to setup wallet');
      return null;
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');
      
      let activeWallet = wallet;
      if (!activeWallet) {
        activeWallet = await setupWallet();
      }

      await activeWallet.requestPermissions({
        network: { type: NETWORK }
      });

      const userAddress = await activeWallet.getPKH();
      setUserAddress(userAddress);
      
      if (tezos) {
        tezos.setWalletProvider(activeWallet);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      setLoading(true);
      if (wallet) {
        await wallet.clearActiveAccount();
        setUserAddress('');
        setBalance(0);
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      setError('Failed to disconnect wallet');
    } finally {
      setLoading(false);
    }
  };


 

  const handleDeposit = async () => {
    try {
      setLoading(true);
      setError('');

      if (!tezos || !userAddress) {
        throw new Error('Please connect your wallet first');
      }

      const mutezAmount = Math.floor(parseFloat(amount) * 1000000);
      if (isNaN(mutezAmount) || mutezAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (mutezAmount > balance * 1000000) {
        throw new Error('Insufficient balance');
      }
      
      const op = await tezos.wallet.transfer({
        to: DEPOSIT_WALLET,
        amount: mutezAmount,
        mutez: true,
      }).send();

      alert('Transaction sent! Please wait for confirmation...');
      
      await op.confirmation();
      const opHash = op.opHash;
      
      alert('Deposit successful! Transaction ID: ' + op.opHash);
      
      const response = await fetch('http://localhost:8888/api/demo/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId:"123456789",
          fromAddress:userAddress,
          toAddress: DEPOSIT_WALLET,
          amount: mutezAmount / 1000000, // Chuyển đổi về TEZ
          currency: "TEZOS",
          opHash: opHash,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Deposit confirmation failed');
      }
  
      alert('Deposit confirmed by backend!');


      // Update balance after successful transaction
      const newBalance = await tezos.tz.getBalance(userAddress);
      setBalance(newBalance.toNumber() / 1000000);
      
    } catch (error) {
      console.error('Error during deposit:', error);
      setError(error.message || 'Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };



const handleWithdraw = async () => {
    try {
      setLoading(true);
      setError('');
  
      if (!tezos || !userAddress) {
        throw new Error('Please connect your wallet first');
      }
  
      const mutezAmount = Math.floor(parseFloat(amount) * 1000000);
      console.log('Amount in mutez to transfer:', mutezAmount);
  
      if (isNaN(mutezAmount) || mutezAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }
  
      // Configure signer for WITHDRAW_WALLET
      const withdrawWalletPrivateKey = 'edskRdZYqohFEMpVTb14CAYcpX2d7YyuhJQ5NSZXo1EuSyFiR57LR6k9WVd8ryJqyiUA2Z6PK8oumEp3ogUcY9zqRFJh8XztDh'; // Replace with the actual private key of WITHDRAW_WALLET
      const tezosForWithdraw = new TezosToolkit(tezos.rpc);
      tezosForWithdraw.setProvider({
        signer: await InMemorySigner.fromSecretKey(withdrawWalletPrivateKey),
      });
  
      // Check the balance of WITHDRAW_WALLET
      const withdrawWalletBalance = await tezosForWithdraw.tz.getBalance(WITHDRAW_WALLET);
      console.log('Withdraw Wallet Balance:', withdrawWalletBalance.toNumber() / 1000000);
  
      if (mutezAmount > withdrawWalletBalance.toNumber()) {
        throw new Error('Insufficient balance in withdrawal wallet');
      }
  
      // Execute the transfer
      const op = await tezosForWithdraw.contract.transfer({
        to: userAddress,
        amount: mutezAmount / 1000000, // Amount in tez
      });
  
      alert('Transaction sent! Please wait for confirmation...');
      await op.confirmation();
      const opHash = op.hash; 
  
      alert('Withdrawal successful! Transaction ID: ' + op.hash);
  
      const response = await fetch('http://localhost:8888/api/demo/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId:"123456789",
          fromAddress:WITHDRAW_WALLET,
          toAddress: userAddress,
          amount: mutezAmount / 1000000, // Chuyển đổi về TEZ
          currency: "TEZOS",
          opHash: opHash,
        }),
      });
      
  
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Withdrawal confirmation failed');
      }
      // Optionally update the balances
      const updatedWithdrawWalletBalance = await tezosForWithdraw.tz.getBalance(WITHDRAW_WALLET);
      console.log('Withdraw Wallet Balance After Transfer:', updatedWithdrawWalletBalance.toNumber() / 1000000);
  
      const userBalance = await tezos.tz.getBalance(userAddress);
      setBalance(userBalance.toNumber() / 1000000);
    } catch (error) {
      console.error('Error during withdrawal:', error);
      setError(error.message || 'Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };


  const handleUSDTWithdraw = async () => {
    try {
      setLoading(true);
      setError('');
  
      if (!tezos || !userAddress) {
        throw new Error('Please connect your wallet first');
      }
  
      const tokenAmount = Math.floor(parseFloat(amount) * 1000000); // Convert to USDT decimals
      console.log('Amount in USDT to transfer:', tokenAmount);
  
      if (isNaN(tokenAmount) || tokenAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Cấu hình signer cho WITHDRAW_WALLET giống hàm withdraw
      const withdrawWalletPrivateKey = 'edskRmyHX8446mkwE4vvaQLNtGY2mTSSLhDHPGDsZuDrVmQXpg2RJNX5YkJgXTpKV2zBCWJaoQwaRDRXR7tJLktTUqNVh8pieS'; 
      const tezosForWithdraw = new TezosToolkit(tezos.rpc);
      tezosForWithdraw.setProvider({
        signer: await InMemorySigner.fromSecretKey(withdrawWalletPrivateKey),
      });

      // Lấy contract USDT với signer của ví withdraw
      const contract = await tezosForWithdraw.contract.at(USDT_CONTRACT);
      
      // Transfer params cho FA2
      const transferParams = [{
        from_: WITHDRAW_USDT_WALLET, // Gửi từ WITHDRAW_WALLET
        txs: [{
          to_: userAddress,     // Đến ví user
          token_id: 0,
          amount: tokenAmount
        }]
      }];

      const op = await contract.methods.transfer(transferParams).send();

      alert('USDT transfer sent! Please wait for confirmation...');
      await op.confirmation();

      alert('USDT withdrawal successful! Transaction ID: ' + op.hash);

      // Call API để update backend
      const response = await fetch('http://localhost:8888/api/demo/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: "123456789",
          fromAddress: WITHDRAW_WALLET,
          toAddress: userAddress,
          amount: tokenAmount / 1000000,
          currency: "USDT",
          opHash: op.hash,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Withdrawal confirmation failed');
      }

    } catch (error) {
      console.error('Error during USDT withdrawal:', error);
      setError(error.message || 'Failed to process USDT withdrawal');
    } finally {
      setLoading(false);
    }
};
  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold text-center">Tezos Transfer Demo</h2>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {!userAddress ? (
        <button
          onClick={connectWallet}
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg space-y-2 border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Wallet Address:</span>
              <span className="font-medium">{userAddress.slice(0, 6)}...{userAddress.slice(-4)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Balance:</span>
              <div className="flex items-center">
                <span className="font-bold text-lg text-blue-600">{balance.toFixed(6)}</span>
                <span className="ml-1 text-blue-600">ꜩ</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Amount (TEZ)
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.000001"
                step="0.1"
                className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2"
              />
            </label>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Deposit'}
            </button>
            
            <button
              onClick={handleWithdraw}
              disabled={loading}
              className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Withdraw'}
            </button>

            <button
              onClick={handleUSDTWithdraw}
              disabled={loading}
              className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Withdraw USDT'}
            </button>
            
            <button
              onClick={disconnectWallet}
              disabled={loading}
              className="w-full bg-gray-500 text-white p-2 rounded hover:bg-gray-600 disabled:bg-gray-400"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TezosTransfer;