/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {readData, writeData, getBitmapStats, getByteSizeForRepeatingGroup, getBitmapStatsClusters, isSmallNum, groupAddresses} = require('./utils')
const {dataDirs, getGroupBitKeys} = require('./consts')

const groupByKarma = (data) => {
    const amountGroups = {};
    for (let item of data) {

        if(amountGroups[item.karma]) {
            amountGroups[item.karma].push(item.addrOrId)
        } else {
            amountGroups[item.karma] = [item.addrOrId]
        }
    }

    // get amount groups with more than 1 item in the group
    const filteredAmountGroups = {};
    const singles = {};
    for (let karma of Object.keys(amountGroups)) {
        if (amountGroups[karma].length > 1) {
            filteredAmountGroups[karma] = amountGroups[karma];
        } else {
            let addrOrId = amountGroups[karma][0]
            singles[addrOrId] = karma;
        }
    }

    return {groups: filteredAmountGroups, singles };
}

const filterNewAndRepeatingItems = (data, index) => {

    const newItems = [];
    const repeatingItems = [];

    for (let item of data) {

        if(item.address in index) {
            repeatingItems.push({
                addrOrId: index[item.address],
                karma: item.karma
            })
        } else {
            newItems.push({
                addrOrId: item.address,
                karma: item.karma
            })
            index[item.address] = Object.keys(index).length
        }

    }
    return {
        newItems,
        repeatingItems
    }

}



const setGroupValue = (data, groupId, key, value) => {
    if(groupId in data) {
        data[groupId][key] = value;
    } else {
        data[groupId] = {
            [key]: value
        }
    }
}


const groupNewSingles = (data, singles) => {
    for(let addr in singles) {
        let karma = singles[addr];
        let karmaSm = isSmallNum(karma);
        let groupId = getBitGroupId([karmaSm, 0, 0, 1])
        setGroupValue(data, groupId, addr, karma);
    }
}

const groupNewGroups = (data, groups) => {
    for (let karma in groups) {

        let addrs = groups[karma];
        let addrsLen = addrs.length;
        let karmaSm = isSmallNum(karma);
        // let addrsLenSm = isSmallNum(addrsLen);
        let addrsLenSm = 1;

        let groupId = getBitGroupId([addrsLenSm, 0, karmaSm, 0, 1, 1])
        setGroupValue(data, groupId, karma, addrs);

    }
};

const groupRepeatingSingles = (data, singles) => {
    for (let addr in singles) {
        let karma = singles[addr];
        let addrSm = isSmallNum(addr);
        let karmaSm = isSmallNum(karma);

        let groupId = getBitGroupId([addrSm, karmaSm, 1, 0, 1])
        setGroupValue(data, groupId, addr, karma);

    }
};

const groupDataNative = (dataNew, dataRepeating, maxItems = 50) => {
    // small = number that can be represented with 1 byte
    // med = number that can be represented with more than 1 byte

    const data = {}

    groupNewSingles(data, dataNew.singles);
    groupNewGroups(data, dataNew.groups);
    groupRepeatingSingles(data, dataRepeating.singles);


    for (let karma in dataRepeating.groups) {
        let addrs = dataRepeating.groups[karma];
        let karmaSm = isSmallNum(karma);
        let addrsSm = [];
        let addrsMd = []
        for (let addr of addrs) {
            if(isSmallNum(addr)) {
                addrsSm.push(addr);
            } else {
                addrsMd.push(addr);
            }
        }

        if(addrsSm.length === 1) {
            // it is cheaper to classify this entity as repeated single rather than group
            let addrId = addrsSm.pop();
            let groupId = getBitGroupId([1, karmaSm, 1, 0, 1]);
            setGroupValue(data, groupId, addrId, karma);
        }

        if(addrsMd.length === 1) {
            // it is cheaper to classify this entity as repeated single rather than group
            let addrId = addrsMd.pop();
            let groupId = getBitGroupId([0 ,karmaSm, 1, 0, 1]);
            setGroupValue(data, groupId, addrId, karma);
        }
        setAsRepeatingGrouped(data, karma, karmaSm, addrsSm, addrsMd);
    }

    for (let key in data) {
        if(key[6] === '1') {
            data[key] = makeGroupsChunks(data[key], maxItems);
        } else {
            data[key] = makeSinglesChunks(data[key], maxItems)
        }
    }

    return data;

};

