import * as zksync from 'zksync-web3'
import * as ethers from 'ethers'
import contractsAddress from '../.contracts.json'
import { DXswapFactory__factory } from '../typechain'
import { getDeploymentConfig } from '../deploy/deployment.config'
import { network } from 'hardhat'

const account = process.env.PRIVATE_KEY || ''

async function main() {
  if (!network.zksync) {
    throw new Error('Network not supported')
  }

  // Currently, only one environment is supported.
  const zkSyncProvider = new zksync.Provider('https://zksync2-testnet.zksync.dev')
  const ethProvider = ethers.getDefaultProvider('goerli')

  // Initialize the wallet.
  const zkSyncWallet = new zksync.Wallet(account, zkSyncProvider, ethProvider)

  let deployerAddress: string | undefined = contractsAddress.zkSyncTestnet.factory ?? undefined

  deployerAddress = deployerAddress.trim() !== '' ? deployerAddress : undefined

  if (!deployerAddress) {
    throw new Error('Deployer address not found in .contracts.json')
  }

  const contract = DXswapFactory__factory.connect(deployerAddress, zkSyncWallet)

  const tokenA = getDeploymentConfig(network.name).nativeCurrencyWrapper
  const tokenC = '0x65C9bB8783F4CC3E86Bc011330c73c8C7248228C'
  console.log('tokenA', tokenA)
  const tokenB = '0xCDb1b66B4DDbE23dd3Ce0e852abfca56f55b2CAD'
  console.log('tokenB', tokenB)
  if (tokenA) {
    // let tx = await contract.callStatic.createPair(tokenA, tokenB)
    let tx = await contract.createPair(tokenA, tokenC)
    console.log('tx', tx)
    const tt = await tx.wait(1)
    console.log('tt', tt)
    console.log('tt', JSON.stringify(tt, null, 4))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
