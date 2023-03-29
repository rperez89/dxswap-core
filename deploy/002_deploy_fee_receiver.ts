import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { contractConstructorArgs, TAGS } from './deployment.config'
import { runVerify } from './utils'
import { DXswapFeeReceiver__factory } from '../typechain'
import { getDeploymentConfig } from './deployment.config'
import { Wallet } from 'zksync-web3'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'

const account = process.env.PRIVATE_KEY || ''
const contractName = 'DXswapFeeReceiver'

const deployment: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre
  const wallet = new Wallet(account)
  const deployer = new Deployer(hre, wallet)
  const artifact = await deployer.loadArtifact(contractName)

  const config = getDeploymentConfig(network.name)

  const constructorArgs = contractConstructorArgs<DXswapFeeReceiver__factory>(
    config?.owner || wallet.address,
    config?.dxSwapFactory || wallet.address,
    config?.nativeCurrencyWrapper || wallet.address,
    config?.dxdaoAvatar || wallet.address,
    config?.dxdaoAvatar || wallet.address
  )

  console.log('constructor args ', constructorArgs)

  const deployResult = await deployer.deploy(artifact, constructorArgs)

  console.log(`${artifact.contractName} was deployed to ${deployResult.address}`)
  console.log('encoded constructor parameters: ', deployResult.interface.encodeDeploy(constructorArgs))

  const contractFullyQualifedName = `contracts/${contractName}.sol:${contractName}`
  try {
    const result = await hre.run('verify:verify', {
      address: deployResult.address,
      contract: contractFullyQualifedName,
      constructorArguments: constructorArgs,
    })

    console.log('verification result ', result)
  } catch (e) {
    console.log('Error', e)
  }
}

deployment.tags = [TAGS.FEE_RECEIVER, TAGS.CORE_CONTRACTS]

export default deployment
