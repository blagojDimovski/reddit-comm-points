/* eslint no-use-before-define: "warn" */
const { ethers } = require("hardhat");
const rlp = require('rlp')
const {ADDR_BYTES, SMALL_BYTES, MED_BYTES, getGroupBitKeys} = require('./consts')
const { readData, writeData } = require('./utils');

const isInputValid = (hex) => {
    return hex !== '0x'
}

const nativeDecodeNewSingles = (input, amountLen = 1) => {

    let pointer = 0;

    addresses = {

    };

    while(input.length > 2) {
        let addr = ethers.utils.hexDataSlice(input, pointer, pointer + ADDR_BYTES);
        addr = ethers.utils.getAddress(addr);
        pointer += ADDR_BYTES;

        if(!isInputValid(input)) break;

        let amount = ethers.utils.hexDataSlice(input, pointer, pointer + amountLen);
        amount = ethers.BigNumber.from(amount).toString()
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
            addr = ethers.utils.getAddress(addr);
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

    while(input.length > 2) {
        let id = ethers.utils.hexDataSlice(input, pointer, pointer + idLen )
        id = ethers.BigNumber.from(id).toString();
        pointer += idLen;
        let amount = ethers.utils.hexDataSlice(input, pointer, pointer + amountLen )
        amount = ethers.BigNumber.from(amount).toString()
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
            id = ethers.BigNumber.from(id).toNumber();
            groups[amount].push(id);
            pointer += idLen;
        }
        input = ethers.utils.hexDataSlice(input, pointer)
        pointer = 0;
    }

    return groups;
}

const bitmapDecodeRepeatingGrouped = (input, amountLen= 1, headerLen = 1, rangeLen = 1, startIdLen = 1) => {

    groups = {

    };

    let pointer = 0;


    while(input.length > 2) {
        let amount = ethers.utils.hexDataSlice(input, pointer, pointer + amountLen )
        amount = ethers.BigNumber.from(amount).toString();
        groups[amount] = {
            startId: 0,
            range: 0,
            headerBytes: 0,
            header: '',
            rawBitmap: '',
            compressedBitmap: '',
            byteSize: 0,
            karma: amount
        };
        pointer += amountLen;

        let startId = ethers.utils.hexDataSlice(input, pointer, pointer + startIdLen )
        startId = ethers.BigNumber.from(startId).toNumber();
        groups[amount].startId = startId;
        pointer += startIdLen;

        let range = ethers.utils.hexDataSlice(input, pointer, pointer + rangeLen )
        range = ethers.BigNumber.from(range).toNumber();
        groups[amount].range = range;
        pointer += rangeLen;

        let headerBytes = ethers.utils.hexDataSlice(input, pointer, pointer + headerLen )
        headerBytes = ethers.BigNumber.from(headerBytes).toNumber()
        groups[amount].headerBytes = headerBytes;
        pointer += headerLen;

        let header = ethers.utils.hexDataSlice(input, pointer, pointer + headerBytes)
        pointer += headerBytes;

        let rawBitmap = '';
        let compressedBitmap = '';
        let headerBitmap = '';
        let nonEmptyBytes = 0;
        let headerArray = ethers.utils.arrayify(header);
        let headerBn = ethers.BigNumber.from(header).toString();
        let headerbint = BigInt(headerBn).toString(2)

        // TODO: test this
        for(let i = 0; i < headerArray.length; i++) {
            let byte = headerArray[i];
            let headerBits = (byte.toString(2)).padStart(8, '0');
            headerBitmap = `${headerBitmap}${headerBits}`
            for(let j = 0; j < headerBits.length; j++) {
                let headerBit = headerBits[j];
                if(headerBit === '0') {
                    rawBitmap = `${rawBitmap}00000000`
                } else {
                    let nonEmptyBitmapByte = ethers.utils.hexDataSlice(input, pointer, pointer + 1 )
                    pointer += 1

                    let nonEmptyByte = parseInt(nonEmptyBitmapByte, 16)
                    let bits = (nonEmptyByte.toString(2)).padStart(8, '0');
                    rawBitmap = `${rawBitmap}${bits}`
                    compressedBitmap = `${compressedBitmap}${bits}`
                    nonEmptyBytes++;
                }

            }

        }

        groups[amount].rawBitmap = rawBitmap;
        groups[amount].compressedBitmap = compressedBitmap;
        groups[amount].header = headerBitmap;
        groups[amount].byteSize = amountLen + startIdLen + rangeLen + headerLen + (headerBytes + nonEmptyBytes);

        input = ethers.utils.hexDataSlice(input, pointer)
        pointer = 0;
    }

    return groups;
}


