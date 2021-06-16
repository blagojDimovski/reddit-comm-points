/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {  ethers } = require("hardhat");
const rlp = require('rlp')
const {getFileNames, readData, writeData} = require('./utils')
const {getGroupBitKeys} = require('./consts')
const {concat, arrayify, hexlify } = ethers.utils;

const numberToBytes = (num) => {
    let numBn = ethers.BigNumber.from(num);
    return arrayify(numBn)
};

const encodeSinglesNew = (data, encType='rlp') => {

    let encodedData = [];

    for (let addr of Object.keys(data)) {
        let karmaEncoded = numberToBytes(data[addr]);
        if(encType === 'rlp') {
            karmaEncoded = rlp.encode(karmaEncoded);
        }

        let itemBytes = concat([addr, karmaEncoded])
        encodedData.push(itemBytes);
    }

    return concat(encodedData);

}

const encodeSinglesRepeating = (data, encType = 'rlp') => {

    let encodedData = [];
    for (let id of Object.keys(data)) {
        let karmaEncoded = numberToBytes(data[id]);
        let addrIdEncoded = numberToBytes(id);

        if(encType === 'rlp') {
            karmaEncoded = rlp.encode(karmaEncoded);
            addrIdEncoded = rlp.encode(addrIdEncoded);
        }

        let itemBytes = concat([addrIdEncoded, karmaEncoded])
        encodedData.push(itemBytes);
    }
    return concat(encodedData);
}



const encodeGroupsNew = (data, encType = 'rlp') => {

    let encodedData = [];
    for (let amount of Object.keys(data)) {
        let addressBytes = concat(data[amount])
        let amountEncoded = numberToBytes(amount);
        let numAddrEncoded = numberToBytes(data[amount].length);
        if(encType === 'rlp') {
            amountEncoded = rlp.encode(amountEncoded);
            numAddrEncoded = rlp.encode(numAddrEncoded);
        }
        let itemBytes = concat([amountEncoded, numAddrEncoded, addressBytes]);
        encodedData.push(itemBytes);
    }

    return concat(encodedData);

}


const encodeGroupsRepeating = (data, encType = 'rlp') => {
    let encodedData = [];
    for (let amount of Object.keys(data)) {
        let idsEncoded = [];
        let amountEncoded = numberToBytes(amount);
        let numAddrEncoded = numberToBytes(data[amount].length)
        if (encType === 'rlp') {
            amountEncoded = rlp.encode(amountEncoded);
            numAddrEncoded = rlp.encode(numAddrEncoded)
            idsEncoded = data[amount].map(addrId => rlp.encode(numberToBytes(addrId)))
        } else {
            idsEncoded = data[amount].map(addrId => numberToBytes(addrId))
        }

        let addrIdsBytes = concat(idsEncoded);

        let itemBytes = concat([amountEncoded, numAddrEncoded, addrIdsBytes]);
        encodedData.push(itemBytes)
    }

    return concat(encodedData);
}

const encodeGroupsRepeatingBitmap = (data, encType = 'rlp') => {
    let encodedData = [];
    // TODO: test this out
    for (let amount of Object.keys(data)) {
        let amountEncoded = numberToBytes(amount);
        let startIdEncoded = numberToBytes(data[amount].startId)
        let rangeEncoded = numberToBytes(data[amount].range)
        let headerLenEncoded = numberToBytes(data[amount].headerBytes)

        let header = BigInt(`0b${data[amount].header}`)
        let headerEncoded = numberToBytes(header)

        let bitmap = BigInt(`0b${data[amount].compressedBitmap}`)
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

    return concat(encodedData);
}


const handleEncoding = (key, data) => {
    let encoded;
    let groupsBitKeys = getGroupBitKeys();

    if(key === groupsBitKeys.rlpSingleNew.bin) {
        encoded = encodeSinglesNew(data, 'rlp')
    } else if (key === groupsBitKeys.rlpGroupNew.bin) {
        encoded = encodeGroupsNew(data, 'rlp')
    } else if (key === groupsBitKeys.rlpSingleRepeat.bin) {
        encoded = encodeSinglesRepeating(data, 'rlp')
    } else if (key === groupsBitKeys.rlpGroupRepeat.bin) {
        encoded = encodeGroupsRepeating(data, 'rlp')
    } else if (key === groupsBitKeys.nativeSingleNewAmountSmall.bin || key === groupsBitKeys.nativeSingleNewAmountMed.bin) {
        encoded = encodeSinglesNew(data, 'native')
    } else if (
        key === groupsBitKeys.nativeGroupNewAmountSmallAddrLenSmall.bin ||
        key === groupsBitKeys.nativeGroupNewAmountSmallAddrLenMed.bin ||
        key === groupsBitKeys.nativeGroupNewAmountMedAddrLenSmall.bin ||
        key === groupsBitKeys.nativeGroupNewAmountMedAddrLenMed.bin
    ) {
        encoded = encodeGroupsNew(data, 'native');
    } else if (
        key === groupsBitKeys.nativeSingleRepeatAmountSmallAddrSmall.bin ||
        key === groupsBitKeys.nativeSingleRepeatAmountSmallAddrMed.bin ||
        key === groupsBitKeys.nativeSingleRepeatAmountMedAddrSmall.bin ||
        key === groupsBitKeys.nativeSingleRepeatAmountMedAddrMed.bin
    ) {
        encoded = encodeSinglesRepeating(data, 'native')
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
        encoded = encodeGroupsRepeating(data, 'native')
    } else {
        encoded = encodeGroupsRepeatingBitmap(data, 'native')
    }
    return encoded
}

const encode = (data) => {

    const encodedData = {

    }

    for(let fName in data) {
        fData = data[fName]


        encodedData[fName] = {}
        for (let key in fData) {
            if(!fData.hasOwnProperty(key)) continue;
            let dataGroup = fData[key];
            let encoded = handleEncoding(key, dataGroup);

            let id = parseInt(key, 2);
            encodedData[fName][key] = concat([hexlify([id]), encoded]);
        }

    }

    return encodedData;

};


const encodeData = (argv) => {
    const dataset = argv.dataset;
    const encType = argv.encType;

    console.log(`[${dataset}][${encType}] Encoding data...`);

    const groupedData = readData(dataset, 'grouped',encType);
    let encodedData = encode(groupedData)

    writeData(encodedData, dataset, 'encoded', encType);

    console.log(`[${dataset}][${encType}] Data encoded!`);

}

// encodeData({dataset: 'bricks', encType: 'bitmap'})

module.exports = {
    encodeData
}