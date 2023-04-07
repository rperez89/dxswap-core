import * as zksync from 'zksync-web3'
import * as ethers from 'ethers'
const account = process.env.PRIVATE_KEY || ''

async function main() {
  // Currently, only one environment is supported.
  const zkSyncProvider = new zksync.Provider('https://zksync2-testnet.zksync.dev')
  const ethProvider = ethers.getDefaultProvider('goerli')

  // Initialize the wallet.
  const zkSyncWallet = new zksync.Wallet(account, zkSyncProvider, ethProvider)

  const abi = [
    {
      inputs: [],
      name: 'deploy',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ]
  const contractAddress = '0xea27F7669456615Adf1B41cfdBA07BD6a931Ee2a'
  const contract = new ethers.Contract(contractAddress, abi, zkSyncWallet)

  const data = contract.interface.encodeFunctionData('deploy', [])

  const result = await zkSyncWallet.sendTransaction({
    to: contractAddress,
    data: data,
    gasLimit: 500000000,
  })
  console.log('result', result)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
