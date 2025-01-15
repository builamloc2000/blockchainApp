import React, { useState, useEffect } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { NetworkType } from '@airgap/beacon-sdk';
import { NETWORK, RPC_URL, DEPOSIT_WALLET } from '../config';

import { BlockchainApiService } from '../services/blockchain.api.service';


//const USDT_CONTRACT = "KT1FmKiWBtqAoCCPd47yqvaR892uzztWmTkA";
const blockchainService = new BlockchainApiService();

const TezosTransfer = () => {
  const [wallet, setWallet] = useState<BeaconWallet | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [tezos, setTezos] = useState<TezosToolkit | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [amount, setAmount] = useState<string>('1');
  const [balance, setBalance] = useState<number>(0);
  const [balanceUSDT, setBalanceUSDT] = useState<number>(0);
  

  useEffect(() => {
    const initTezos = () => {
      const tezosInstance = new TezosToolkit(RPC_URL);
      setTezos(tezosInstance);
    };

    initTezos();
  }, []);


 // Update balance using blockchain service
 const updateBalance = async () => {
  if (userAddress) {
    try {
      const result = await blockchainService.getBalance(userAddress);
      console.log("Balance result:", result); // For debugging
      setBalance(Number(result));
    } catch (error) {
      console.error('Error fetching balance:', error);
      setError('Failed to fetch balance');
    }
  }
};

useEffect(() => {
  updateBalance();
}, [userAddress]);

const updateBalanceUSDT = async () => {
  if (userAddress) {
    try {
      const result = await blockchainService.getUSDTBalance(userAddress);
      console.log("Balance result USDT:", result); // For debugging
      setBalanceUSDT(Number(result));
    } catch (error) {
      console.error('Error fetching balance USDT:', error);
      setError('Failed to fetch balance USDT');
    }
  }
};

useEffect(() => {
  updateBalanceUSDT();
}, [userAddress]);





  const setupWallet = async () => {
    try {
      const wallet = new BeaconWallet({
        name: 'Tezos Transfer Demo',
        preferredNetwork: NETWORK as NetworkType
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

      if (!activeWallet) {
        throw new Error('Failed to initialize wallet');
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
  
      if (!userAddress || !tezos) {
        throw new Error('Please connect your wallet first');
      }
  
      const mutezAmount = Math.floor(parseFloat(amount) * 1000000);
      if (isNaN(mutezAmount) || mutezAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }
  
      if (mutezAmount > balance * 1000000) {
        throw new Error('Insufficient balance');
      }
  
      // User signs and sends transaction
      const op = await tezos.wallet.transfer({
        to: DEPOSIT_WALLET,
        amount: mutezAmount,
        mutez: true,
      }).send();
  
      alert('Transaction sent! Please wait for confirmation...');
      await op.confirmation();
      alert('Deposit successful! Transaction ID: ' + op.opHash);
  
      // Update balance through service after successful deposit
      await updateBalance();
  
    } catch (error: any) {
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

      if (!userAddress) {
        throw new Error('Please connect your wallet first');
      }

      const mutezAmount = Math.floor(parseFloat(amount) * 1000000);
      
      const result = await blockchainService.withdrawTez({
        toAddress: userAddress,
        amount: mutezAmount
      });

      if (result.success) {
        alert('Withdrawal successful! Transaction ID: ' + result.opHash);
        await updateBalance();
      }
    } catch (error) {
      console.error('Error during withdraw:', error);
    
      if (error instanceof Error) {
        setError(error.message || 'Failed to process withdraw');
      } else {
        setError('Failed to process withdraw');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleUSDTWithdraw = async () => {
    try {
      setLoading(true);
      setError('');

      if (!userAddress) {
        throw new Error('Please connect your wallet first');
      }

      const tokenAmount = Math.floor(parseFloat(amount) * 1000000);
      
      const result = await blockchainService.withdrawUSDT({
        toAddress: userAddress,
        amount: tokenAmount
      });

      if (result.success) {
        alert('USDT withdrawal successful! Transaction ID: ' + result.opHash);
        await updateBalanceUSDT();
      }
    }catch (error) {
      console.error('Error during USDT withdraw:', error);
    
      if (error instanceof Error) {
        setError(error.message || 'Failed to process USDT withdraw');
      } else {
        setError('Failed to process USDT withdraw');
      }
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
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Balance USDT:</span>
              <div className="flex items-center">
                <span className="font-bold text-lg text-blue-600">{balanceUSDT.toFixed(6)}</span>
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