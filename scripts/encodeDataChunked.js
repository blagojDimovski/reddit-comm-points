/* eslint no-use-before-define: "warn" */
const {  ethers } = require("ethers");
const rlp = require('rlp')
const {readData, writeData} = require('./utils')
const {getGroupBitKeys} = require('./consts')
const {concat, arrayify, hexlify } = ethers.utils;

const numberToBytes = (num) => {
    let numBn = ethers.BigNumber.from(num);
    return arrayify(numBn)
};

const encodeSinglesNew = (groupedData, encType='rlp') => {

    let encodedChunks = [];

    for(let groupId in groupedData.groups) {
        let data = groupedData.groups[groupId];
        let encodedData = [];
        for (let addr of Object.keys(data)) {
            let karmaEncoded = numberToBytes(data[addr]);
            if(encType === 'rlp') {
                karmaEncoded = rlp.encode(karmaEncoded);
            }

            let itemBytes = concat([addr, karmaEncoded])
            encodedData.push(itemBytes);
        }

        encodedChunks.push(concat(encodedData));

    }
    return encodedChunks;

}

const encodeSinglesRepeating = (groupedData, encType = 'rlp') => {

    let encodedChunks = [];

    for(let groupId in groupedData.groups) {
        let data = groupedData.groups[groupId];
        let encodedData = [];
        for (let id of Object.keys(data)) {
            let karmaEncoded = numberToBytes(data[id]);
            let addrIdEncoded = numberToBytes(id);

            if (encType === 'rlp') {
                karmaEncoded = rlp.encode(karmaEncoded);
                addrIdEncoded = rlp.encode(addrIdEncoded);
            }

            let itemBytes = concat([addrIdEncoded, karmaEncoded])
            encodedData.push(itemBytes);
        }
        encodedChunks.push(concat(encodedData));
    }
    return encodedChunks;
}



const encodeGroupsNew = (groupedData, encType = 'rlp') => {

    // TODO : DEBUG this
    let encodedData = [];
    for (let amount in groupedData.amounts) {
        let data = groupedData.amounts[amount];

        for(let groupId in data.groups) {
            let addresses = data.groups[groupId]
            let addressBytes = concat(addresses)
            let amountEncoded = numberToBytes(amount);
            let numAddrEncoded = numberToBytes(addresses.length);
            if(encType === 'rlp') {
                amountEncoded = rlp.encode(amountEncoded);
                numAddrEncoded = rlp.encode(numAddrEncoded);
            }
            let itemBytes = concat([amountEncoded, numAddrEncoded, addressBytes]);
            encodedData.push(itemBytes);

        }

    }
    return encodedData
}


const encodeGroupsRepeating = (groupedData, encType = 'rlp') => {
    let encodedData = [];

    for (let amount in groupedData.amounts) {
        let data = groupedData.amounts[amount];
        for(let groupId in data.groups) {
            let ids = data.groups[groupId];
            let idsEncoded = [];
            let amountEncoded = numberToBytes(amount);
            let numAddrEncoded = numberToBytes(ids.length)
            if (encType === 'rlp') {
                amountEncoded = rlp.encode(amountEncoded);
                numAddrEncoded = rlp.encode(numAddrEncoded)
                idsEncoded = ids.map(addrId => rlp.encode(numberToBytes(addrId)))
            } else {
                idsEncoded = ids.map(addrId => numberToBytes(addrId))
            }

            let addrIdsBytes = concat(idsEncoded);

            let itemBytes = concat([amountEncoded, numAddrEncoded, addrIdsBytes]);
            encodedData.push(itemBytes)
        }

    }

    return encodedData;
}

const encodeGroupsRepeatingBitmap = (groupedData, encType = 'rlp') => {
    let encodedData = [];

    for (let amount in groupedData.amounts) {
        let data = groupedData.amounts[amount];
        for(let groupId in data.groups) {
            let groupData = data.groups[groupId];

            let amountEncoded = numberToBytes(amount);
            let startIdEncoded = numberToBytes(groupData.startId)
            let rangeEncoded = numberToBytes(groupData.range)
            let headerLenEncoded = numberToBytes(groupData.headerBytes)

            let header = BigInt(`0b${groupData.header}`)
            let headerEncoded = numberToBytes(header)

            let bitmap = BigInt(`0b${groupData.compressedBitmap}`)
            let bitmapEncoded = numberToBytes(bitmap)

            if (encType === 'rlp') {
                amountEncoded = rlp.encode(amountEncoded);
                startIdEncoded = rlp.encode(startIdEncoded)
                rangeEncoded = rlp.encode(rangeEncoded)
                headerLenEncoded = rlp.encode(headerLenEncoded)
            }

            let itemBytes = concat([amountEncoded, startIdEncoded, rangeEncoded, headerLenEncoded, headerEncoded, bitmapEncoded]);
            encodedData.push(itemBytes)
        }
    }


    return encodedData;
}