const rlpDecodeNewSingles = (input) => {

    let pointer = 0;

    addresses = {
    };

    while(input.length > 2) {
        let addr = ethers.utils.hexDataSlice(input, pointer, pointer + ADDR_BYTES);
        addr = ethers.utils.getAddress(addr);
        pointer += ADDR_BYTES;
        let remainder = ethers.utils.hexDataSlice(input, pointer);
        let decoded = rlp.decode(remainder, true);
        let amount = ethers.BigNumber.from(decoded.data).toString()
        input = ethers.utils.hexlify(decoded.remainder)
        pointer = 0;
        addresses[addr] = amount
    }

    return addresses;
}

const rlpDecodeNewGrouped = (input) => {

    let groups = {

    };


    while(input.length > 2) {
        let decoded = rlp.decode(input, true);
        let amount = ethers.BigNumber.from(decoded.data).toString();
        groups[amount] = [];
        decoded = rlp.decode(decoded.remainder, true)
        let numAddresses = (ethers.BigNumber.from(decoded.data)).toNumber()
        input = decoded.remainder;

        for(let i = 0; i < numAddresses; i++) {
            let addr = ethers.utils.hexDataSlice(input, 0,  ADDR_BYTES);
            addr = ethers.utils.getAddress(addr);
            groups[amount].push(addr);
            input = ethers.utils.hexDataSlice(input, ADDR_BYTES)
        }
    }

    return groups;

}


const rlpDecodeRepeatingSingles = (input) => {
    ids = {
    };


    while(input.length > 2) {
        let decoded = rlp.decode(input, true);
        let id = ethers.BigNumber.from(decoded.data).toString();

        decoded = rlp.decode(decoded.remainder, true);
        let amount = ethers.BigNumber.from(decoded.data).toString()
        input = ethers.utils.hexlify(decoded.remainder)
        ids[id] = amount
    }

    return ids;
}

const rlpDecodeRepeatingGrouped = (input) => {

    groups = {

    };

    while(input.length > 2) {
        input = rlp.decode(input, true);
        let amount = ethers.BigNumber.from(input.data).toString();

        groups[amount] = [];
        input = rlp.decode(input.remainder, true);
        let numAddresses = (ethers.BigNumber.from(input.data)).toNumber()

        input = input.remainder;

        for(let i = 0; i < numAddresses; i++) {
            input = rlp.decode(input, true)
            let id = ethers.BigNumber.from(input.data).toNumber();
            groups[amount].push(id);
            input = input.remainder;
        }
    }

    return groups;
}

