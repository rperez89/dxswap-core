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
import { DXswapDeployer } from '../../typechain/Flattened.sol'

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

  const dXswapDeployer = (await deployer.deploy(DXswapDeployerArtifact, DXswawDeployerArgs)) as DXswapDeployer
  const sendEthTx = await dxdao.sendTransaction({
    to: dXswapDeployer.address,
    gasPrice: 20000000000,
    value: expandTo18Decimals(1),
  })
  await sendEthTx.wait(1)

  const deployTx = await dXswapDeployer.deploy()
  const deployTxReceipt = await provider.getTransactionReceipt(deployTx.hash)

  const factoryDeployedLog = await dXswapDeployer.queryFilter(dXswapDeployer.filters.PairFactoryDeployed())
  const factoryAddress = factoryDeployedLog[0].args.factory

  // deploy DXswapFactory
  const dxswapFactory = DXswapFactory__factory.connect(factoryAddress, dxdao)

  // deploy FeeSetter
  const feeSetterAddress = await dxswapFactory.feeToSetter()
  const feeSetter = DXswapFeeSetter__factory.connect(feeSetterAddress, dxdao)

  // deploy FeeReceiver
  const feeReceiverAddress = await dxswapFactory.feeTo()

  const feeReceiver = DXswapFeeReceiver__factory.connect(feeReceiverAddress, dxdao)

  return { dxswapFactory, feeSetter, feeReceiver, WETH }
}

interface PairFixture extends FactoryFixture {
  token0: Contract
  token1: Contract
  token2: Contract
  token3: Contract
  token4: Contract
  dxswapPair01: Contract
  dxswapPair23: Contract
  dxswapPair03: Contract
  dxswapPair24: Contract
  wethToken1Pair: Contract
  wethToken0Pair: Contract
}

export async function pairFixture(
  provider: JsonRpcProvider,
  [dxdao, protocolFeeReceiver, fallbackReceiver]: Wallet[]
): Promise<PairFixture> {
  const deployer = new Deployer(hre, dxdao)
  const ercContractName = 'ERC20'
  const artifact = await deployer.loadArtifact(ercContractName)
  // deploy tokens
  const tokenA = await deployer.deploy(artifact, [TOTAL_SUPPLY])
  const tokenB = await deployer.deploy(artifact, [TOTAL_SUPPLY])
  const tokenC = await deployer.deploy(artifact, [TOTAL_SUPPLY])
  const tokenD = await deployer.deploy(artifact, [TOTAL_SUPPLY])
  const tokenE = await deployer.deploy(artifact, [TOTAL_SUPPLY])

  // deploy weth
  const wethContractName = 'WETH9'
  const wethArtifact = await deployer.loadArtifact(wethContractName)
  // deploy weth
  const WETH = await deployer.deploy(wethArtifact, [])
  await WETH.connect(dxdao).deposit({ value: expandTo18Decimals(100) })

  //sort tokens
  const token0 = tokenA.address < tokenB.address ? tokenA : tokenB
  const token1 = token0.address === tokenA.address ? tokenB : tokenA

  const token2 = tokenC.address < tokenD.address ? tokenC : tokenD
  const token3 = token2.address === tokenC.address ? tokenD : tokenC
  const token4 = tokenE

  const dXswapDeployerArtifact = await deployer.loadArtifact('DXswapDeployer')
  const dXswawDeployerArgs = contractConstructorArgs<DXswapDeployer__factory>(
    protocolFeeReceiver.address,
    dxdao.address,
    WETH.address,
    [token0.address, token1.address, token2.address, token0.address, token0.address, token2.address],
    [token1.address, WETH.address, token3.address, token3.address, WETH.address, token4.address],
    [15, 15, 15, 15, 15, 15]
  )

  const dxSwapDeployer = (await deployer.deploy(dXswapDeployerArtifact, dXswawDeployerArgs)) as DXswapDeployer

  const sendTx = await dxdao.sendTransaction({
    to: dxSwapDeployer.address,
    gasPrice: 20000000000,
    value: expandTo18Decimals(1),
  })
  await sendTx.wait(1)

  const deployTx = await dxSwapDeployer.deploy()
  const deployTxReceipt = await provider.getTransactionReceipt(deployTx.hash)
  const factoryDeployedLog = await dxSwapDeployer.queryFilter(dxSwapDeployer.filters.PairFactoryDeployed())
  const factoryAddress = factoryDeployedLog[0].args.factory

  // deploy DXswapFactory
  const dxswapFactory = DXswapFactory__factory.connect(factoryAddress, dxdao)

  // deploy FeeSetter
  const feeSetterAddress = await dxswapFactory.feeToSetter()
  const feeSetter = DXswapFeeSetter__factory.connect(feeSetterAddress, dxdao)

  // deploy FeeReceiver
  const feeReceiverAddress = await dxswapFactory.feeTo()

  const feeReceiver = DXswapFeeReceiver__factory.connect(feeReceiverAddress, dxdao)
  // set receivers
  const changeReceiverTx = await feeReceiver
    .connect(dxdao)
    .changeReceivers(protocolFeeReceiver.address, fallbackReceiver.address)
  await changeReceiverTx.wait(1)

  // initialize DXswapPair factory
  const dXswapPairArtifact = await deployer.loadArtifact('DXswapPair')
  const dxSwapPair_factory = await deployer.deploy(dXswapPairArtifact, [])

  // const dxSwapPair_factory = await new DXswapPair__factory(dxdao).deploy()

  // create pairs
  const pairAddress1 = await dxswapFactory.getPair(token0.address, token1.address)
  const dxswapPair01 = dxSwapPair_factory.attach(pairAddress1)

  console.log('pairAddress1', pairAddress1)
  console.log('dxswapPair01', dxswapPair01.address)

  const pairAddress2 = await dxswapFactory.getPair(token2.address, token3.address)
  const dxswapPair23 = dxSwapPair_factory.attach(pairAddress2)
  console.log('pairAddress2', pairAddress2)
  console.log('dxswapPair23', dxswapPair23.address)

  const pairAddress3 = await dxswapFactory.getPair(token0.address, token3.address)
  const dxswapPair03 = dxSwapPair_factory.attach(pairAddress3)
  console.log('pairAddress3', pairAddress3)
  console.log('dxswapPair03', dxswapPair03.address)

  const pairAddress4 = await dxswapFactory.getPair(token2.address, token4.address)
  const dxswapPair24 = dxSwapPair_factory.attach(pairAddress4)
  console.log('pairAddress4', pairAddress4)
  console.log('dxswapPair24', dxswapPair24.address)

  // create weth/erc20 pair
  const WETHPairAddress = await dxswapFactory.getPair(token1.address, WETH.address)
  const wethToken1Pair = dxSwapPair_factory.attach(WETHPairAddress)
  console.log('WETHPairAddress', WETHPairAddress)
  console.log('wethToken1Pair', wethToken1Pair.address)

  // create weth/erc20 pair
  const WETH0PairAddress = await dxswapFactory.getPair(token0.address, WETH.address)
  const wethToken0Pair = dxSwapPair_factory.attach(WETH0PairAddress)
  console.log('WETH0PairAddress', WETH0PairAddress)
  console.log('wethToken0Pair', wethToken0Pair.address)

  return {
    dxswapFactory,
    feeSetter,
    feeReceiver,
    WETH,
    token0,
    token1,
    token2,
    token3,
    token4,
    dxswapPair01,
    dxswapPair23,
    dxswapPair03,
    dxswapPair24,
    wethToken1Pair,
    wethToken0Pair,
  }
}
