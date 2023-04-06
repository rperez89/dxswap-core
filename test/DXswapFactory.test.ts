import { expect } from 'chai'
import { BigNumber, constants } from 'ethers'
import { factoryFixture } from './shared/fixtures'
import { DXswapFactory, DXswapFeeSetter, DXswapPair__factory } from './../typechain'
import { bytecode as dxSwapPairBytecode } from '../build/artifacts-zk/contracts/DXswapPair.sol/DXswapPair.json'
import { getCreate2Address } from './shared/utilities'
import { Contract, Wallet, Provider } from 'zksync-web3'

const { AddressZero } = constants

const TEST_ADDRESSES: [string, string] = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000',
]

const overrides = {
  gasLimit: 9999999,
}

describe('DXswapFactory', () => {
  const provider = Provider.getDefaultProvider()
  let dxdao: Wallet
  let tokenOwner: Wallet
  let ethReceiver: Wallet
  let fallbackReceiver: Wallet
  let other: Wallet
  let randomTestFeeSetter: Wallet
  let factory: Contract
  let feeSetter: Contract

  beforeEach('assign wallets', async function () {
    dxdao = new Wallet('0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110', provider)
    tokenOwner = dxdao
    ethReceiver = dxdao
    fallbackReceiver = dxdao
    other = new Wallet('0xac1e735be8536c6534bb4f17f06f6afc73b2b5ba84ac2cfb12f7461b20c0bbe3', provider)
    randomTestFeeSetter = new Wallet('0xd293c684d884d56f8d6abd64fc76757d3664904e309a0645baf8522ab6366d9e', provider)
  })

  beforeEach('deploy fixture', async () => {
    const fixture = await factoryFixture(provider, [dxdao, ethReceiver, fallbackReceiver])
    factory = fixture.dxswapFactory as DXswapFactory
    feeSetter = fixture.feeSetter

    // Set feeToSetter to dxdao.address to test the factory methdos from an ETH account
    const feeSetterTx = await feeSetter.setFeeTo(AddressZero, overrides)
    await feeSetterTx.wait()
    const feeToSetterTx = await feeSetter.setFeeToSetter(randomTestFeeSetter.address, overrides)
    await feeToSetterTx.wait()
  })

  it('feeTo, feeToSetter, allPairsLength, INIT_CODE_PAIR_HASH', async () => {
    expect(await factory.feeTo()).to.eq(AddressZero)
    expect(await factory.feeToSetter()).to.eq(randomTestFeeSetter.address)
    expect(await factory.allPairsLength()).to.eq(0)
    expect(await factory.INIT_CODE_PAIR_HASH()).to.eq(
      '0x44776b379725f74a0d26e88b21a9d8ff7482155c70aec405e5a76361d341efba'
    )
  })

  async function createPair(tokens: [string, string]) {
    const bytecode = dxSwapPairBytecode
    const create2Address = getCreate2Address(factory.address, tokens, bytecode)
    console.log('create2Address ', create2Address)
    const createPairTx = await factory.createPair(...tokens, overrides)
    await createPairTx.wait()
    const pairCreatedLogs = await factory.queryFilter(factory.filters.PairCreated(null, null, null, null))
    console.log('pairCreatedLogs ', pairCreatedLogs)
    await expect(createPairTx)
      .to.emit(factory, 'PairCreated')
      .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, BigNumber.from(1))

    // const [tokenA, tokenB] = tokens.slice().reverse()
    // await expect(factory.createPair(...tokens)).to.be.reverted // DXswap: PAIR_EXISTS
    // await expect(factory.createPair(tokenA, tokenB)).to.be.reverted // DXswap: PAIR_EXISTS
    // expect(await factory.getPair(...tokens)).to.eq(create2Address)
    // expect(await factory.getPair(tokenA, tokenB)).to.eq(create2Address)
    // expect(await factory.allPairs(0)).to.eq(create2Address)
    // expect(await factory.allPairsLength()).to.eq(1)

    // const pair = (await new DXswapPair__factory(dxdao).deploy()).attach(create2Address)
    // expect(await pair.factory()).to.eq(factory.address)
    // expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
    // expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
  }

  // it('createPair', async () => {
  //   await createPair(TEST_ADDRESSES)
  // })

  // it('createPair:reverse', async () => {
  //   await createPair(TEST_ADDRESSES.slice().reverse() as [string, string])
  // })

  // it('createPair:gas', async () => {
  //   const tx = await factory.createPair(...TEST_ADDRESSES, overrides)
  //   const receipt = await tx.wait()
  //   expect(receipt.gasUsed).to.eq(2147442)
  // })

  // it('setFeeTo', async () => {
  //   await expect(factory.connect(other).setFeeTo(other.address, overrides)).to.be.revertedWith(
  //     'DXswapFactory: FORBIDDEN'
  //   )
  //   await factory.connect(randomTestFeeSetter).setFeeTo(dxdao.address, overrides)
  //   expect(await factory.feeTo()).to.eq(dxdao.address)
  // })

  // it('setFeeToSetter', async () => {
  //   await expect(factory.connect(other).setFeeToSetter(other.address, overrides)).to.be.revertedWith(
  //     'DXswapFactory: FORBIDDEN'
  //   )
  //   await factory.connect(randomTestFeeSetter).setFeeToSetter(other.address, overrides)
  //   expect(await factory.feeToSetter()).to.eq(other.address)
  //   await expect(factory.setFeeToSetter(dxdao.address)).to.be.revertedWith('DXswapFactory: FORBIDDEN')
  // })
})
