import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

import { contractConstructorArgs, TAGS } from '../deploy/deployment.config'
import { DXswapFactory__factory } from '../typechain'

const hre = require('hardhat')

const account = process.env.PRIVATE_KEY || ''

const contractName = 'DXswapFactory'

async function main(hre: HardhatRuntimeEnvironment) {
  const constructorArgs = contractConstructorArgs<DXswapFactory__factory>('0xb0a1d45189f3750ddb84de622579257d07ec3550')
  const contractFullyQualifedName = `contracts/${contractName}.sol:${contractName}`

  console.log('hre', hre.network.name)

  console.log('constructorArgs', constructorArgs)
  const result = await hre.run('verify:verify', {
    address: '0x841d1f482db6CaCB13b67042c1bc61c352D4365C',
    contract: contractFullyQualifedName,
    constructorArguments: constructorArgs,
  })
  console.log('result', result)
}

main(hre).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
