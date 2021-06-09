/* eslint no-use-before-define: "warn" */
const { ethers } = require("hardhat");
const rlp = require('rlp')
const {ADDR_BYTES, SMALL_BYTES, MED_BYTES} = require('./consts')
const { readData, writeData } = require('./utils');

const isInputValid = (hex) => {
    return hex !== '0x'
}

const nativeDecodeNewSingles = (input, amountLen = 1) => {

    let pointer = 0;

    addresses = {
    };
    input = ethers.utils.hexlify(input)
    input = ethers.utils.hexDataSlice(input, 1);

    while(input.length > 2) {
        let addr = ethers.utils.hexDataSlice(input, pointer, pointer + ADDR_BYTES);
        pointer += ADDR_BYTES;

        if(!isInputValid(input)) break;

        let amount = ethers.utils.hexDataSlice(input, pointer, pointer + amountLen);
        amount = ethers.BigNumber.from(amount).toNumber()
        addresses[addr] = amount
        pointer += amountLen;
        input = ethers.utils.hexDataSlice(input, pointer);
        pointer = 0;
    }

    return addresses;
}

const nativeDecodeNewGrouped = (input, amountLen= 1, numAddrLen = 1) => {

    let groups = {

    };

    let pointer = 0;
    input = ethers.utils.hexlify(input);
    input = ethers.utils.hexDataSlice(input, 1);
    while(input.length > 2) {
        let amount = ethers.utils.hexDataSlice(input, pointer, pointer + amountLen);

        amount = ethers.BigNumber.from(amount).toString();
        groups[amount] = [];
        pointer += amountLen;
        let numAddresses = ethers.utils.hexDataSlice(input, pointer, pointer + numAddrLen);
        numAddresses = ethers.BigNumber.from(numAddresses).toNumber()
        pointer += numAddrLen;

        for(let i = 0; i < numAddresses; i++) {
            let addr = ethers.utils.hexDataSlice(input, pointer,  pointer + ADDR_BYTES);
            groups[amount].push(addr);
            pointer += ADDR_BYTES;
        }
        input = ethers.utils.hexDataSlice(input, pointer)
        pointer = 0;
    }

    return groups;

}


const nativeDecodeRepeatingSingles = (input, amountLen= 1, idLen= 1) => {
    ids = {
    };

    let pointer = 0;
    input = ethers.utils.hexlify(input);
    input = ethers.utils.hexDataSlice(input, 1);

    while(input.length > 2) {
        let id = ethers.utils.hexDataSlice(input, pointer, pointer + idLen )
        id = ethers.BigNumber.from(id).toString();
        pointer += idLen;
        let amount = ethers.utils.hexDataSlice(input, pointer, pointer + amountLen )
        amount = ethers.BigNumber.from(amount).toNumber()
        pointer += amountLen;

        input = ethers.utils.hexDataSlice(input, pointer)
        ids[id] = amount
        pointer = 0;
    }

    return ids;
}

const nativeDecodeRepeatingGrouped = (input, amountLen= 1, numAddrLen = 1, idLen = 1) => {

    groups = {

    };

    let pointer = 0;
    input = ethers.utils.hexlify(input);
    input = ethers.utils.hexDataSlice(input, 1);

    while(input.length > 2) {
        let amount = ethers.utils.hexDataSlice(input, pointer, pointer + amountLen )
        amount = ethers.BigNumber.from(amount).toString();
        groups[amount] = [];
        pointer += amountLen;

        let numAddresses = ethers.utils.hexDataSlice(input, pointer, pointer + numAddrLen )
        numAddresses = ethers.BigNumber.from(numAddresses).toNumber()
        pointer += numAddrLen;

        for(let i = 0; i < numAddresses; i++) {
            let id = ethers.utils.hexDataSlice(input, pointer,  pointer + idLen)
            id = ethers.BigNumber.from(id).toString();
            groups[amount].push(id);
            pointer += idLen;
        }
        input = ethers.utils.hexDataSlice(input, pointer)
        pointer = 0;
    }

    return groups;
}