const makeSinglesChunks = (dataNew, maxItems) => {

    let counter = 0;
    let items = {};
    let data = {
        maxPerGroup: maxItems,
        numGroups: 0,
        groups: {}
    };
    for (let addr in dataNew) {

        items[addr] = dataNew[addr];
        counter++;
        if (counter === maxItems) {
            counter = 0;
            let groupId = data.numGroups;
            data.groups[groupId] = items;
            data.numGroups += 1;
            items = {};
        }
    }

    if(counter !== 0)  {
        let groupId = data.numGroups;
        data.groups[groupId] = items;
        data.numGroups += 1;
    }
    return data;
}

const makeGroupsChunks = (dataNew, maxItems) => {

    const data = {
        maxPerGroup: maxItems,
        amounts: {}
    };

    for (let amount in dataNew) {

        if(!(amount in data.amounts)) {
            data.amounts[amount] = {
                numGroups: 0,
                groups: {

                }
            }
        }

        let addresses = dataNew[amount];

        let addrLen = addresses.length;
        while(addrLen > maxItems) {
            let addrChunk = addresses.slice(0, maxItems);
            addresses = addresses.slice(maxItems);
            addrLen = addresses.length;
            let groupId = data.amounts[amount].numGroups;
            data.amounts[amount].groups[groupId] = addrChunk;
            data.amounts[amount].numGroups += 1;
        }

        // add the last group
        let groupId = data.amounts[amount].numGroups;
        data.amounts[amount].groups[groupId] = addresses;
        data.amounts[amount].numGroups += 1;

    }

    return data;

}

const makeBitmapChunks = (dataNew, maxItems) => {

    const data = {
        maxPerGroup: maxItems,
        amounts: {}
    };

    for(let amount in dataNew) {

        if(!(amount in data.amounts)) {
            data.amounts[amount] = {
                numGroups: 0,
                groups: {

                }
            }
        }

        let bitmapData = dataNew[amount];

        let items = bitmapData['items'];
        let encType = bitmapData['encType'];

        let itemsLen = items.length;
        let groupId;
        let bitmapChunk;
        while(itemsLen > maxItems) {
            groupId = data.amounts[amount].numGroups;
            bitmapChunk = getBitmapStats(amount, items.slice(0, maxItems), encType);
            delete bitmapChunk['items'];
            delete bitmapChunk['encType'];
            data.amounts[amount].groups[groupId] = bitmapChunk;
            data.amounts[amount].numGroups += 1;
            items = items.slice(maxItems);
            itemsLen = items.length;
        }

        // handle the last chunk
        groupId = data.amounts[amount].numGroups;
        bitmapChunk = getBitmapStats(amount, items, encType);
        delete bitmapChunk['items'];
        delete bitmapChunk['encType'];

        data.amounts[amount].groups[groupId] = bitmapChunk;
        data.amounts[amount].numGroups += 1;

    }

    return data;

}


const groupDataRlp = (dataNew, dataRepeating, maxItems= 50) => {
    let groupsBitKeys = getGroupBitKeys()
    return {
        [groupsBitKeys.rlpSingleNew.bin]: makeSinglesChunks(dataNew.singles, maxItems),
        [groupsBitKeys.rlpGroupNew.bin]: makeGroupsChunks(dataNew.groups, maxItems),
        [groupsBitKeys.rlpSingleRepeat.bin]: makeSinglesChunks(dataRepeating.singles, maxItems),
        [groupsBitKeys.rlpGroupRepeat.bin]: makeGroupsChunks(dataRepeating.groups, maxItems)
    };
}

