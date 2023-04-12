import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { contractConstructorArgs, TAGS } from './deployment.config'
import { runVerify } from './utils'
import { DXswapDeployer__factory, DXswapRouter__factory } from '../typechain'
import { getDeploymentConfig } from './deployment.config'
import { utils, Wallet } from 'zksync-web3'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'

const account = process.env.PRIVATE_KEY || ''

const deployment: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre
  const wallet = new Wallet(account)
  const deployer = new Deployer(hre, wallet)
  const contractName = 'DXswapRouter'
  const artifact = await deployer.loadArtifact(contractName)

  const config = getDeploymentConfig(network.name)
  if (config.dxSwapFactory && config.nativeCurrencyWrapper) {
    const deployArgs = contractConstructorArgs<DXswapRouter__factory>(
      config?.dxSwapFactory,
      config?.nativeCurrencyWrapper
    )

    console.log('deployArgs', deployArgs)

    const deployResult = await deployer.deploy(artifact, deployArgs)

    console.log(`${artifact.contractName} was deployed to ${deployResult.address}`)

    const contractFullyQualifedName = `contracts/${contractName}.sol:${contractName}`
    const result = await hre.run('verify:verify', {
      address: deployResult.address,
      contract: contractFullyQualifedName,
      constructorArguments: deployArgs,
    })
    console.log('verification result ', result)
  } else {
    throw new Error('dxSwapFactory is not defined in deployment config')
  }
}

deployment.tags = [TAGS.DEPLOYER, TAGS.CORE_CONTRACTS]

export default deployment
