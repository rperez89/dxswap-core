pragma solidity =0.5.16;

import './interfaces/IDXswapFactory.sol';
import './interfaces/IDXswapPair.sol';
import './interfaces/IWETH.sol';
import './libraries/TransferHelper.sol';
import './libraries/SafeMath.sol';


contract DXswapFeeReceiver {
    using SafeMath for uint;

    address public owner;
    mapping(address => address) public pairOwners;
    IDXswapFactory public factory;
    address public WETH;

    constructor(address _owner, address _factory, address _WETH) public {
        owner = _owner;
        factory = IDXswapFactory(_factory);
        WETH = _WETH;
    }
    
    function() external payable {}

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, 'DXswapFeeReceiver: FORBIDDEN');
        owner = newOwner;
    }
    
    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'DXswapFeeReceiver: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'DXswapFeeReceiver: ZERO_ADDRESS');
    }

    // calculates the CREATE2 address for a pair without making any external calls
    // Taken from DXswapRouter, removed the factory parameter
    function pairFor(address tokenA, address tokenB) internal view returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(uint(keccak256(abi.encodePacked(
                hex'ff',
                factory,
                keccak256(abi.encodePacked(token0, token1)),
                hex'2db943b381c6ef706828ea5e89f480bd449d4d3a2b98e6da97b30d0eb41fb6d6' // init code hash
            ))));
    }
    
    // fetches and sorts the reserves for a pair
    function getReserves(address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IDXswapPair(pairFor(tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }
    
    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    // Taken from DXswapRouter, removed the factory parameter
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut, uint swapFee) internal pure returns (uint amountOut) {
        require(amountIn > 0, 'DXswapFeeReceiver: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'DXswapFeeReceiver: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn.mul(uint(10000).sub(swapFee));
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(10000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }
    
    
    // Taken from DXswapRouter, removed the deadline argument
    function _swapTokensForETH(uint amountIn, address fromToken)
        internal
    {
        IDXswapPair pairToUse = IDXswapPair(pairFor(fromToken, WETH));
        
        (uint reserveIn, uint reserveOut) = getReserves(fromToken, WETH);
        uint amountOut = getAmountOut(amountIn, reserveIn, reserveOut, pairToUse.swapFee());
      
        TransferHelper.safeTransfer(
            fromToken, address(pairToUse), amountIn
        );
        
        (uint amount0Out, uint amount1Out) = fromToken < WETH ? (uint(0), amountOut) : (amountOut, uint(0));
        
        pairToUse.swap(
            amount0Out, amount1Out, address(this), new bytes(0)
        );
        
        IWETH(WETH).withdraw(amountOut);
        TransferHelper.safeTransferETH(owner, amountOut);
    }
    
    function isContract(address addr) internal returns (bool) {
        uint size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }

    // Transfer to the owner address the token converted into ETH if possible, if not just transfer the token.
    function _takeETHorToken(address token, uint amount) internal {
      if (token == WETH) {
        // If it is WETH, transfer directly to owner
        IWETH(WETH).withdraw(amount);
        TransferHelper.safeTransferETH(owner, amount);
      } else if (isContract(pairFor(token, WETH))) {
        // If it is not WETH and there is a direct path to WETH, swap and trasnfer WETH to owner
        _swapTokensForETH(amount, token);
      } else {
        // If it is not WETH and there is not a direct path to WETH, transfer tokens directly to owner
        TransferHelper.safeTransfer(token, owner, amount);
      }
    }
    
    // Take what was charged as protocol fee from the DXswap pair liquidity
    function takeProtocolFee(IDXswapPair pair) external {
        require(msg.sender == owner, 'DXswapFeeReceiver: FORBIDDEN');
        address token0 = pair.token0();
        address token1 = pair.token1();
        pair.transfer(address(pair), pair.balanceOf(address(this)));
        (uint amount0, uint amount1) = pair.burn(address(this));
        if (amount0 > 0)
            _takeETHorToken(token0, amount0);
        if (amount1 > 0)
            _takeETHorToken(token1, amount1);
    }

}