const groupDataBitmaps = (dataNew, dataRepeating, maxItems= 50) => {
    // small = number that can be represented with 1 byte
    // med = number that can be represented with more than 1 byte

    const data = {}

    groupNewSingles(data, dataNew.singles);
    groupNewGroups(data, dataNew.groups);
    groupRepeatingSingles(data, dataRepeating.singles)

    for (let karma in dataRepeating.groups) {
        let addrs = dataRepeating.groups[karma];
        let karmaSm = isSmallNum(karma);
        let {addrsSm, addrsMd} = groupAddresses(addrs);


        if(addrsSm.length === 1) {
            // it is cheaper to classify this entity as repeated single rather than group
            let addrId = addrsSm.pop();
            let groupId = getBitGroupId([1, karmaSm, 1, 0, 1]);
            setGroupValue(data, groupId, addrId, karma);
        }

        if(addrsMd.length === 1) {
            // it is cheaper to classify this entity as repeated single rather than group
            let addrId = addrsMd.pop();
            let groupId = getBitGroupId([0, karmaSm, 1, 0, 1]);
            setGroupValue(data, groupId, addrId, karma);
        }

        if((addrsSm.length + addrsMd.length) > 3) {
            let bitmapStats = getBitmapStats(karma, addrs, 'native');
            let costsAddrSmall = getByteSizeForRepeatingGroup(karma, addrsSm, 'native');
            let costsAddrMed = getByteSizeForRepeatingGroup(karma, addrsMd, 'native');
            if(bitmapStats.byteSize < costsAddrMed + costsAddrSmall) {
                setAsRepeatingGroupedBitmap(data, karma, karmaSm, bitmapStats)
            } else {
                setAsRepeatingGrouped(data, karma, karmaSm, addrsSm, addrsMd)
            }
        } else {
            setAsRepeatingGrouped(data, karma, karmaSm, addrsSm, addrsMd)
        }


    }

    for (let key in data) {
        if(key[0] === '1') {
            data[key] = makeBitmapChunks(data[key], maxItems)
        } else {
            if(key[6] === '1') {
                data[key] = makeGroupsChunks(data[key], maxItems);
            } else {
                data[key] = makeSinglesChunks(data[key], maxItems)
            }
        }

    }

    return data;

}


const testGroupDataBitmapsClustered = (dataNew, dataRepeating) => {
    const data = {repeating: {}, totalGasCost: 0, totalGasCostBitmap: 0, totalGasCostNative: 0, totalHybridGasCost: 0}

    for (let karma in dataRepeating.groups) {
        let addrs = dataRepeating.groups[karma];
        data['repeating'][karma] = getBitmapStatsClusters(karma, addrs, 'native');
        data.totalGasCost += data['repeating'][karma].gasCostMin;
        data.totalGasCostBitmap += data['repeating'][karma].bitmapGasCost;
        data.totalGasCostNative += data['repeating'][karma].nativeGasCost;
        data.totalHybridGasCost += data['repeating'][karma].hybridGasCostMin;

    }

    data.savingsVsBitmap = data.totalGasCostBitmap - data.totalGasCost;
    data.savingsVsNative = data.totalGasCostNative - data.totalGasCost;

    data.hybridSavingVsBitmap = data.totalGasCostBitmap - data.totalHybridGasCost;
    data.hybridSavingVsNative = data.totalGasCostNative - data.totalHybridGasCost;

    return data;
}

const getBitGroupId = (inputs) => {
    let bitmask = '';
    for(let input of inputs) {
        let inputBit = input ? '1' : '0';
        bitmask = `${bitmask}${inputBit}`
    }

    bitmask = bitmask.padStart(8, "0");

    return bitmask;
}

const setAsRepeatingGrouped = (data, karma, karmaSm, addrsSm, addrsMd) => {
    // let addrsSmLenSm = isSmallNum(addrsSm.length);
    // let addrsMdLenSm = isSmallNum(addrsMd.length);

    let addrsSmLenSm = 1
    let addrsMdLenSm = 1

    if(addrsSm.length) {
        let groupId = getBitGroupId([addrsSmLenSm, 1, karmaSm, 1, 1, 1])
        setGroupValue(data, groupId, karma, addrsSm)
    }

    if (addrsMd.length) {
        let groupId = getBitGroupId([addrsMdLenSm, 0, karmaSm, 1, 1, 1])
        setGroupValue(data, groupId, karma, addrsMd)
    }

}