const handleEncoding = (key, data) => {
    let encoded;
    let groupsBitKeys = getGroupBitKeys();

    let encodedChunks = [];


    if(key === groupsBitKeys.rlpSingleNew.bin) {
        encodedChunks = encodeSinglesNew(data, 'rlp')
    } else if (key === groupsBitKeys.rlpGroupNew.bin) {
        encodedChunks = encodeGroupsNew(data, 'rlp')
    } else if (key === groupsBitKeys.rlpSingleRepeat.bin) {
        encodedChunks = encodeSinglesRepeating(data, 'rlp')
    } else if (key === groupsBitKeys.rlpGroupRepeat.bin) {
        encodedChunks = encodeGroupsRepeating(data, 'rlp')
    } else if (key === groupsBitKeys.nativeSingleNewAmountSmall.bin || key === groupsBitKeys.nativeSingleNewAmountMed.bin) {
        encodedChunks = encodeSinglesNew(data, 'native')
    } else if (
        key === groupsBitKeys.nativeGroupNewAmountSmallAddrLenSmall.bin ||
        key === groupsBitKeys.nativeGroupNewAmountSmallAddrLenMed.bin ||
        key === groupsBitKeys.nativeGroupNewAmountMedAddrLenSmall.bin ||
        key === groupsBitKeys.nativeGroupNewAmountMedAddrLenMed.bin
    ) {
        encodedChunks = encodeGroupsNew(data, 'native');
    } else if (
        key === groupsBitKeys.nativeSingleRepeatAmountSmallAddrSmall.bin ||
        key === groupsBitKeys.nativeSingleRepeatAmountSmallAddrMed.bin ||
        key === groupsBitKeys.nativeSingleRepeatAmountMedAddrSmall.bin ||
        key === groupsBitKeys.nativeSingleRepeatAmountMedAddrMed.bin
    ) {
        encodedChunks = encodeSinglesRepeating(data, 'native')
    } else if (
        key === groupsBitKeys.nativeGroupRepeatAmountSmallAddrLenSmallAddrSmall.bin ||
        key === groupsBitKeys.nativeGroupRepeatAmountSmallAddrLenSmallAddrMed.bin ||
        key === groupsBitKeys.nativeGroupRepeatAmountSmallAddrLenMedAddrSmall.bin ||
        key === groupsBitKeys.nativeGroupRepeatAmountSmallAddrLenMedAddrMed.bin ||
        key === groupsBitKeys.nativeGroupRepeatAmountMedAddrLenSmallAddrSmall.bin ||
        key === groupsBitKeys.nativeGroupRepeatAmountMedAddrLenSmallAddrMed.bin ||
        key === groupsBitKeys.nativeGroupRepeatAmountMedAddrLenMedAddrSmall.bin ||
        key === groupsBitKeys.nativeGroupRepeatAmountMedAddrLenMedAddrMed.bin
    ) {
        encodedChunks = encodeGroupsRepeating(data, 'native')
    } else {
        encodedChunks = encodeGroupsRepeatingBitmap(data, 'native')
    }
    return encodedChunks
}

const encode = (data, rounds= 1) => {

    const encodedData = {

    }

    let currRound = 0;

    for(let fName in data) {
        if(currRound === rounds) continue;

        fData = data[fName];

        encodedData[fName] = {}
        for (let key in fData) {
            if(!fData.hasOwnProperty(key)) continue;
            let dataGroup = fData[key];
            let encodedChunks = handleEncoding(key, dataGroup);
            for(let i = 0; i< encodedChunks.length; i++) {
                let encodedChunk = encodedChunks[i];
                let id = parseInt(key, 2);
                if(!(key in encodedData[fName])) {
                    encodedData[fName][key] = {
                    }
                }
                encodedData[fName][key][i] = concat([hexlify([id]), encodedChunk]);
            }


        }
        currRound++;

    }

    return encodedData;

};


const encodeDataChunked = (argv) => {
    const dataset = argv.dataset;
    const encType = argv.encType;
    let rounds = argv.rounds;

    console.log(`[${dataset}][${encType}] Encoding data...`);

    if(rounds === 0) {
        rounds = Object.keys(jsonData).length;
    }

    const groupedData = readData(dataset, 'groupedChunks',encType);
    let encodedData = encode(groupedData, rounds)

    writeData(encodedData, dataset, 'encodedChunked', encType);

    console.log(`[${dataset}][${encType}] Data encoded!`);

}

// encodeDataChunked({
//     dataset: 'bricks',
//     encType: 'native',
//     rounds: 2
// })

module.exports = {
    encodeDataChunked
}