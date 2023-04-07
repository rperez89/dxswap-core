import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { contractConstructorArgs, TAGS } from './deployment.config'
import { runVerify } from './utils'
import { DXswapDeployer__factory } from '../typechain'
import { getDeploymentConfig } from './deployment.config'
import { utils, Wallet } from 'zksync-web3'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'

const account = '0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110' // process.env.PRIVATE_KEY || ''

const deployment: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre
  const wallet = new Wallet(account)
  const deployer = new Deployer(hre, wallet)
  const artifact = await deployer.loadArtifact('DXswapPair')

  const config = getDeploymentConfig(network.name)
  // const deployArgs = contractConstructorArgs<DXswapDeployer__factory>(
  //   config?.dxSwapFeeSetter || wallet.address,
  //   config?.dxdaoAvatar || wallet.address,
  //   config?.nativeCurrencyWrapper || wallet.address,
  //   [],
  //   [],
  //   []
  // )

  // console.log('deployArgs', deployArgs)

  const contractName = 'DXswapDeployer'
  const deployResult = await deployer.deploy(artifact, [])

  // const txreceipt = await deployResult.wait(1)

  console.log('deploy result ', deployResult)

  const receipt = await wallet.provider.getTransactionReceipt(
    '0xe2c5795894fd24d8e7d8d1ce54c1773d0a4794e33acf0b0b1d5cda2d6e2d595f'
  )
  console.log('txreceipt ', receipt)

  const deployedContract = await utils.getDeployedContracts(receipt)
  console.log('DEPLOYED CONTRACTS', deployedContract)

  console.log(`${artifact.contractName} was deployed to ${deployResult.address}`)

  // const contractFullyQualifedName = `contracts/${contractName}.sol:${contractName}`
  // const result = await hre.run('verify:verify', {
  //   address: deployResult.address,
  //   contract: contractFullyQualifedName,
  //   constructorArguments: deployArgs,
  // })
  // console.log('verification result ', result)
}

deployment.tags = [TAGS.DEPLOYER, TAGS.CORE_CONTRACTS]

export default deployment
