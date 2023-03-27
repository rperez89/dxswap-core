import * as zksync from 'zksync-web3'
import * as ethers from 'ethers'

async function run() {
  const zkSyncProvider = new zksync.Provider('https://zksync2-testnet.zksync.dev')
  const ethProvider = ethers.getDefaultProvider('goerli')
}
