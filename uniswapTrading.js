const { ethers } = require("ethers");
const {
  abi: IUniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const {
  abi: SwapRouterABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json");
const ERC20ABI = require("./abi.json");

require("dotenv").config();
const INFURA_URL_TESTNET = process.env.INFURA_URL_TESTNET;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const WALLET_SECRET = process.env.WALLET_SECRET;

const provider = new ethers.providers.JsonRpcProvider(INFURA_URL_TESTNET);
const poolAddress = "0x4D7C363DED4B3b4e1F954494d2Bc3955e49699cC"; // UNI/WETH
const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

//Wrapped Native Token Details:
const name0 = "Wrapped Ether";
const symbol0 = "WETH";
const decimals0 = 18;
const address0 = "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889";

const name1 = "Uniswap Token";
const symbol1 = "UNI";
const decimals1 = 18;
const address1 = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";

const getPoolImmutables = async (poolContract) => {
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0,
    poolContract.token1,
    poolContract.fee,
  ]);

  // creating an object to return theses at once
  const immutables = {
    token0: token0,
    token1: token1,
    fee: fee,
  };

  return immutables;
};

const getPoolState = async (poolContract) => {
  const slot = poolContract.slot0();

  const state = {
    sqrtPriceX96: slot[0],
  };

  return state;
};
async function main() {
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
  );

  const immutables = await getPoolImmutables(poolContract);
  const state = await getPoolState(poolContract);

  const wallet = new ethers.Wallet(WALLET_SECRET);
  const connectedWallet = wallet.connect(provider);

  const swapRouterContract = new ethers.Contract(
    swapRouterAddress,
    SwapRouterABI,
    provider
  );

  const inputAmount = 0.001;
  //0.001 -> 1_000_000_000_000_000
  const amountIn = ethers.utils.parseUnits(inputAmount.toString(), decimals0);

  const approvalAmount = (amountIn * 100000).toString();
  const tokenContract0 = new ethers.Contract(address0, ERC20ABI, provider);
  const approvalResponse = await tokenContract0
    .connect(connectedWallet)
    .approve(swapRouterAddress, approvalAmount);

  const params = {
    tokenIn: immutables.token1,
    tokenOut: immutables.token0,
    fee: immutables.fee,
    recipient: WALLET_ADDRESS,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };

  const transaction = swapRouterContract
    .connect(connectedWallet)
    .exactInputSingle(params, {
      gasLimit: ethers.utils.hexlify(1000000),
    })
    .then((transaction) => {
      console.log(transaction);
    });
}
main();
