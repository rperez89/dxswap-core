pragma solidity ^0.8.0;

import './interfaces/IDXswapFactory.sol';
import './DXswapPair.sol';

contract DXswapFactory is IDXswapFactory {
    address public feeTo;
    address public feeToSetter;
    uint8 public protocolFeeDenominator = 9; // uses ~10% of each swap fee
    bytes32 public constant INIT_CODE_PAIR_HASH = keccak256(abi.encodePacked(type(DXswapPair).creationCode));

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view override returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        require(tokenA != tokenB, 'DXswapFactory: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'DXswapFactory: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'DXswapFactory: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(DXswapPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IDXswapPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, 'DXswapFactory: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, 'DXswapFactory: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }

    function setProtocolFee(uint8 _protocolFeeDenominator) external override {
        require(msg.sender == feeToSetter, 'DXswapFactory: FORBIDDEN');
        require(_protocolFeeDenominator > 0, 'DXswapFactory: FORBIDDEN_FEE');
        protocolFeeDenominator = _protocolFeeDenominator;
    }

    function setSwapFee(address _pair, uint32 _swapFee) external override {
        require(msg.sender == feeToSetter, 'DXswapFactory: FORBIDDEN');
        IDXswapPair(_pair).setSwapFee(_swapFee);
    }
}
