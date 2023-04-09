import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { contractConstructorArgs, TAGS } from './deployment.config'
import { DXswapDeployer__factory, ERC20Mintable__factory } from '../typechain'
import { getDeploymentConfig } from './deployment.config'
import { Wallet } from 'zksync-web3'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'

const account = process.env.PRIVATE_KEY || ''

const deployment: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre
  const wallet = new Wallet(account)
  const deployer = new Deployer(hre, wallet)
  const contractName = 'ERC20Mintable'
  const artifact = await deployer.loadArtifact(contractName)

  const config = getDeploymentConfig(network.name)

  const deployArgs = contractConstructorArgs<ERC20Mintable__factory>(2_000, 'Test2', 'TST')

  console.log('deployArgs', deployArgs)

  const deployResult = await deployer.deploy(artifact, deployArgs)

  console.log(`${artifact.contractName} was deployed to ${deployResult.address}`)

  const contractFullyQualifedName = `contracts/test/${contractName}.sol:${contractName}`
  const result = await hre.run('verify:verify', {
    address: deployResult.address,
    contract: contractFullyQualifedName,
    constructorArguments: deployArgs,
  })
  console.log('verification result ', result)
}

deployment.tags = [TAGS.DEPLOYER, TAGS.CORE_CONTRACTS]

export default deployment