const rlpDecodeNewSingles = (input) => {

    let pointer = 1;

    addresses = {
    };

    while(input.length) {
        let addr = ethers.utils.hexDataSlice(input, pointer, pointer + ADDR_BYTES);
        pointer += ADDR_BYTES;
        let remainder = ethers.utils.hexDataSlice(input, pointer);
        if(remainder === '0x') {
            break;
        }
        let decoded = rlp.decode(remainder, true);
        let amount = ethers.BigNumber.from(decoded.data).toNumber()
        input = ethers.utils.hexlify(decoded.remainder)
        pointer = 0;
        addresses[addr] = amount
    }

    return addresses;
}

const rlpDecodeNewGrouped = (input) => {

    let groups = {

    };

    input = ethers.utils.hexDataSlice(input, 1);

    while(input.length > 2) {
        let decoded = rlp.decode(input, true);
        let amount = ethers.BigNumber.from(decoded.data).toString();
        groups[amount] = [];
        decoded = rlp.decode(decoded.remainder, true)
        let numAddresses = (ethers.BigNumber.from(decoded.data)).toNumber()
        input = decoded.remainder;

        for(let i = 0; i < numAddresses; i++) {
            let addr = ethers.utils.hexDataSlice(input, 0,  ADDR_BYTES);
            groups[amount].push(addr);
            input = ethers.utils.hexDataSlice(input, ADDR_BYTES)
        }
    }

    return groups;

}


const rlpDecodeRepeatingSingles = (input) => {
    ids = {
    };

    input = ethers.utils.hexDataSlice(input, 1)

    while(input.length > 2) {
        let decoded = rlp.decode(input, true);
        let id = ethers.BigNumber.from(decoded.data).toString();

        decoded = rlp.decode(decoded.remainder, true);
        let amount = ethers.BigNumber.from(decoded.data).toNumber()
        input = ethers.utils.hexlify(decoded.remainder)
        ids[id] = amount
    }

    return ids;
}

const rlpDecodeRepeatingGrouped = (input) => {

    groups = {

    };

    input = ethers.utils.hexDataSlice(input, 1);

    while(input.length > 2) {
        input = rlp.decode(input, true);
        let amount = ethers.BigNumber.from(input.data).toString();

        groups[amount] = [];
        input = rlp.decode(input.remainder, true);
        let numAddresses = (ethers.BigNumber.from(input.data)).toNumber()

        input = input.remainder;

        for(let i = 0; i < numAddresses; i++) {
            input = rlp.decode(input, true)
            let id = ethers.BigNumber.from(input.data).toString();
            groups[amount].push(id);
            input = input.remainder;
        }
    }

    return groups;
}


const decodeRlp = (data) => {

    const decodedData = {

    };

    for (let fName in data) {
        let fData = data[fName];
        let fDecodedData = {};
        for(let key in fData) {
            let binaryData = fData[key];
            let size = Buffer.byteLength(binaryData);
            let binData = binaryData.toString('hex');
            let binDataHex = "0x" + binData;
            let dataSlice1 = ethers.utils.hexDataSlice(binDataHex, 0, 1)
            let batchType = parseInt(dataSlice1, 16)
            let decodedData;

            if(batchType === 0) {
                decodedData = rlpDecodeNewSingles(binDataHex, size)
            } else if (batchType === 1) {
                decodedData = rlpDecodeNewGrouped(binDataHex, size)
            } else if (batchType === 2) {
                decodedData = rlpDecodeRepeatingSingles(binDataHex, size)
            } else {
                decodedData = rlpDecodeRepeatingGrouped(binDataHex, size)
            }
            fDecodedData[key] = decodedData;

        }

        decodedData[fName] = fDecodedData;

    }

    return decodedData;

};

