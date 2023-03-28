import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { contractConstructorArgs, TAGS } from './deployment.config'
import { runVerify } from './utils'
import { DXswapFactory__factory } from '../typechain'
import { getDeploymentConfig } from './deployment.config'
import { utils, Wallet } from 'zksync-web3'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'

const account = process.env.PRIVATE_KEY || ''

const deployment: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre
  const wallet = new Wallet(account)
  const deployer = new Deployer(hre, wallet)
  const artifact = await deployer.loadArtifact('DXswapFactory')

  const config = getDeploymentConfig(network.name)

  const constructorArgs = contractConstructorArgs<DXswapFactory__factory>(
    config?.dxSwapFeeSetter || '0xB0A1D45189f3750DDB84de622579257D07eC3550'
  )

  console.log('deployArgs', constructorArgs)

  const contractName = 'DXswapFactory'
  const deployResult = await deployer.deploy(artifact, constructorArgs)

  console.log(`${artifact.contractName} was deployed to ${deployResult.address}`)
  console.log(deployResult.interface.encodeDeploy(constructorArgs))

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

deployment.tags = [TAGS.FACTORY, TAGS.CORE_CONTRACTS]

export default deployment
