import * as zksync from 'zksync-web3'
import * as ethers from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import contractsAddress from '../.contracts.json'
import { DXswapDeployer__factory } from '../typechain'

const account = process.env.PRIVATE_KEY || ''

async function main() {
  // Currently, only one environment is supported.
  const zkSyncProvider = new zksync.Provider('https://zksync2-testnet.zksync.dev')
  const ethProvider = ethers.getDefaultProvider('goerli')

  // Initialize the wallet.
  const zkSyncWallet = new zksync.Wallet(account, zkSyncProvider, ethProvider)

  let deployerAddress: string | undefined = contractsAddress.zkSyncTestnet.deployer ?? undefined
  deployerAddress = deployerAddress.trim() !== '' ? deployerAddress : undefined

  if (!deployerAddress) {
    throw new Error('Deployer address not found in .contracts.json')
  }

  const contract = DXswapDeployer__factory.connect(deployerAddress, zkSyncWallet)

  const allBalances = await zkSyncWallet.getAllBalances()

  console.log('allBalances', JSON.stringify(allBalances, null, 4))
  // convert each Bignumber to number or string in allBalances using map
  const allBalancesMap = new Map(Object.entries(allBalances).map(([key, value]) => [key, value.toString()]))
  console.log('allBalancesMap', JSON.stringify(allBalancesMap, null, 4))

  let state = await contract.state()

  if (state == 0) {
    const depositAmount = ethers.utils.parseEther('0.001')
    const depositHandle = await zkSyncWallet.deposit({
      to: contract.address,
      token: zksync.utils.ETH_ADDRESS,
      amount: depositAmount,
    })
    await depositHandle.wait(1) // waitFinalize() or waitL1Commit()
  } else {
    console.log('state', state)
  }

  state = await contract.state()
  if (state == 1) {
    const tx = await contract.deploy()
    console.log('tx', JSON.stringify(tx, null, 4))
    const receipt = await tx.wait(1)
    console.log('receipt', JSON.stringify(receipt, null, 4))
  } else {
    console.log('state', state)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
