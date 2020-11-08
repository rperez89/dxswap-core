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

  it('should receive everything in ETH from one WETH-token pair', async () => {
    
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
    
    await WETH.transfer(wethPair.address, swapAmount)
    await wethPair.swap(
      (token1.address < WETH.address) ? amountOut : 0,
      (token1.address < WETH.address) ? 0 : amountOut,
      wallet.address, '0x', overrides
    )

    await token1.transfer(wethPair.address, expandTo18Decimals(10))
    await WETH.transfer(wethPair.address, expandTo18Decimals(10))
    await wethPair.mint(wallet.address, overrides)
    
    await feeReceiver.takeProtocolFee([wethPair.address], overrides)
    
  })
  
  it(
    'should receive only tokens when extracting fee from token pair that has no path to WETH',
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

    await tokenB.transfer(newTokenPair.address, swapAmount)
    await newTokenPair.swap(
      (tokenA.address < tokenB.address) ? amountOut : 0,
      (tokenA.address < tokenB.address) ? 0 : amountOut,
      wallet.address, '0x', overrides
    )
    
    await tokenA.transfer(newTokenPair.address, expandTo18Decimals(10))
    await tokenB.transfer(newTokenPair.address, expandTo18Decimals(10))
    await newTokenPair.mint(wallet.address, overrides)

    await feeReceiver.connect(dxdao).takeProtocolFee([newTokenPair.address], overrides)

  })
  
})