const setAsRepeatingGroupedBitmap = (data, karma, karmaSm, bitmapStats) => {
    let startIdSm = isSmallNum(bitmapStats.startId);
    let rangeSm = isSmallNum(bitmapStats.range);
    let headerSm = isSmallNum(bitmapStats.headerBytes)

    let groupId = getBitGroupId([1, startIdSm, rangeSm, headerSm, karmaSm, 1, 1, 1]);
    setGroupValue(data, groupId, karma, bitmapStats)
}


const group = (data, encType='rlp', maxItems = 50, numRounds = 1) => {

    let index = {};
    let grouped = {};
    let totalSavings = {
        savingsVsBitmap: 0,
        savingsVsNative: 0,
        hybridSavingVsBitmap: 0,
        hybridSavingVsNative: 0,
    }
    let currtRound = 0;

    for (let fName in data) {

        if(currtRound === numRounds) break;

        let fData  = data[fName];

        const {newItems, repeatingItems} = filterNewAndRepeatingItems(fData, index);
        const groupedNew = groupByKarma(newItems);
        const groupedRepeating = groupByKarma(repeatingItems);

        if(encType === 'rlp') {
            grouped[fName] = groupDataRlp(groupedNew, groupedRepeating, maxItems);
        } else if (encType === 'native') {
            grouped[fName] = groupDataNative(groupedNew, groupedRepeating, maxItems)
        } else if (encType === 'bitmap') {
            grouped[fName] = groupDataBitmaps(groupedNew, groupedRepeating, maxItems)
        } else {
            grouped[fName] = testGroupDataBitmapsClustered(groupedNew, groupedRepeating)
            totalSavings.savingsVsBitmap += grouped[fName].savingsVsBitmap;
            totalSavings.savingsVsNative += grouped[fName].savingsVsNative;

            totalSavings.hybridSavingVsBitmap += grouped[fName].hybridSavingVsBitmap;
            totalSavings.hybridSavingVsNative += grouped[fName].hybridSavingVsNative;
        }
        console.log(`grouped ${fName}`)
        currtRound++;

    }

    return {
        data: grouped,
        totalSavings: totalSavings,
        addrIndex: index
    }

}

const makeTestData = (data) => {

    let fileNames = ['round_1_finalized', 'round_2_finalized'];
    let fData = data[fileNames[0]];
    let addrObjs = fData.slice(0, 100);
    let addrObjsNew = [];
    let counter = 0;
    let karma = 1;

    for(let addrObj of addrObjs) {
        if(counter === 100) break;
        if(counter >= 90) {
            karma = 2;
        }
        addrObjsNew.push({
            address: addrObj.address,
            karma: karma
        })
        counter++;
    }

    let newData = {};
    for (let fileName of fileNames) {
        newData[fileName] = addrObjsNew;
    }
    return newData;

}

const groupDataChunked = (argv) => {
    const dataset = argv.dataset;
    const encType = argv.encType;
    const test = argv.test;
    let rounds = argv.rounds;
    let maxItems = argv.maxItems;

    let jsonData = readData(dataset, 'json');

    console.log(`[${dataset}][${encType}] Grouping chunked data...`);

    let groupedData;


    if(test) {
        rounds = 2;
        maxItems = 100;
        jsonData = makeTestData(jsonData)
        groupedData = group(jsonData, encType, maxItems, rounds);
        writeData(groupedData.data, dataset, 'groupedChunksTest', encType);
    } else {

        if(rounds === 0) {
            rounds = Object.keys(jsonData).length;
        }

        groupedData = group(jsonData, encType, maxItems, rounds);
        writeData(groupedData.data, dataset, 'groupedChunks', encType);
    }


    if(!fs.existsSync(dataDirs.addrIndex)) {
        fs.mkdirSync(dataDirs.addrIndex)
    }

    fs.writeFileSync(`${dataDirs.addrIndex}/${dataset}_${encType}_index.json`, JSON.stringify(groupedData.addrIndex))

    console.log(`[${dataset}][${encType}] Data grouped with chunks!`);

};


module.exports = {
    groupDataChunked
}