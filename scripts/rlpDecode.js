/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const chalk = require("chalk");
const { config, ethers, tenderly, run } = require("hardhat");
const R = require("ramda");
const rlp = require('rlp')

const { getFileNames } = require('./utils');

// const STRING_SHORT_START = 0x80;
// const STRING_LONG_START  = 0xb8;
// const LIST_SHORT_START   = 0xc0;
// const LIST_LONG_START    = 0xf8;
//
// const parseRLP = (memPtr) => {
//     let byte0 = memPtr[0]
//
//
//     let offset;
//     let dataLen;
//     parse
//     if(byte0 < STRING_SHORT_START) {
//         offset = 0;
//         dataLen = 1;
//     } else if (byte0 < STRING_LONG_START) {
//         offset = 1;
//         dataLen = byte0 - STRING_SHORT_START
//     } else if (byte0 < LIST_SHORT_START) {
//         let byteLen = byte0 - STRING_LONG_START
//
//         offset = byte0 + 0x1
//         safeParseInt(memPtr.slice(1, byteLen).toString('hex'), 16)
//
//
//     }
//
//
// }

const decodeBatchType0 = (input, size) => {

    let addrOffset = 20;
    let pointer = 1;

    addresses = {
    };

    while(input.length) {
        let addr = ethers.utils.hexDataSlice(input, pointer, pointer + addrOffset);
        pointer += addrOffset;
        let remainder = ethers.utils.hexDataSlice(input, pointer);
        if(remainder === '0x') {
            break;
        }
        let decoded = rlp.decode(remainder, true);
        let amount = ethers.BigNumber.from(decoded.data)
        input = ethers.utils.hexlify(decoded.remainder)
        pointer = 0;
        if (addresses[addr]) {
            addresses[addr] += amount.toNumber();
        } else {
            addresses[addr] = amount.toNumber()
        }
    }

    return {
        batchType: 0,
        totalAddresses: (Object.keys(addresses)).length,
        addresses: addresses,
        numBytes: size
    };
}

const decodeBatchType1 = (input, size) => {

    let addrOffset = 20;

    addresses = {

    };

    input = ethers.utils.hexDataSlice(input, 1);

    while(input.length > 2) {
        let decoded = rlp.decode(input, true);
        let amount = ethers.BigNumber.from(decoded.data).toNumber();
        decoded = rlp.decode(decoded.remainder, true)
        let numAddresses = (ethers.BigNumber.from(decoded.data)).toNumber()
        input = decoded.remainder;

        for(let i = 0; i < numAddresses; i++) {
            let addr = ethers.utils.hexDataSlice(input, 0,  addrOffset);
            if (addresses[addr]) {
                addresses[addr] += amount
            } else {
                addresses[addr] = amount
            }
            input = ethers.utils.hexDataSlice(input, addrOffset)
        }
    }

    return {
        batchType: 1,
        totalAddresses: (Object.keys(addresses)).length,
        addresses: addresses,
        numBytes: size
    }


}


const decodeBatchType2 = (input, size) => {
    ids = {
    };

    input = ethers.utils.hexDataSlice(input, 1)

    while(input.length > 2) {
        let decoded = rlp.decode(input, true);
        let id = ethers.BigNumber.from(decoded.data).toString();

        decoded = rlp.decode(decoded.remainder, true);
        let amount = ethers.BigNumber.from(decoded.data)
        input = ethers.utils.hexlify(decoded.remainder)

        if (ids[id]) {
            ids[id] += amount.toNumber();
        } else {
            ids[id] = amount.toNumber()
        }
    }

    return {
        batchType: 2,
        totalIds: (Object.keys(ids)).length,
        ids: ids,
        numBytes: size
    };
}

const decodeBatchType3 = (input, size) => {

    ids = {

    };

    input = ethers.utils.hexDataSlice(input, 1);

    while(input.length > 2) {
        input = rlp.decode(input, true);
        let amount = ethers.BigNumber.from(input.data);
        input = rlp.decode(input.remainder, true);
        let numAddresses = (ethers.BigNumber.from(input.data)).toNumber()

        input = input.remainder;

        for(let i = 0; i < numAddresses; i++) {
            input = rlp.decode(input, true)
            let id = ethers.BigNumber.from(input.data).toString();
            if (ids[id]) {
                ids[id] += amount.toNumber();
            } else {
                ids[id] = amount.toNumber()
            }
            input = input.remainder;
        }
    }

    return {
        batchType: 3,
        totalIds: (Object.keys(ids)).length,
        ids: ids,
        numBytes: size
    };
}


const decode = (dirPathRead, dirPathWrite) => {
    const subdirs = getFileNames(dirPathRead);
    for (let subdir of subdirs) {

        const data = {
            newSingles: [],
            newGrouped: [],
            repeatingSingles: [],
            repeatingGrouped: []
        }

        let files = getFileNames(`${dirPathRead}/${subdir}`)

        for (let file of files) {
            let binaryData = fs.readFileSync(`${dirPathRead}/${subdir}/${file}`);
            let size = Buffer.byteLength(binaryData);
            let binData = binaryData.toString('hex');
            let binDataHex = "0x" + binData;
            let dataSlice1 = ethers.utils.hexDataSlice(binDataHex, 0, 1)
            let batchType = parseInt(dataSlice1, 16)
            let decodedData;

            if(batchType === 0) {
                decodedData = decodeBatchType0(binDataHex, size)
                data.newSingles.push(decodedData)
            } else if (batchType === 1) {
                decodedData = decodeBatchType1(binDataHex, size)
                data.newGrouped.push(decodedData)
            } else if (batchType === 2) {
                decodedData = decodeBatchType2(binDataHex, size)
                data.repeatingSingles.push(decodedData)
            } else if (batchType === 3) {
                decodedData = decodeBatchType3(binDataHex, size)
                data.repeatingGrouped.push(decodedData)
            }
        }

        fs.writeFileSync(`${dirPathWrite}/${subdir}.json`, JSON.stringify(data), 'utf-8')

    }
};

const main = async () => {
    console.log("Decoding data...");

    const dirPathBricksRead = "reddit-data-encoded/bricks";
    const dirPathBricksWrite = "reddit-data-decoded/bricks";
    const dirPathMoonsRead = "reddit-data-encoded/moons";
    const dirPathMoonsWrite = "reddit-data-decoded/moons";

    console.log("Decoding bricks data...")
    decode(dirPathBricksRead, dirPathBricksWrite)

    // console.log("Decoding moons data...")
    // decode(dirPathMoonsRead, dirPathMoonsWrite)
    //
    // console.log("Data decoded!")



};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
