/**
 * Blockchain Integration Utilities
 * For interacting with CreerlioCredentials smart contract
 */

import { ethers } from 'ethers'

// Contract ABI (minimal for our use case)
export const CREDENTIALS_CONTRACT_ABI = [
  'function issueCredential(bytes32 credentialIdHash, bytes32 sha256Hash) external',
  'function revokeCredential(bytes32 credentialIdHash) external',
  'function getCredential(bytes32 credentialIdHash) external view returns (tuple(bytes32 credentialIdHash, bytes32 sha256Hash, uint256 issuedBlock, uint256 issuedTimestamp, address issuer, bool isRevoked, uint256 revokedBlock, uint256 revokedTimestamp))',
  'function verifyCredentialHash(bytes32 credentialIdHash, bytes32 sha256Hash) external view returns (bool)',
  'function credentialExists(bytes32 credentialIdHash) external view returns (bool)',
  'function isRevoked(bytes32 credentialIdHash) external view returns (bool)',
  'function getTotalCredentials() external view returns (uint256)',
  'event CredentialIssued(bytes32 indexed credentialIdHash, bytes32 indexed sha256Hash, uint256 blockNumber, address indexed issuer)',
  'event CredentialRevoked(bytes32 indexed credentialIdHash, uint256 blockNumber, address indexed revoker)',
] as const

// Network configurations
export const NETWORK_CONFIGS = {
  polygon: {
    mainnet: {
      chainId: 137,
      rpcUrl: 'https://polygon-rpc.com',
      explorerUrl: 'https://polygonscan.com',
    },
    testnet: {
      chainId: 80001,
      rpcUrl: 'https://polygon-mumbai.blockpi.network/v1/rpc/public',
      explorerUrl: 'https://mumbai.polygonscan.com',
    },
  },
  base: {
    mainnet: {
      chainId: 8453,
      rpcUrl: 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org',
    },
    testnet: {
      chainId: 84532,
      rpcUrl: 'https://sepolia.base.org',
      explorerUrl: 'https://sepolia.basescan.org',
    },
  },
} as const

export type ChainName = 'polygon' | 'base'
export type NetworkName = 'mainnet' | 'testnet' | 'mumbai' | 'sepolia'

export interface BlockchainConfig {
  chainName: ChainName
  network: NetworkName
  contractAddress: string
}

/**
 * Hash a credential UUID using Keccak256 (for on-chain storage)
 */
export function hashCredentialId(credentialId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(credentialId))
}

/**
 * Convert hex string to bytes32 format
 */
export function toBytes32(hexString: string): string {
  // Remove 0x prefix if present
  const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString
  // Pad to 64 characters (32 bytes)
  return '0x' + cleanHex.padStart(64, '0').slice(0, 64)
}

/**
 * Get RPC URL for a network
 */
export function getRpcUrl(chainName: ChainName, network: NetworkName): string {
  const config = NETWORK_CONFIGS[chainName]
  if (network === 'mumbai') {
    return config.testnet.rpcUrl
  }
  if (network === 'sepolia') {
    return NETWORK_CONFIGS.base.testnet.rpcUrl
  }
  return config[network]?.rpcUrl || config.mainnet.rpcUrl
}

/**
 * Get explorer URL for a network
 */
export function getExplorerUrl(chainName: ChainName, network: NetworkName): string {
  const config = NETWORK_CONFIGS[chainName]
  if (network === 'mumbai') {
    return config.testnet.explorerUrl
  }
  if (network === 'sepolia') {
    return NETWORK_CONFIGS.base.testnet.explorerUrl
  }
  return config[network]?.explorerUrl || config.mainnet.explorerUrl
}

/**
 * Get transaction URL for a network
 */
export function getTransactionUrl(
  chainName: ChainName,
  network: NetworkName,
  txHash: string
): string {
  const explorerUrl = getExplorerUrl(chainName, network)
  return `${explorerUrl}/tx/${txHash}`
}

/**
 * Create contract instance
 */
export function getContractInstance(
  contractAddress: string,
  chainName: ChainName,
  network: NetworkName,
  provider?: ethers.Provider
) {
  const rpcUrl = getRpcUrl(chainName, network)
  const providerInstance = provider || new ethers.JsonRpcProvider(rpcUrl)
  return new ethers.Contract(contractAddress, CREDENTIALS_CONTRACT_ABI, providerInstance)
}

/**
 * Verify credential on-chain (read-only)
 */
export async function verifyCredentialOnChain(
  contractAddress: string,
  chainName: ChainName,
  network: NetworkName,
  credentialId: string,
  sha256Hash: string
): Promise<{
  exists: boolean
  isRevoked: boolean
  hashMatches: boolean
  credential?: any
}> {
  try {
    const contract = getContractInstance(contractAddress, chainName, network)
    const credentialIdHash = hashCredentialId(credentialId)
    const hashBytes32 = toBytes32(sha256Hash)

    const [exists, isRevoked, hashMatches, credential] = await Promise.all([
      contract.credentialExists(credentialIdHash),
      contract.isRevoked(credentialIdHash),
      contract.verifyCredentialHash(credentialIdHash, hashBytes32),
      contract.getCredential(credentialIdHash).catch(() => null),
    ])

    return {
      exists,
      isRevoked,
      hashMatches: hashMatches as boolean,
      credential: credential || undefined,
    }
  } catch (error) {
    console.error('[Blockchain] Verification error:', error)
    return {
      exists: false,
      isRevoked: false,
      hashMatches: false,
    }
  }
}
