import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { AddressZero } from 'ethers/constants'
import { BigNumber, bigNumberify } from 'ethers/utils'
import { solidity, MockProvider, createFixtureLoader, deployContract } from 'ethereum-waffle'

import { expandTo18Decimals, getCreate2Address } from './shared/utilities'
import { pairFixture } from './shared/fixtures'

import DXswapPair from '../build/DXswapPair.json'
import ERC20 from '../build/ERC20.json'
import DXswapFeeReceiver from '../build/DXswapFeeReceiver.json'

const FEE_DENOMINATOR = bigNumberify(10).pow(4)

chai.use(solidity)

const TEST_ADDRESSES: [string, string] = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000'
]

describe('DXswapFeeReceiver', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const overrides = {
    gasLimit: 9999999
  }
  const [dxdao, wallet, protocolFeeReceiver, other] = provider.getWallets()
  const loadFixture = createFixtureLoader(provider, [dxdao, wallet, protocolFeeReceiver])

  let factory: Contract
  let token0: Contract
  let token1: Contract
  let pair: Contract
  let wethPair: Contract
  let WETH: Contract
  let feeSetter: Contract
  let feeReceiver: Contract
  beforeEach(async () => {
    const fixture = await loadFixture(pairFixture)
    factory = fixture.factory
    token0 = fixture.token0
    token1 = fixture.token1
    pair = fixture.pair
    wethPair = fixture.wethPair
    WETH = fixture.WETH
    feeSetter = fixture.feeSetter
    feeReceiver = fixture.feeReceiver
  })
  
  // Where token0-token1 and token1-WETH pairs exist
  it(
    'should receive token0 to fallbackreceiver and ETH to ethReceiver when extracting fee from token0-token1',
    async () => 
  {
    const tokenAmount = expandTo18Decimals(100);
    const wethAmount = expandTo18Decimals(100);
    const swapAmount = expandTo18Decimals(50);

    await token0.transfer(pair.address, tokenAmount)
    await token1.transfer(pair.address, tokenAmount)
    await pair.mint(wallet.address, overrides)
    
    await token1.transfer(wethPair.address, tokenAmount)
    await WETH.transfer(wethPair.address, wethAmount)
    await wethPair.mint(wallet.address, overrides)
    
    const amountInWithFee = swapAmount.mul(FEE_DENOMINATOR.sub(15))
    const numerator = amountInWithFee.mul(tokenAmount)
    const denominator = tokenAmount.mul(FEE_DENOMINATOR).add(amountInWithFee)
    const amountOut = numerator.div(denominator)
  
    await token0.transfer(pair.address, swapAmount)
    await pair.swap(0, amountOut, wallet.address, '0x', overrides)

    // NOTE I think this swap is asking for less than it could get
    // here cus it doesn't take into account the change from the previous swap
    // For the purpose of these tests I think this is fine -JPK 11/08/20
    await token1.transfer(pair.address, swapAmount)
    await pair.swap(amountOut, 0, wallet.address, '0x', overrides)
        
    await token0.transfer(pair.address, expandTo18Decimals(10))
    await token1.transfer(pair.address, expandTo18Decimals(10))
    await pair.mint(wallet.address, overrides)
  
    const protocolFeeReceiverBalance = await provider.getBalance(protocolFeeReceiver.address)

    await feeReceiver.connect(wallet).takeProtocolFee([pair.address], overrides)

    expect(await provider.getBalance(protocolFeeReceiver.address)).to.be.above(protocolFeeReceiverBalance.toString())
    expect(await token0.balanceOf(protocolFeeReceiver.address)).to.eq(0)
    expect(await token0.balanceOf(dxdao.address)).to.be.above(0)
  })

  it('should receive everything in ETH from one WETH-token1 pair', async () => {
    
    const tokenAmount = expandTo18Decimals(100);
    const wethAmount = expandTo18Decimals(100);
    const swapAmount = expandTo18Decimals(50);
    
    await token1.transfer(wethPair.address, tokenAmount)
    await WETH.transfer(wethPair.address, wethAmount)
    await wethPair.mint(wallet.address, overrides)
    
    const amountInWithFee = swapAmount.mul(FEE_DENOMINATOR.sub(15))
    const numerator = amountInWithFee.mul(tokenAmount)
    const denominator = tokenAmount.mul(FEE_DENOMINATOR).add(amountInWithFee)
    const amountOut = numerator.div(denominator)
  
    await token1.transfer(wethPair.address, swapAmount)
    await wethPair.swap(
      (token1.address < WETH.address) ? 0 : amountOut,
      (token1.address < WETH.address) ? amountOut : 0,
      wallet.address, '0x', overrides
    )

    // NOTE I think this swap is asking for less than it could get
    // here cus it doesn't take into account the change from the previous swap
    // For the purpose of these tests I think this is fine -JPK 11/08/20
    await WETH.transfer(wethPair.address, swapAmount)
    await wethPair.swap(
      (token1.address < WETH.address) ? amountOut : 0,
      (token1.address < WETH.address) ? 0 : amountOut,
      wallet.address, '0x', overrides
    )

    await token1.transfer(wethPair.address, expandTo18Decimals(10))
    await WETH.transfer(wethPair.address, expandTo18Decimals(10))
    await wethPair.mint(wallet.address, overrides)
    
    const protocolFeeReceiverBalance = await provider.getBalance(protocolFeeReceiver.address)

    await feeReceiver.connect(wallet).takeProtocolFee([wethPair.address], overrides)

    expect(await provider.getBalance(protocolFeeReceiver.address)).to.be.above(protocolFeeReceiverBalance.toString())
    expect(await token1.balanceOf(protocolFeeReceiver.address)).to.eq(0)
    expect(await token1.balanceOf(dxdao.address)).to.eq(0)
  })
  
  it(
    'should receive only tokens when extracting fee from tokenA-tokenB pair that has no path to WETH',
    async () => 
  {
    const tokenA = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
    const tokenB = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
    
    const tokenAmount = expandTo18Decimals(100);
    const swapAmount = expandTo18Decimals(50);
    
    await factory.createPair(tokenA.address, tokenB.address);
    const newTokenPair = new Contract(
      await factory.getPair(
        (tokenA.address < tokenB.address) ? tokenA.address : tokenB.address,
        (tokenA.address < tokenB.address) ? tokenB.address : tokenA.address
      ), JSON.stringify(DXswapPair.abi), provider
    ).connect(wallet)

    await tokenA.transfer(newTokenPair.address, tokenAmount)
    await tokenB.transfer(newTokenPair.address, tokenAmount)
    await newTokenPair.mint(wallet.address, overrides)
    
    const amountInWithFee = swapAmount.mul(FEE_DENOMINATOR.sub(15))
    const numerator = amountInWithFee.mul(tokenAmount)
    const denominator = tokenAmount.mul(FEE_DENOMINATOR).add(amountInWithFee)
    const amountOut = numerator.div(denominator)
  
    await tokenA.transfer(newTokenPair.address, swapAmount)
    await newTokenPair.swap(
      (tokenA.address < tokenB.address) ? 0 : amountOut,
      (tokenA.address < tokenB.address) ? amountOut : 0,
      wallet.address, '0x', overrides
    )

    // NOTE I think this swap is asking for less than it could get
    // here cus it doesn't take into account the change from the previous swap
    // For the purpose of these tests I think this is fine -JPK 11/08/20
    await tokenB.transfer(newTokenPair.address, swapAmount)
    await newTokenPair.swap(
      (tokenA.address < tokenB.address) ? amountOut : 0,
      (tokenA.address < tokenB.address) ? 0 : amountOut,
      wallet.address, '0x', overrides
    )
    
    await tokenA.transfer(newTokenPair.address, expandTo18Decimals(10))
    await tokenB.transfer(newTokenPair.address, expandTo18Decimals(10))
    await newTokenPair.mint(wallet.address, overrides)

    const protocolFeeReceiverBalance = await provider.getBalance(protocolFeeReceiver.address)

    await feeReceiver.connect(wallet).takeProtocolFee([newTokenPair.address], overrides)

    expect(await provider.getBalance(protocolFeeReceiver.address)).to.eq(protocolFeeReceiverBalance.toString())
    expect(await tokenA.balanceOf(protocolFeeReceiver.address)).to.eq(0)
    expect(await tokenB.balanceOf(protocolFeeReceiver.address)).to.eq(0)
    expect(await tokenA.balanceOf(dxdao.address)).to.be.above(0)
    expect(await tokenB.balanceOf(dxdao.address)).to.be.above(0)
  })
  
  it(
    'should receive only tokens when extracting fee from both tokenA-tonkenB pair and tokenC-tokenD pair',
    async () =>
  {
    const tokenAmount = expandTo18Decimals(100);
    const swapAmount = expandTo18Decimals(50);

    const amountInWithFee = swapAmount.mul(FEE_DENOMINATOR.sub(15))
    const numerator = amountInWithFee.mul(tokenAmount)
    const denominator = tokenAmount.mul(FEE_DENOMINATOR).add(amountInWithFee)
    const amountOut = numerator.div(denominator)

    // Set up tokenA-tokenB
    const tokenA = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
    const tokenB = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
    
    await factory.createPair(tokenA.address, tokenB.address);
    const newTokenPair = new Contract(
      await factory.getPair(
        (tokenA.address < tokenB.address) ? tokenA.address : tokenB.address,
        (tokenA.address < tokenB.address) ? tokenB.address : tokenA.address
      ), JSON.stringify(DXswapPair.abi), provider
    ).connect(wallet)

    await tokenA.transfer(newTokenPair.address, tokenAmount)
    await tokenB.transfer(newTokenPair.address, tokenAmount)
    await newTokenPair.mint(wallet.address, overrides)
  
    await tokenA.transfer(newTokenPair.address, swapAmount)
    await newTokenPair.swap(
      (tokenA.address < tokenB.address) ? 0 : amountOut,
      (tokenA.address < tokenB.address) ? amountOut : 0,
      wallet.address, '0x', overrides
    )

    // NOTE I think this swap is asking for less than it could get
    // here cus it doesn't take into account the change from the previous swap
    // For the purpose of these tests I think this is fine -JPK 11/08/20
    await tokenB.transfer(newTokenPair.address, swapAmount)
    await newTokenPair.swap(
      (tokenA.address < tokenB.address) ? amountOut : 0,
      (tokenA.address < tokenB.address) ? 0 : amountOut,
      wallet.address, '0x', overrides
    )
    
    await tokenA.transfer(newTokenPair.address, expandTo18Decimals(10))
    await tokenB.transfer(newTokenPair.address, expandTo18Decimals(10))
    await newTokenPair.mint(wallet.address, overrides)

    // Set up tokenC-tokenD pair
    const tokenC = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
    const tokenD = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
    
    await factory.createPair(tokenC.address, tokenD.address);
    const secondNewTokenPair = new Contract(
      await factory.getPair(
        (tokenC.address < tokenD.address) ? tokenC.address : tokenD.address,
        (tokenC.address < tokenD.address) ? tokenD.address : tokenC.address
      ), JSON.stringify(DXswapPair.abi), provider
    ).connect(wallet)

    await tokenC.transfer(secondNewTokenPair.address, tokenAmount)
    await tokenD.transfer(secondNewTokenPair.address, tokenAmount)
    await secondNewTokenPair.mint(wallet.address, overrides)

    await tokenC.transfer(secondNewTokenPair.address, swapAmount)
    await secondNewTokenPair.swap(
      (tokenC.address < tokenD.address) ? 0 : amountOut,
      (tokenC.address < tokenD.address) ? amountOut : 0,
      wallet.address, '0x', overrides
    )

    // NOTE I think this swap is asking for less than it could get
    // here cus it doesn't take into account the change from the previous swap
    // For the purpose of these tests I think this is fine -JPK 11/08/20
    await tokenD.transfer(secondNewTokenPair.address, swapAmount)
    await secondNewTokenPair.swap(
      (tokenC.address < tokenD.address) ? amountOut : 0,
      (tokenC.address < tokenD.address) ? 0 : amountOut,
      wallet.address, '0x', overrides
    )
    
    await tokenC.transfer(secondNewTokenPair.address, expandTo18Decimals(10))
    await tokenD.transfer(secondNewTokenPair.address, expandTo18Decimals(10))
    await secondNewTokenPair.mint(wallet.address, overrides)

    const protocolFeeReceiverBalance = await provider.getBalance(protocolFeeReceiver.address)

    await feeReceiver.connect(wallet).takeProtocolFee([newTokenPair.address, secondNewTokenPair.address], overrides)

    expect(await provider.getBalance(protocolFeeReceiver.address)).to.eq(protocolFeeReceiverBalance.toString())

    expect(await tokenA.balanceOf(protocolFeeReceiver.address)).to.eq(0)
    expect(await tokenB.balanceOf(protocolFeeReceiver.address)).to.eq(0)
    expect(await tokenA.balanceOf(dxdao.address)).to.be.above(0)
    expect(await tokenB.balanceOf(dxdao.address)).to.be.above(0)

    expect(await tokenC.balanceOf(protocolFeeReceiver.address)).to.eq(0)
    expect(await tokenD.balanceOf(protocolFeeReceiver.address)).to.eq(0)
    expect(await tokenC.balanceOf(dxdao.address)).to.be.above(0)
    expect(await tokenD.balanceOf(dxdao.address)).to.be.above(0)
  })

  it(
    'should only allow owner to transfer ownership',
    async () =>
  {
    await expect(feeReceiver.connect(other).transferOwnership(other.address)).to.be.revertedWith('DXswapFeeReceiver: FORBIDDEN')
  })

  it(
    'should only allow owner to change receivers',
    async () =>
  {
    await expect(feeReceiver.connect(other).changeReceivers(other.address, other.address)).to.be.revertedWith('DXswapFeeReceiver: FORBIDDEN')
  })

  it(
    'should revert with insufficient liquidity error if there is not any liquidity in the WETH pair',
    async () => 
  {
    const tokenAmount = expandTo18Decimals(100);
    const wethAmount = expandTo18Decimals(100);
    const swapAmount = expandTo18Decimals(50);

    await token0.transfer(pair.address, tokenAmount)
    await token1.transfer(pair.address, tokenAmount)
    await pair.mint(wallet.address, overrides)
        
    const amountInWithFee = swapAmount.mul(FEE_DENOMINATOR.sub(15))
    const numerator = amountInWithFee.mul(tokenAmount)
    const denominator = tokenAmount.mul(FEE_DENOMINATOR).add(amountInWithFee)
    const amountOut = numerator.div(denominator)
  
    await token0.transfer(pair.address, swapAmount)
    await pair.swap(0, amountOut, wallet.address, '0x', overrides)

    // NOTE I think this swap is asking for less than it could get
    // here cus it doesn't take into account the change from the previous swap
    // For the purpose of these tests I think this is fine -JPK 11/08/20
    await token1.transfer(pair.address, swapAmount)
    await pair.swap(amountOut, 0, wallet.address, '0x', overrides)
        
    await token0.transfer(pair.address, expandTo18Decimals(10))
    await token1.transfer(pair.address, expandTo18Decimals(10))
    await pair.mint(wallet.address, overrides)
  
    const protocolFeeReceiverBalance = await provider.getBalance(protocolFeeReceiver.address)

    await expect(feeReceiver.connect(wallet).takeProtocolFee([pair.address], overrides)).to.be.revertedWith('DXswapFeeReceiver: INSUFFICIENT_LIQUIDITY')
  })
})
