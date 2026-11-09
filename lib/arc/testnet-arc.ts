import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  getAddress,
  http,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet } from 'viem/chains';
import { validateArcRecipient } from './address';
import type { ArcSendParams, ArcService, ArcTransferResult } from './arc-service';
import {
  ARC_MIN_MAX_FEE_PER_GAS,
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_RPC_URL,
  ARC_USDC_ADDRESS,
  arcTestnetTxUrl,
} from './constants';
import { nativeGasUnitsToUsdcBaseUnits, validateUsdcTransferAmount } from './units';

export interface ArcChainPort {
  /** ERC-20 balanceOf only. Do not also read the native gas balance for display. */
  balanceOf(address: string): Promise<bigint>;
  estimateTransferFeeBaseUnits(from: string, to: string, amount: bigint): Promise<bigint>;
  transfer(params: {
    privateKey: `0x${string}`;
    to: string;
    amount: bigint;
  }): Promise<{ hash: string; feeNativeUnits: bigint; status: 'success' | 'reverted' }>;
}

/**
 * Testnet Arc service. The number returned by getUsdcBalance is the ERC-20
 * balance (6 decimals). Gas is paid from that same USDC, so a later balanceOf
 * already includes the fee. Callers must not subtract the fee again.
 */
export class TestnetArcService implements ArcService {
  readonly mode = 'testnet' as const;

  constructor(private readonly chain: ArcChainPort) {}

  async getUsdcBalance(address: string): Promise<bigint> {
    return this.chain.balanceOf(address);
  }

  async estimateSendFee(params: {
    fromAddress: string;
    toAddress: string;
    amountBaseUnits: bigint;
  }): Promise<bigint> {
    return this.chain.estimateTransferFeeBaseUnits(
      params.fromAddress,
      params.toAddress,
      params.amountBaseUnits
    );
  }

  async sendUsdc(params: ArcSendParams): Promise<ArcTransferResult> {
    const recipientError = validateArcRecipient(params.toAddress, params.fromAddress);
    if (recipientError) return { success: false, error: recipientError };
    if (params.memo && params.memo.length > 200) {
      return { success: false, error: 'Memo must be 200 characters or fewer.' };
    }
    const amountError = validateUsdcTransferAmount(params.amountBaseUnits);
    if (amountError) return { success: false, error: amountError };
    if (!params.privateKey || !params.privateKey.startsWith('0x')) {
      return { success: false, error: 'This testnet wallet cannot sign yet.' };
    }

    const balance = await this.chain.balanceOf(params.fromAddress);
    const estimatedFee = await this.chain.estimateTransferFeeBaseUnits(
      params.fromAddress,
      params.toAddress,
      params.amountBaseUnits
    );
    if (balance < params.amountBaseUnits + estimatedFee) {
      return { success: false, error: 'Insufficient USDC balance.' };
    }

    const privateKey = params.privateKey as `0x${string}`;
    const sent = await this.chain.transfer({
      privateKey,
      to: params.toAddress,
      amount: params.amountBaseUnits,
    });
    // One balance: re-read the token, which already nets out gas.
    const after = await this.chain.balanceOf(params.fromAddress);
    const feeBaseUnits = nativeGasUnitsToUsdcBaseUnits(sent.feeNativeUnits);

    if (sent.status === 'reverted') {
      return {
        success: false,
        txHash: sent.hash,
        feeBaseUnits,
        balanceBaseUnits: after,
        error: 'Arc rejected the transfer. Blocklisted accounts still pay gas. Check the explorer.',
      };
    }

    return {
      success: true,
      txHash: sent.hash,
      feeBaseUnits,
      balanceBaseUnits: after,
    };
  }

  async receiveUsdc(
    address?: string,
    amountBaseUnits?: bigint,
    memo?: string
  ): Promise<ArcTransferResult> {
    void address;
    void amountBaseUnits;
    void memo;
    return {
      success: false,
      error: 'On Arc testnet, USDC arrives by transfer. Use the Circle faucet or send to your address.',
    };
  }

  explorerTxUrl(txHash: string): string | null {
    return arcTestnetTxUrl(txHash);
  }
}

export function createViemArcChain(options?: {
  rpcUrl?: string;
  usdcAddress?: string;
}): ArcChainPort {
  if (arcTestnet.id !== ARC_TESTNET_CHAIN_ID) {
    throw new Error(
      `viem arcTestnet id ${arcTestnet.id} does not match the docs.arc.io chain id ${ARC_TESTNET_CHAIN_ID}.`
    );
  }

  const rpcUrl = options?.rpcUrl || process.env.ARC_RPC_URL || ARC_TESTNET_RPC_URL;
  const usdcAddress = getAddress(options?.usdcAddress || process.env.ARC_USDC_ADDRESS || ARC_USDC_ADDRESS);
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl),
  });

  return {
    async balanceOf(address: string) {
      return publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [getAddress(address)],
      });
    },
    async estimateTransferFeeBaseUnits(from: string, to: string, amount: bigint) {
      try {
        const gas = await publicClient.estimateContractGas({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [getAddress(to), amount],
          account: getAddress(from),
        });
        const maxFee = await suggestedMaxFee(publicClient);
        return nativeGasUnitsToUsdcBaseUnits(gas * maxFee);
      } catch {
        return 50_000n;
      }
    },
    async transfer({ privateKey, to, amount }) {
      const account = privateKeyToAccount(privateKey);
      const walletClient = createWalletClient({
        account,
        chain: arcTestnet,
        transport: http(rpcUrl),
      });
      const maxFeePerGas = await suggestedMaxFee(publicClient);
      const hash = await walletClient.writeContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [getAddress(to) as Address, amount],
        maxFeePerGas,
        maxPriorityFeePerGas: maxFeePerGas,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as Hash });
      return {
        hash,
        feeNativeUnits: receipt.gasUsed * receipt.effectiveGasPrice,
        status: receipt.status,
      };
    },
  };
}

async function suggestedMaxFee(
  publicClient: ReturnType<typeof createPublicClient>
): Promise<bigint> {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    return fees.maxFeePerGas > ARC_MIN_MAX_FEE_PER_GAS ? fees.maxFeePerGas : ARC_MIN_MAX_FEE_PER_GAS;
  } catch {
    return ARC_MIN_MAX_FEE_PER_GAS;
  }
}

export function createTestnetArcService(): TestnetArcService {
  return new TestnetArcService(createViemArcChain());
}