const decodeNative = (data) => {

    let decodedData = {

    }

    for (let fName in data) {
        let fData = data[fName];
        try {
            decodedData[fName] = {
            newSingles: {
                amountSmall: nativeDecodeNewSingles(fData.newSingles.amountSmall, SMALL_BYTES),
                amountMed: nativeDecodeNewSingles(fData.newSingles.amountMed, MED_BYTES)
            },
            newGrouped: {
                amountSmall: {
                    numAddrSmall: nativeDecodeNewGrouped(fData.newGrouped.amountSmall.numAddrSmall, SMALL_BYTES, SMALL_BYTES),
                    numAddrMed: nativeDecodeNewGrouped(fData.newGrouped.amountSmall.numAddrMed, SMALL_BYTES, MED_BYTES)
                },
                amountMed: {
                    numAddrSmall: nativeDecodeNewGrouped(fData.newGrouped.amountMed.numAddrSmall, MED_BYTES, SMALL_BYTES),
                    numAddrMed: nativeDecodeNewGrouped(fData.newGrouped.amountMed.numAddrMed, MED_BYTES, MED_BYTES)
                }
            },
            repeatingSingles: {
                amountSmall: {
                    addrSmall: nativeDecodeRepeatingSingles(fData.repeatingSingles.amountSmall.addrSmall, SMALL_BYTES, SMALL_BYTES),
                    addrMed: nativeDecodeRepeatingSingles(fData.repeatingSingles.amountSmall.addrMed, SMALL_BYTES, MED_BYTES)
                },
                amountMed: {
                    addrSmall: nativeDecodeRepeatingSingles(fData.repeatingSingles.amountMed.addrSmall, MED_BYTES, SMALL_BYTES),
                    addrMed: nativeDecodeRepeatingSingles(fData.repeatingSingles.amountMed.addrMed, MED_BYTES, MED_BYTES)
                }
            },
            repeatingGrouped: {
                amountSmall: {
                    numAddrSmall: {
                        addrSmall: nativeDecodeRepeatingGrouped(fData.repeatingGrouped.amountSmall.numAddrSmall.addrSmall, SMALL_BYTES, SMALL_BYTES, SMALL_BYTES),
                        addrMed: nativeDecodeRepeatingGrouped(fData.repeatingGrouped.amountSmall.numAddrSmall.addrMed, SMALL_BYTES, SMALL_BYTES, MED_BYTES)
                    },
                    numAddrMed: {
                        addrSmall: nativeDecodeRepeatingGrouped(fData.repeatingGrouped.amountSmall.numAddrMed.addrSmall, SMALL_BYTES, MED_BYTES, SMALL_BYTES),
                        addrMed: nativeDecodeRepeatingGrouped(fData.repeatingGrouped.amountSmall.numAddrMed.addrMed, SMALL_BYTES, MED_BYTES, MED_BYTES)
                    }
                },
                amountMed: {
                    numAddrSmall: {
                        addrSmall: nativeDecodeRepeatingGrouped(fData.repeatingGrouped.amountMed.numAddrSmall.addrSmall, MED_BYTES, SMALL_BYTES, SMALL_BYTES),
                        addrMed: nativeDecodeRepeatingGrouped(fData.repeatingGrouped.amountMed.numAddrSmall.addrMed, MED_BYTES, SMALL_BYTES, MED_BYTES)
                    },
                    numAddrMed: {
                        addrSmall: nativeDecodeRepeatingGrouped(fData.repeatingGrouped.amountMed.numAddrMed.addrSmall, MED_BYTES, MED_BYTES, SMALL_BYTES),
                        addrMed: nativeDecodeRepeatingGrouped(fData.repeatingGrouped.amountMed.numAddrMed.addrMed, MED_BYTES, MED_BYTES, MED_BYTES)
                    }
                }
            }
        }
        } catch (e) {
            console.error(`Error while decoding data, encType: [native] fName: ${fName}.`, e)
        }
    }

    return decodedData

};



const decodeData = (argv) => {
    console.log("Decoding data...");

    const dataset = argv.dataset;
    const encType = argv.encType;

    console.log(`[${dataset}] Decoding data, enc type: [${encType}]...`);

    const groupedData = readData(dataset, 'encoded', encType);
    let decodedData = encType === 'rlp' ? decodeRlp(groupedData) : decodeNative(groupedData);

    writeData(decodedData, dataset, 'decoded', encType);

    console.log(`[${dataset}] Data decoded! Enc type: [${encType}]...`);


};

module.exports = {
    decodeData
}

// decodeData({dataset: 'bricks', encType: 'native'})