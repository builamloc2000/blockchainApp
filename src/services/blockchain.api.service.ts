import { TransferParams, TransferResult, BalanceResult } from '../types/blockchain.types';

export class BlockchainApiService {
  private baseUrl = 'http://localhost:3001/blockchain';

  async getBalance(address: string): Promise<BalanceResult> {
    return this.sendRequest(`/balance/${address}`, 'GET');
  }

  async getUSDTBalance(address: string): Promise<BalanceResult> {
    return this.sendRequest(`/balanceUSDT/${address}`, 'GET');
  }

  async depositTez(params: TransferParams): Promise<TransferResult> {
    return this.sendRequest('/deposit-tez', 'POST', params);
  }

  async withdrawTez(params: TransferParams): Promise<TransferResult> {
    return this.sendRequest('/withdraw-tez', 'POST', params);
  }

  async withdrawUSDT(params: TransferParams): Promise<TransferResult> {
    return this.sendRequest('/withdraw-usdt', 'POST', params);
  }

  private async sendRequest(endpoint: string, method: string, body?: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      throw new Error(`API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}