/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {  ethers } = require("hardhat");
const rlp = require('rlp')
const {getFileNames} = require('./utils')

const {concat, arrayify } = ethers.utils;

const toByteBN = (karmaStr) => {
    let karmaBn = ethers.BigNumber.from(karmaStr);
    return arrayify(karmaBn)
};

const encodeBT1 = (data) => {

    let encodedData = [];

    for (let item of data) {
        if (!item.blockchain_address || !item.karma) continue;
        let karmaByteBn = toByteBN(item.karma);
        let karmaEncoded = rlp.encode(karmaByteBn);
        encodedData = concat([encodedData, item.blockchain_address, karmaEncoded])
    }
    return encodedData;

}

const encodeBT2 = (data) => {

    let amountGroups = groupByAmount(data);

    let encodedData = [];
    for (let amount of Object.keys(amountGroups)) {
        let addressBytes = concat(amountGroups[amount])
        encodedData = concat([encodedData, rlp.encode(toByteBN(amount)), rlp.encode(toByteBN(amountGroups[amount].length)), addressBytes])
    }
    return encodedData;

}

const groupByAmount = (data) => {
    const amountGroups = {};
    for (let item of data) {
        if(!item.blockchain_address || !item.karma) continue;

        if(amountGroups[item.karma]) {
            amountGroups[item.karma].push(item.blockchain_address)
        } else {
            amountGroups[item.karma] = [item.blockchain_address]
        }
    }
    return amountGroups;
}


const chunkItems = (items) => {

    let numItems = items.length;
    let chunks = 6;
    let itemsPerChunk = Math.floor(numItems / chunks);
    let remainingItems = numItems % chunks;
    let chunkedData = {};

    for (let i = 0; i < chunks; i++) {
        chunkedData[i] = [];
        let offset = i * itemsPerChunk;
        for (let j = 0; j < itemsPerChunk; j++) {
            chunkedData[i].push(items[offset + j])
        }
    }

    if(remainingItems > 0) {

        for (let i = numItems - remainingItems; i < items.length; i++) {
            chunkedData[chunks - 1].push(items[i])
        }

    }

    return chunkedData;

};

const encode = async (dirPathRead, dirPathWrite) => {

    const files = getFileNames(dirPathRead)
    for (let file of files) {
        let data = fs.readFileSync(`${dirPathRead}/${file}`)
        data = JSON.parse(data.toString('utf-8'));
        let fileName = file.replace('.json', '')

        let chunkedData = chunkItems(data);
        for (let chunkKey of Object.keys(chunkedData)) {

            let encodedBatchType1 = encodeBT1(chunkedData[chunkKey]);
            encodedBatchType1 = ethers.utils.concat([ethers.utils.hexlify([0]), encodedBatchType1])
            fs.writeFileSync(`${dirPathWrite}/b1_${fileName}_${chunkKey}`, encodedBatchType1)

            let encodedBatchType2 = encodeBT2(chunkedData[chunkKey]);
            encodedBatchType2 = ethers.utils.concat([ethers.utils.hexlify([1]), encodedBatchType2])
            fs.writeFileSync(`${dirPathWrite}/b2_${fileName}_${chunkKey}`, encodedBatchType2)

        }

    }
}


const main = async () => {
    console.log("Encoding data...");

    const dirPathBricksRead = "reddit-data-json/bricks";
    const dirPathBricksWrite = "reddit-data-encoded/bricks";

    const dirPathMoonsRead = "reddit-data-json/moons";
    const dirPathMoonsWrite = "reddit-data-encoded/moons";

    console.log("Encoding bricks data...")
    await encode(dirPathBricksRead, dirPathBricksWrite);

    console.log("Encoding moons data...")
    await encode(dirPathMoonsRead, dirPathMoonsWrite);

    console.log("Data encoded!")

};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
