import * as zksync from 'zksync-web3'
import * as ethers from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const account = process.env.PRIVATE_KEY || ''

async function main() {
  // Currently, only one environment is supported.
  const zkSyncProvider = new zksync.Provider('https://zksync2-testnet.zksync.dev')
  const ethProvider = ethers.getDefaultProvider('goerli')

  // Initialize the wallet.
  const zkSyncWallet = new zksync.Wallet(account, zkSyncProvider, ethProvider)

  console.log('account ', account)

  const abi = [
    {
      inputs: [],
      name: 'deploy',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ]
  const contractAddress = '0xB0A1D45189f3750DDB84de622579257D07eC3550'
  const contract = new ethers.Contract(contractAddress, abi, zkSyncWallet)

  const tx = await contract.populateTransaction.deploy()
  const gasLimit = await contract.estimateGas.deploy()
  const data = contract.interface.encodeFunctionData('deploy', [])

  const result = await zkSyncWallet.sendTransaction({
    to: contractAddress,
    data: data,
    gasLimit: gasLimit,
  })

  console.log('result', result)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
