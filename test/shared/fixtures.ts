import { expandTo18Decimals } from './utilities'
import {
  DXswapFactory,
  DXswapFactory__factory,
  DXswapPair,
  DXswapPair__factory,
  WETH9,
  WETH9__factory,
  DXswapFeeSetter,
  DXswapFeeReceiver,
  DXswapFeeSetter__factory,
  DXswapFeeReceiver__factory,
  ERC20,
  ERC20__factory,
  DXswapDeployer__factory,
} from './../../typechain'
import { defaultAbiCoder } from 'ethers/lib/utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Wallet, Contract } from 'zksync-web3'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'
import * as hre from 'hardhat'
import { contractConstructorArgs } from '../../deploy/deployment.config'

const overrides = {
  gasLimit: 29999999,
}
const TOTAL_SUPPLY = expandTo18Decimals(10000)

interface FactoryFixture {
  dxswapFactory: Contract
  feeSetter: Contract
  feeReceiver: Contract
  WETH: Contract
}

export async function factoryFixture(
  provider: JsonRpcProvider,
  [dxdao, protocolFeeReceiver, fallbackReceiver]: Wallet[]
): Promise<FactoryFixture> {
  const deployer = new Deployer(hre, dxdao)
  const deployArgs = contractConstructorArgs<WETH9__factory>()

  const wethContractName = 'WETH9'
  const artifact = await deployer.loadArtifact(wethContractName)
  // deploy weth
  const WETH = await deployer.deploy(artifact, deployArgs)

  console.log(`${artifact.contractName} was deployed to ${WETH.address}`)

  const DXswapDeployerArtifact = await deployer.loadArtifact('DXswapDeployer')
  const DXswawDeployerArgs = contractConstructorArgs<DXswapDeployer__factory>(
    protocolFeeReceiver.address,
    dxdao.address,
    WETH.address,
    [],
    [],
    []
  )

  const DXswapDeployer = await deployer.deploy(DXswapDeployerArtifact, DXswawDeployerArgs)
  await dxdao.sendTransaction({ to: DXswapDeployer.address, gasPrice: 20000000000, value: expandTo18Decimals(1) })

  const deployTx = await DXswapDeployer.deploy()
  const deployTxReceipt = await provider.getTransactionReceipt(deployTx.hash)

  const factoryAddress =
    deployTxReceipt.logs !== undefined ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[0].data)[0] : null

  const state = await DXswapDeployer.state()
  console.log('DEPLOYER STATE ', state)
  // deploy DXswapFactory
  const factoryArgs = contractConstructorArgs<DXswapFactory__factory>(dxdao.address)

  const factoryContractName = 'DXswapFactory'
  const factoryArtifact = await deployer.loadArtifact(factoryContractName)
  const dxswapFactory = (await deployer.deploy(factoryArtifact, factoryArgs)).attach(factoryAddress)
  // const dxswapFactory = (await new DXswapFactory__factory(dxdao).deploy(dxdao.address)).attach(factoryAddress).

  console.log('FACTORY ADDRESS ', dxswapFactory.address)
  console.log('FACTORY ADDRESS Event', factoryAddress)
  // deploy FeeSetter
  const feeSetterAddress = await dxswapFactory.feeTo()
  const feeSetterArgs = contractConstructorArgs<DXswapFeeSetter__factory>(dxdao.address, dxswapFactory.address)

  const feeSetterContractName = 'DXswapFeeSetter'
  const feeSetterArtifact = await deployer.loadArtifact(feeSetterContractName)
  const feeSetter = await (await deployer.deploy(feeSetterArtifact, feeSetterArgs)).attach(feeSetterAddress)

  // deploy FeeReceiver
  const feeReceiverAddress = await dxswapFactory.feeTo()
  const feeReceiverArgs = contractConstructorArgs<DXswapFeeReceiver__factory>(
    dxdao.address,
    dxswapFactory.address,
    WETH.address,
    protocolFeeReceiver.address,
    fallbackReceiver.address
  )

  const feeReceiverContractName = 'DXswapFeeReceiver'
  const feeReceiverArtifact = await deployer.loadArtifact(feeReceiverContractName)

  const feeReceiver = await (await deployer.deploy(feeReceiverArtifact, feeReceiverArgs)).attach(feeReceiverAddress)

  return { dxswapFactory, feeSetter, feeReceiver, WETH }
}

// interface PairFixture extends FactoryFixture {
//   token0: ERC20
//   token1: ERC20
//   token2: ERC20
//   token3: ERC20
//   token4: ERC20
//   dxswapPair01: DXswapPair
//   dxswapPair23: DXswapPair
//   dxswapPair03: DXswapPair
//   dxswapPair24: DXswapPair
//   wethToken1Pair: DXswapPair
//   wethToken0Pair: DXswapPair
// }

