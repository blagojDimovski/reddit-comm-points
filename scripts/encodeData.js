/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {  ethers } = require("hardhat");
const rlp = require('rlp')
const {getFileNames, readData, writeData} = require('./utils')

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



const encodeRlp = (data) => {

    const encodedData = {

    };

    for (let fName in data) {
        fData = data[fName]

        encodedData[fName] = {
            '01': concat([hexlify([0]), encodeSinglesNew(fData['01'], 'rlp')]),
            '00': concat([hexlify([1]), encodeGroupsNew(fData['00'], 'rlp')]),
            '11': concat([hexlify([2]), encodeSinglesRepeating(fData['11'], 'rlp')]),
            '10': concat([hexlify([3]), encodeGroupsRepeating(fData['10'], 'rlp')])
        }


    }

    return encodedData;

}

const encodeNative = (data) => {

    const encodedData = {

    }

    for(let fName in data) {
        fData = data[fName]

        encodedData[fName] = {
            newSingles: {
                amountSmall: concat([hexlify([0]), encodeSinglesNew(fData.newSingles.amountSmall, 'native')]),
                amountMed: concat([hexlify([1]), encodeSinglesNew(fData.newSingles.amountMed, 'native')]),
            },
            newGrouped: {
                amountSmall: {
                    numAddrSmall: concat([hexlify([2]), encodeGroupsNew(fData.newGrouped.amountSmall.numAddrSmall, 'native')]),
                    numAddrMed: concat([hexlify([3]), encodeGroupsNew(fData.newGrouped.amountSmall.numAddrMed, 'native')]),
                },
                amountMed: {
                    numAddrSmall: concat([hexlify([4]), encodeGroupsNew(fData.newGrouped.amountMed.numAddrSmall, 'native')]),
                    numAddrMed: concat([hexlify([5]), encodeGroupsNew(fData.newGrouped.amountMed.numAddrMed, 'native')]),
                }
            },
            repeatingSingles: {
                amountSmall: {
                    addrSmall: concat([hexlify([6]), encodeSinglesRepeating(fData.repeatingSingles.amountSmall.addrSmall, 'native')]),
                    addrMed: concat([hexlify([7]), encodeSinglesRepeating(fData.repeatingSingles.amountSmall.addrMed, 'native')]),
                },
                amountMed: {
                    addrSmall: concat([hexlify([8]), encodeSinglesRepeating(fData.repeatingSingles.amountMed.addrSmall, 'native')]),
                    addrMed: concat([hexlify([9]), encodeSinglesRepeating(fData.repeatingSingles.amountMed.addrMed, 'native')]),
                }
            },
            repeatingGrouped: {
                amountSmall: {
                    numAddrSmall: {
                        addrSmall: concat([hexlify([10]), encodeGroupsRepeating(fData.repeatingGrouped.amountSmall.numAddrSmall.addrSmall, 'native')]),
                        addrMed: concat([hexlify([11]), encodeGroupsRepeating(fData.repeatingGrouped.amountSmall.numAddrSmall.addrMed, 'native')])
                    },
                    numAddrMed: {
                        addrSmall: concat([hexlify([12]), encodeGroupsRepeating(fData.repeatingGrouped.amountSmall.numAddrMed.addrSmall, 'native')]),
                        addrMed: concat([hexlify([13]), encodeGroupsRepeating(fData.repeatingGrouped.amountSmall.numAddrMed.addrMed, 'native')])
                    }
                },
                amountMed: {
                    numAddrSmall: {
                        addrSmall: concat([hexlify([14]), encodeGroupsRepeating(fData.repeatingGrouped.amountMed.numAddrSmall.addrSmall, 'native')]),
                        addrMed: concat([hexlify([15]), encodeGroupsRepeating(fData.repeatingGrouped.amountMed.numAddrSmall.addrMed, 'native')]),
                    },
                    numAddrMed: {
                        addrSmall: concat([hexlify([16]), encodeGroupsRepeating(fData.repeatingGrouped.amountMed.numAddrMed.addrSmall, 'native')]),
                        addrMed: concat([hexlify([17]), encodeGroupsRepeating(fData.repeatingGrouped.amountMed.numAddrMed.addrMed, 'native')])
                    }
                }
            }
        }

    }

    return encodedData;

};


const encodeData = (argv) => {
    const dataset = argv.dataset;
    const encType = argv.encType;

    console.log(`[${dataset}] Encoding data, enc type: [${encType}]...`);

    const groupedData = readData(dataset, 'grouped',encType);
    let encodedData = encType === 'rlp' ? encodeRlp(groupedData) : encodeNative(groupedData);

    writeData(encodedData, dataset, 'encoded', encType);

    console.log(`[${dataset}] Data encoded! Enc type: [${encType}]...`);

}

module.exports = {
    encodeData
}