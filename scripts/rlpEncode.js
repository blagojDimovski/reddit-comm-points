/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {  ethers } = require("hardhat");
const rlp = require('rlp')
const {getFileNames} = require('./utils')

const {concat, arrayify } = ethers.utils;

const numberToBytes = (num) => {
    let numBn = ethers.BigNumber.from(num);
    return arrayify(numBn)
};

const encodeSinglesNew = (data) => {

    let encodedData = [];

    for (let addr of Object.keys(data)) {
        let karmaBytes = numberToBytes(data[addr]);
        let karmaEncoded = rlp.encode(karmaBytes);

        let itemBytes = concat([addr, karmaEncoded])
        encodedData.push(itemBytes);
    }

    console.log("encoded single new bytes: ", encodedData[0].byteLength);

    return concat(encodedData);

}

const encodeSinglesRepeating = (data) => {

    let encodedData = [];
    for (let id of Object.keys(data)) {
        let karmaBytes = numberToBytes(data[id]);
        let karmaEncoded = rlp.encode(karmaBytes);

        let addrIdBytes = numberToBytes(id);
        let addrIdEncoded = rlp.encode(addrIdBytes);
        let itemBytes = concat([addrIdEncoded, karmaEncoded])
        encodedData.push(itemBytes);
    }
    console.log("encoded single repeating bytes: ", encodedData[0].byteLength);
    return concat(encodedData);
}



const encodeGroupsNew = (amountGroups) => {

    let encodedData = [];
    for (let amount of Object.keys(amountGroups)) {
        let addressBytes = concat(amountGroups[amount])
        let amountEncoded = rlp.encode(numberToBytes(amount));
        let numAddrEncoded = rlp.encode(numberToBytes(amountGroups[amount].length));
        let itemBytes = concat([amountEncoded, numAddrEncoded, addressBytes]);
        encodedData.push(itemBytes);
    }

    console.log("encoded group new bytes: ", encodedData[0].byteLength)
    return concat(encodedData);

}


const encodeGroupsRepeating = (amountGroups) => {

    let encodedData = [];
    for (let amount of Object.keys(amountGroups)) {
        let idsEncoded = [];
        for (let addrId of amountGroups[amount]) {
            let idBytes = numberToBytes(addrId);
            let idEncoded = rlp.encode(idBytes);
            idsEncoded.push(idEncoded)
        }
        let addrIdsBytes = concat(idsEncoded);

        let amountEncoded = rlp.encode(numberToBytes(amount));
        let numAddrEncoded = rlp.encode(numberToBytes(amountGroups[amount].length));
        let itemBytes = concat([amountEncoded, numAddrEncoded, addrIdsBytes]);
        encodedData.push(itemBytes)
    }

    console.log("encoded group repeating bytes: ", encodedData[0].byteLength)
    return concat(encodedData);
}



const encode = async (dirPathRead, dirPathWrite) => {

    const files = getFileNames(dirPathRead)
    for (let file of files) {
        let data = fs.readFileSync(`${dirPathRead}/${file}`)
        data = JSON.parse(data.toString('utf-8'));
        let subdirName = file.replace('.json', '')

        fs.mkdirSync(`${dirPathWrite}/${subdirName}`)

        let index = 0;
        for (let batch of data.newSingles) {
            if(Object.keys(batch).length === 0) continue;
            let encodedBatch = encodeSinglesNew(batch);
            encodedBatch = ethers.utils.concat([ethers.utils.hexlify([0]), encodedBatch])
            fs.writeFileSync(`${dirPathWrite}/${subdirName}/b_0_${index}`, encodedBatch)
            index += 1;
        }

        index = 0;
        for (let batch of data.newGrouped) {
            if(Object.keys(batch).length === 0) continue;
            let encodedBatch = encodeGroupsNew(batch);
            encodedBatch = ethers.utils.concat([ethers.utils.hexlify([1]), encodedBatch])
            fs.writeFileSync(`${dirPathWrite}/${subdirName}/b_1_${index}`, encodedBatch)
            index += 1;
        }

        index = 0;
        for (let batch of data.repeatingSingles) {
            if(Object.keys(batch).length === 0) continue;
            let encodedBatch = encodeSinglesRepeating(batch);
            encodedBatch = ethers.utils.concat([ethers.utils.hexlify([2]), encodedBatch])
            fs.writeFileSync(`${dirPathWrite}/${subdirName}/b_2_${index}`, encodedBatch)
            index += 1;
        }

        index = 0;
        for (let batch of data.repeatingGrouped) {
            if(Object.keys(batch).length === 0) continue;
            let encodedBatch = encodeGroupsRepeating(batch);
            encodedBatch = ethers.utils.concat([ethers.utils.hexlify([3]), encodedBatch])
            fs.writeFileSync(`${dirPathWrite}/${subdirName}/b_3_${index}`, encodedBatch)
            index += 1;
        }
    }
}


const main = async () => {
    console.log("Encoding data...");

    const dirPathBricksRead = "reddit-data-parsed/bricks";
    const dirPathBricksWrite = "reddit-data-encoded/bricks";

    const dirPathMoonsRead = "reddit-data-parsed/moons";
    const dirPathMoonsWrite = "reddit-data-encoded/moons";

    console.log("Encoding bricks data...")
    await encode(dirPathBricksRead, dirPathBricksWrite);
    //
    // console.log("Encoding moons data...")
    // await encode(dirPathMoonsRead, dirPathMoonsWrite);

    console.log("Data encoded!")

};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