// export async function pairFixture(
//   provider: JsonRpcProvider,
//   [dxdao, protocolFeeReceiver, fallbackReceiver]: SignerWithAddress[]
// ): Promise<PairFixture> {
//   // deploy tokens
//   const tokenA = await new ERC20__factory(dxdao).deploy(TOTAL_SUPPLY)
//   const tokenB = await new ERC20__factory(dxdao).deploy(TOTAL_SUPPLY)
//   const tokenC = await new ERC20__factory(dxdao).deploy(TOTAL_SUPPLY)
//   const tokenD = await new ERC20__factory(dxdao).deploy(TOTAL_SUPPLY)
//   const tokenE = await new ERC20__factory(dxdao).deploy(TOTAL_SUPPLY)

//   // deploy weth
//   const WETH = await new WETH9__factory(dxdao).deploy()
//   await WETH.connect(dxdao).deposit({ value: expandTo18Decimals(100) })

//   //sort tokens
//   const token0 = tokenA.address < tokenB.address ? tokenA : tokenB
//   const token1 = token0.address === tokenA.address ? tokenB : tokenA

//   const token2 = tokenC.address < tokenD.address ? tokenC : tokenD
//   const token3 = token2.address === tokenC.address ? tokenD : tokenC
//   const token4 = tokenE

//   const dxSwapDeployer = await new DXswapDeployer__factory(dxdao).deploy(
//     protocolFeeReceiver.address,
//     dxdao.address,
//     WETH.address,
//     [token0.address, token1.address, token2.address, token0.address, token0.address, token2.address],
//     [token1.address, WETH.address, token3.address, token3.address, WETH.address, token4.address],
//     [15, 15, 15, 15, 15, 15],
//     overrides
//   )

//   await dxdao.sendTransaction({ to: dxSwapDeployer.address, gasPrice: 20000000000, value: expandTo18Decimals(1) })

//   const deployTx = await dxSwapDeployer.deploy()
//   const deployTxReceipt = await provider.getTransactionReceipt(deployTx.hash)
//   const factoryAddress =
//     deployTxReceipt.logs !== undefined ? defaultAbiCoder.decode(['address'], deployTxReceipt.logs[0].data)[0] : null

//   // deploy DXswapFactory
//   const dxswapFactory = (await new DXswapFactory__factory(dxdao).deploy(dxdao.address)).attach(factoryAddress)

//   // deploy FeeSetter
//   const feeSetterAddress = await dxswapFactory.feeToSetter()
//   const feeSetter = (await new DXswapFeeSetter__factory(dxdao).deploy(dxdao.address, dxswapFactory.address)).attach(
//     feeSetterAddress
//   )

//   // deploy FeeReceiver
//   const feeReceiverAddress = await dxswapFactory.feeTo()
//   const feeReceiver = (
//     await new DXswapFeeReceiver__factory(dxdao).deploy(
//       dxdao.address,
//       dxswapFactory.address,
//       WETH.address,
//       protocolFeeReceiver.address,
//       fallbackReceiver.address
//     )
//   ).attach(feeReceiverAddress)
//   // set receivers
//   feeReceiver.connect(dxdao).changeReceivers(protocolFeeReceiver.address, fallbackReceiver.address)

//   // initialize DXswapPair factory
//   const dxSwapPair_factory = await new DXswapPair__factory(dxdao).deploy()

//   // create pairs
//   const pairAddress1 = await dxswapFactory.getPair(token0.address, token1.address)
//   const dxswapPair01 = dxSwapPair_factory.attach(pairAddress1)

//   const pairAddress2 = await dxswapFactory.getPair(token2.address, token3.address)
//   const dxswapPair23 = dxSwapPair_factory.attach(pairAddress2)

//   const pairAddress3 = await dxswapFactory.getPair(token0.address, token3.address)
//   const dxswapPair03 = dxSwapPair_factory.attach(pairAddress3)

//   const pairAddress4 = await dxswapFactory.getPair(token2.address, token4.address)
//   const dxswapPair24 = dxSwapPair_factory.attach(pairAddress4)

//   // create weth/erc20 pair
//   const WETHPairAddress = await dxswapFactory.getPair(token1.address, WETH.address)
//   const wethToken1Pair = dxSwapPair_factory.attach(WETHPairAddress)

//   // create weth/erc20 pair
//   const WETH0PairAddress = await dxswapFactory.getPair(token0.address, WETH.address)
//   const wethToken0Pair = dxSwapPair_factory.attach(WETH0PairAddress)

//   return {
//     dxswapFactory,
//     feeSetter,
//     feeReceiver,
//     WETH,
//     token0,
//     token1,
//     token2,
//     token3,
//     token4,
//     dxswapPair01,
//     dxswapPair23,
//     dxswapPair03,
//     dxswapPair24,
//     wethToken1Pair,
//     wethToken0Pair,
//   }
// }
