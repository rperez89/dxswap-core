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
    
    // fetches and sorts the reserves for a pair
    // Taken from DXswapRouter, removed the factory parameter
    function getSwapFee(address tokenA, address tokenB) internal view returns (uint swapFee) {
        swapFee = IDXswapPair(pairFor(tokenA, tokenB)).swapFee();
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
    
    // performs chained getAmountOut calculations on any number of pairs
    // Taken from DXswapRouter, removed the factory parameter
    function getAmountsOut(uint amountIn, address[] memory path) internal view returns (uint[] memory amounts) {
        require(path.length >= 2, 'DXswapLibrary: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = getReserves(path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut, getSwapFee(path[i], path[i + 1]));
        }
    }
    
    // Taken from DXswapRouter, removed the deadline argument
    function _swap(uint[] memory amounts, address[] memory path, address _to) internal {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? pairFor(output, path[i + 2]) : _to;
            IDXswapPair(pairFor(input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }
    
    // Taken from DXswapRouter, removed the deadline argument
    function _swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] memory path, address to)
        internal
    {
        require(path[path.length - 1] == WETH, 'DXswapRouter: INVALID_PATH');
        uint[] memory amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'DXswapRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, pairFor(path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferETH(to, amounts[amounts.length - 1]);
    }
    
    // Transfer to the owner address the token converted into ETH if possible, if not just transfer the token.
    function _takeETHorToken(address token, uint amount) internal {
      if (token == WETH) {
        // If it is WETH, transfer directly to owner
        IWETH(WETH).withdraw(amount);
        TransferHelper.safeTransferETH(owner, amount);
      } else if (factory.getPair(token, WETH) != address(0)) {
        // If it is not WETH and there is a direct path to WETH, swap and trasnfer WETH to owner
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = WETH;
        _swapExactTokensForETH(amount, 0, path, owner);
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
        (uint amount0, uint amount1) = pair.burn(address(this));
        _takeETHorToken(token0, amount0);
        _takeETHorToken(token1, amount1);
    }

}