const handleDecoding = (key, data) => {
    let decoded;
    let groupsBitKeys = getGroupBitKeys();

    if(key === groupsBitKeys.rlpSingleNew.dec) {
        decoded = rlpDecodeNewSingles(data)
    } else if (key === groupsBitKeys.rlpGroupNew.dec) {
        decoded = rlpDecodeNewGrouped(data)
    } else if (key === groupsBitKeys.rlpSingleRepeat.dec) {
        decoded = rlpDecodeRepeatingSingles(data)
    } else if (key === groupsBitKeys.rlpGroupRepeat.dec) {
        decoded = rlpDecodeRepeatingGrouped(data)
    }

    else if(key === groupsBitKeys.nativeSingleNewAmountSmall.dec) {
        decoded = nativeDecodeNewSingles(data, SMALL_BYTES);
    } else if (key === groupsBitKeys.nativeSingleNewAmountMed.dec) {
        decoded = nativeDecodeNewSingles(data, MED_BYTES);
    }

    else if (key === groupsBitKeys.nativeGroupNewAmountSmallAddrLenSmall.dec) {
        decoded = nativeDecodeNewGrouped(data, SMALL_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.nativeGroupNewAmountSmallAddrLenMed.dec) {
        decoded = nativeDecodeNewGrouped(data, SMALL_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.nativeGroupNewAmountMedAddrLenSmall.dec) {
        decoded = nativeDecodeNewGrouped(data, MED_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.nativeGroupNewAmountMedAddrLenMed.dec) {
        decoded = nativeDecodeNewGrouped(data, MED_BYTES, MED_BYTES);
    }

    else if (key === groupsBitKeys.nativeSingleRepeatAmountSmallAddrSmall.dec) {
        decoded = nativeDecodeRepeatingSingles(data, SMALL_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.nativeSingleRepeatAmountSmallAddrMed.dec) {
        decoded = nativeDecodeRepeatingSingles(data, SMALL_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.nativeSingleRepeatAmountMedAddrSmall.dec) {
        decoded = nativeDecodeRepeatingSingles(data, MED_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.nativeSingleRepeatAmountMedAddrMed.dec) {
        decoded = nativeDecodeRepeatingSingles(data, MED_BYTES, MED_BYTES);
    }

    else if (key === groupsBitKeys.nativeGroupRepeatAmountSmallAddrLenSmallAddrSmall.dec) {
        decoded = nativeDecodeRepeatingGrouped(data, SMALL_BYTES, SMALL_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.nativeGroupRepeatAmountSmallAddrLenSmallAddrMed.dec) {
        decoded = nativeDecodeRepeatingGrouped(data, SMALL_BYTES, SMALL_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.nativeGroupRepeatAmountSmallAddrLenMedAddrSmall.dec) {
        decoded = nativeDecodeRepeatingGrouped(data, SMALL_BYTES, MED_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.nativeGroupRepeatAmountSmallAddrLenMedAddrMed.dec) {
        decoded = nativeDecodeRepeatingGrouped(data, SMALL_BYTES, MED_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.nativeGroupRepeatAmountMedAddrLenSmallAddrSmall.dec) {
        decoded = nativeDecodeRepeatingGrouped(data, MED_BYTES, SMALL_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.nativeGroupRepeatAmountMedAddrLenSmallAddrMed.dec) {
        decoded = nativeDecodeRepeatingGrouped(data, MED_BYTES, SMALL_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.nativeGroupRepeatAmountMedAddrLenMedAddrSmall.dec) {
        decoded = nativeDecodeRepeatingGrouped(data, MED_BYTES, MED_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.nativeGroupRepeatAmountMedAddrLenMedAddrMed.dec) {
        decoded = nativeDecodeRepeatingGrouped(data, MED_BYTES, MED_BYTES, MED_BYTES);
    }

    // input, amountLen= 1, headerLen = 1, rangeLen = 1, startIdLen = 1
    else if (key === groupsBitKeys.bitmaskAmountSmallHeaderNumSmallRangeSmallStartIdSmall.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, SMALL_BYTES, SMALL_BYTES, SMALL_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountSmallHeaderNumSmallRangeSmallStartIdMed.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, SMALL_BYTES, SMALL_BYTES, SMALL_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountSmallHeaderNumSmallRangeMedStartIdSmall.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, SMALL_BYTES, SMALL_BYTES, MED_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountSmallHeaderNumSmallRangeMedStartIdMed.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, SMALL_BYTES, SMALL_BYTES, MED_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountSmallHeaderNumMedRangeSmallStartIdSmall.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, SMALL_BYTES, MED_BYTES, SMALL_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountSmallHeaderNumMedRangeSmallStartIdMed.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, SMALL_BYTES, MED_BYTES, SMALL_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountSmallHeaderNumMedRangeMedStartIdSmall.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, SMALL_BYTES, MED_BYTES, MED_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountSmallHeaderNumMedRangeMedStartIdMed.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, SMALL_BYTES, MED_BYTES, MED_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountMedHeaderNumSmallRangeSmallStartIdSmall.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, MED_BYTES, SMALL_BYTES, SMALL_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountMedHeaderNumSmallRangeSmallStartIdMed.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, MED_BYTES, SMALL_BYTES, SMALL_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountMedHeaderNumSmallRangeMedStartIdSmall.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, MED_BYTES, SMALL_BYTES, MED_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountMedHeaderNumSmallRangeMedStartIdMed.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, MED_BYTES, SMALL_BYTES, MED_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountMedHeaderNumMedRangeSmallStartIdSmall.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, MED_BYTES, MED_BYTES, SMALL_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountMedHeaderNumMedRangeSmallStartIdMed.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, MED_BYTES, MED_BYTES, SMALL_BYTES, MED_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountMedHeaderNumMedRangeMedStartIdSmall.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, MED_BYTES, MED_BYTES, MED_BYTES, SMALL_BYTES);
    } else if (key === groupsBitKeys.bitmaskAmountMedHeaderNumMedRangeMedStartIdMed.dec) {
        decoded = bitmapDecodeRepeatingGrouped(data, MED_BYTES, MED_BYTES, MED_BYTES, MED_BYTES);
    }

    return decoded;
};

const decode = (data) => {

    let decodedData = {

    }

    for (let fName in data) {
        let fData = data[fName];
        let fDecodedData = {};

        for (let key in fData) {
            let binaryData = fData[key];
            let binData = binaryData.toString('hex');
            let binDataHex = "0x" + binData;
            let remainder = ethers.utils.hexDataSlice(binDataHex, 1)
            let batchType = ethers.utils.hexDataSlice(binDataHex, 0, 1)
            batchType = parseInt(batchType, 16)

            try {
                fDecodedData[key] = handleDecoding(batchType, remainder);
            } catch (e) {
                console.error(`Error while decoding data, encType, fName: ${fName}.`, e)
            }

        }

        decodedData[fName] = fDecodedData;

    }

    return decodedData

};



const decodeData = (argv) => {

    const dataset = argv.dataset;
    const encType = argv.encType;

    console.log(`[${dataset}][${encType}] Decoding data...`);

    const encodedData = readData(dataset, 'encoded', encType);
    let decodedData = decode(encodedData);

    writeData(decodedData, dataset, 'decoded', encType);

    console.log(`[${dataset}][${encType}] Data decoded!`);


};

module.exports = {
    decodeData
}

// decodeData({dataset: 'bricks', encType: 'rlp'})