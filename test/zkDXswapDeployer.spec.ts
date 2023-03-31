import '@nomiclabs/hardhat-ethers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { expandTo18Decimals } from './shared/utilities'
import { DXswapDeployer__factory } from '../typechain'
import * as hre from 'hardhat'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'

import { Wallet, Provider } from 'zksync-web3'
import { contractConstructorArgs } from '../deploy/deployment.config'
const overrides = {
  gasLimit: 29999999,
}

describe('DXswapDeployer', () => {
  // const provider = ethers.provider

  // let token0: ERC20
  // let token1: ERC20
  // let token2: ERC20
  let dxdao: Wallet
  let tokenOwner: Wallet
  let protocolFeeReceiver: Wallet
  let other: Wallet

  beforeEach('assign wallets', async function () {
    console.log('HELLOOOOOOOOOO')
  })

  it('Execute migration with intial pairs', async () => {
    const provider = Provider.getDefaultProvider()
    const dxdao = new Wallet('0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110', provider)
    const tokenOwner = new Wallet('0xac1e735be8536c6534bb4f17f06f6afc73b2b5ba84ac2cfb12f7461b20c0bbe3', provider)
    const protocolFeeReceiver = new Wallet(
      '0xd293c684d884d56f8d6abd64fc76757d3664904e309a0645baf8522ab6366d9e',
      provider
    )
    const other = new Wallet('0x850683b40d4a740aa6e745f889a6fdc8327be76e122f5aba645a5b02d0248db8', provider)

    const deployer = new Deployer(hre, other)
    const artifact = await deployer.loadArtifact('DXswapDeployer')

    console.log('protocolFeeReceiver', protocolFeeReceiver)
    const deployArgs = contractConstructorArgs<DXswapDeployer__factory>(
      protocolFeeReceiver.address,
      dxdao.address,
      tokenOwner.address,
      [],
      [],
      []
    )

    console.log('deployArgs', deployArgs)

    const contractName = 'DXswapDeployer'
    const dxSwapDeployer = await deployer.deploy(artifact, deployArgs, { gasLimit: 1_000_000 })
    // console.log('dxSwapDeployer', dxSwapDeployer)

    // console.log(`${artifact.contractName} was deployed to ${deployResult.address}`)

    // const dxSwapDeployer = new ContractFactory(artifact.abi, artifact.bytecode, wallet).attach(deployResult.address)

    // expect(await dxSwapDeployer.state()).to.eq(0)

    // // Dont allow other address to approve deployment by sending eth
    // await expect(
    //   other.sendTransaction({ to: dxSwapDeployer.address, gasPrice: 20000000000, value: expandTo18Decimals(10) })
    // ).to.be.rejectedWith('DXswapDeployer: CALLER_NOT_FEE_TO_SETTER')

    // // Dont allow deploy before being approved by sending ETH
    // await expect(dxSwapDeployer.connect(other).deploy()).to.be.rejectedWith('DXswapDeployer: WRONG_DEPLOYER_STATE')

    // // Send transaction with value from dxdao to approve deployment
    // const d = await dxdao.sendTransaction({
    //   to: dxSwapDeployer.address,
    //   gasPrice: 20000000000,
    //   value: expandTo18Decimals(10),
    // })
    // await d.wait(1)

    // // get balance of dxSwapDeployer contract and print it out using ethers utils to format it
    // const balance = await provider.getBalance(dxSwapDeployer.address)
    // console.log('balance', ethers.utils.formatEther(balance))

    // await (await dxSwapDeployer.withdrawTransfer()).wait()

    // const balance2 = await provider.getBalance(dxSwapDeployer.address)
    // console.log('balance2', ethers.utils.formatEther(balance2))

    // expect(await dxSwapDeployer.state()).to.eq(1)

    // // // Dont allow sending more value
    // await expect(
    //   dxdao.sendTransaction({ to: dxSwapDeployer.address, gasPrice: 20000000000, value: expandTo18Decimals(10) })
    // ).to.be.rejectedWith('DXswapDeployer: WRONG_DEPLOYER_STATE')
    // // ).to.be.revertedWith('DXswapDeployer: WRONG_DEPLOYER_STATE')
    // await expect(
    //   other.sendTransaction({ to: dxSwapDeployer.address, gasPrice: 20000000000, value: expandTo18Decimals(10) })
    // ).to.be.rejectedWith('DXswapDeployer: WRONG_DEPLOYER_STATE')
    // // ).to.be.revertedWith('DXswapDeployer: WRONG_DEPLOYER_STATE')

    // // // Execute deployment transaction
    // const deployTx = await dxSwapDeployer.connect(other).deploy({ gasLimit: 500000000 })
    // await deployTx.wait()
    // expect(await dxSwapDeployer.state()).to.eq(2)
    // const deployTxReceipt = await provider.getTransactionReceipt(deployTx.hash)

    // // // Dont allow sending more value
    // await expect(
    //   dxdao.sendTransaction({ to: dxSwapDeployer.address, gasPrice: 20000000000, value: expandTo18Decimals(10) })
    // ).to.be.rejectedWith('DXswapDeployer: WRONG_DEPLOYER_STATE')
    // await expect(
    //   other.sendTransaction({ to: dxSwapDeployer.address, gasPrice: 20000000000, value: expandTo18Decimals(10) })
    // ).to.be.rejectedWith('DXswapDeployer: WRONG_DEPLOYER_STATE')

    // // Dont allow running deployment again
    // await expect(dxSwapDeployer.connect(other).deploy()).to.be.rejectedWith('DXswapDeployer: WRONG_DEPLOYER_STATE')

    // // Get addresses from events
    // const pairFactoryAddress =
    //   deployTxReceipt.logs != undefined ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[0].data)[0] : null
    // const pair01Address =
    //   deployTxReceipt.logs != undefined ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[2].data)[0] : null
    // const pair02Address =
    //   deployTxReceipt.logs != undefined ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[4].data)[0] : null
    // const pair12Address =
    //   deployTxReceipt.logs != undefined ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[6].data)[0] : null
    // const feeReceiverAddress =
    //   deployTxReceipt.logs != undefined ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[7].data)[0] : null
    // const feeSetterAddress =
    //   deployTxReceipt.logs != undefined ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[8].data)[0] : null

    // // deploy DXswapFactory
    // const dxswapFactory = (await new DXswapFactory__factory(tokenOwner).deploy(dxdao.address)).attach(
    //   pairFactoryAddress
    // )
    // // initialize DXswapPair factory
    // const pairFactory = await new DXswapPair__factory(tokenOwner).deploy()

    // // create pairs
    // const addressPair01 = await dxswapFactory.getPair(token0.address, token1.address)
    // const pair01 = pairFactory.attach(addressPair01)

    // const addressPair02 = await dxswapFactory.getPair(token0.address, token2.address)
    // const pair02 = pairFactory.attach(addressPair02)

    // const addressPair12 = await dxswapFactory.getPair(token1.address, token2.address)
    // const pair12 = pairFactory.attach(addressPair12)

    // // Conpare onchain information to offchain predicted information
    // expect(await dxswapFactory.feeTo()).to.eq(feeReceiverAddress)
    // expect(await dxswapFactory.feeToSetter()).to.eq(feeSetterAddress)
    // expect(await dxswapFactory.protocolFeeDenominator()).to.eq(9)
    // expect(await dxswapFactory.allPairsLength()).to.eq(3)

    // expect(pair01.address).to.eq(pair01Address)
    // expect(await pair01.swapFee()).to.eq(10)
    // expect(await pair01.token0()).to.eq(token0.address)
    // expect(await pair01.token1()).to.eq(token1.address)
    // expect(await pair01.totalSupply()).to.eq(0)

    // expect(pair02.address).to.eq(pair02Address)
    // expect(await pair02.swapFee()).to.eq(20)
    // expect(await pair02.token0()).to.eq(token0.address)
    // expect(await pair02.token1()).to.eq(token2.address)
    // expect(await pair02.totalSupply()).to.eq(0)

    // expect(pair12.address).to.eq(pair12Address)
    // expect(await pair12.swapFee()).to.eq(30)
    // expect(await pair12.token0()).to.eq(token1.address)
    // expect(await pair12.token1()).to.eq(token2.address)
    // expect(await pair12.totalSupply()).to.eq(0)
  })
})
