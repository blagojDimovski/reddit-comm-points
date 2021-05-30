/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const chalk = require("chalk");
const { config, ethers, tenderly, run } = require("hardhat");
const pointsJson = require("../artifacts/contracts/SubRedditPoints.sol/SubredditPoints_v0.json");


const main = async () => {
    let txData = fs.readFileSync('batch-minting/bricks/txData.json', 'utf-8')
    txData = JSON.parse(txData);

    let l2CallData = txData.l2Receipts[0].data;
    let l1CallData = txData.l1Stats.txData[0].data;

    console.log('l2 calldata length', l2CallData.length)
    console.log('l1 calldata length', l1CallData.length)



};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
