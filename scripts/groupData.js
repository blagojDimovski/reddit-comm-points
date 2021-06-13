/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {readData, writeData, getBitmapStats, getByteSizeForRepeatingGroup, getByteSizeForRepeatingGroupBitmap, compareRepeatingGroupCosts} = require('./utils')
const {dataDirs, GAS_COST_BYTE, getNativeTemplate, getNativeTemplateWithBitmaps} = require('./consts')

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

const isSmallNum = (num) => {
    return parseInt(num) <= 255;
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
        let addrsLenSm = isSmallNum(addrsLen);

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

const groupDataNative = (dataNew, dataRepeating) => {
    // small = number that can be represented with 1 byte
    // med = number that can be represented with more than 1 byte

    const data = {}

    groupNewSingles(data, dataNew.singles);
    groupNewGroups(data, dataNew.groups);
    groupRepeatingSingles(data, dataRepeating.singles)


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

    return data;

};


const groupDataBitmaps = (dataNew, dataRepeating) => {
    // small = number that can be represented with 1 byte
    // med = number that can be represented with more than 1 byte

    const data = {}

    groupNewSingles(data, dataNew.singles);
    groupNewGroups(data, dataNew.groups);
    groupRepeatingSingles(data, dataRepeating.singles)

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
            let groupId = getBitGroupId(getBitGroupId([1, karmaSm, 1, 0, 1]));
            setGroupValue(data, groupId, addrId, karma);
        }

        if(addrsMd.length === 1) {
            // it is cheaper to classify this entity as repeated single rather than group
            let addrId = addrsMd.pop();
            let groupId = getBitGroupId([0, karmaSm, 1, 0, 1]);
            setGroupValue(data, groupId, addrId, karma);
        }

        if(addrs.length > 3 && addrsMd.length && addrsSm.length) {
            let costsBitmasks = getByteSizeForRepeatingGroupBitmap(karma, addrs, 'native');
            let costsAddrSmall = getByteSizeForRepeatingGroup(karma, addrsSm, 'native');
            if (costsBitmasks < costsAddrSmall) {
                setAsRepeatingGroupedBitmap(data.repeatingGroupedBitmaps, karma, karmaSm, addrs)
            } else {
                let costsAddrMed = getByteSizeForRepeatingGroup(karma, addrsMd, 'native');
                if(costsBitmasks < costsAddrMed) {
                    setAsRepeatingGroupedBitmap(data.repeatingGroupedBitmaps, karma, karmaSm, addrs)
                } else {
                    setAsRepeatingGrouped(data.repeatingGrouped, karma, karmaSm, addrsSm, addrsMd)
                }
            }
        } else {
            setAsRepeatingGrouped(data.repeatingGrouped, karma, karmaSm, addrsSm, addrsMd)
        }


    }

    return data;

}

const getBitGroupId = (inputs) => {
    let bitmask = '';
    for(let input of inputs) {
        let inputBit = input ? '1' : '0';
        bitmask = `${bitmask}${inputBit}`
    }
    if (bitmask.length < 8) {
        bitmask = bitmask.padStart(8, "0");
    }

    return bitmask;
}

const setAsRepeatingGrouped = (data, karma, karmaSm, addrsSm, addrsMd) => {
    let addrsSmLenSm = isSmallNum(addrsSm.length);
    let addrsMdLenSm = isSmallNum(addrsMd.length);

    if(addrsSm.length) {
        let groupId = getBitGroupId([addrsSmLenSm, 1, karmaSm, 1, 1, 1])
        setGroupValue(data, groupId, karma, addrsSm)
    }

    if (addrsMd.length) {
        let groupId = getBitGroupId([addrsMdLenSm, 0, karmaSm, 1, 1, 1])
        setGroupValue(data, groupId, karma, addrsMd)
    }

}


const setAsRepeatingGroupedBitmap = (data, karma, karmaSm, addrs) => {
    let bitmapStats = getBitmapStats(karma, addrs, 'native');
    let startIdSm = isSmallNum(bitmapStats.startId);
    let rangeSm = isSmallNum(bitmapStats.range);
    let headerSm = isSmallNum(bitmapStats.headerBytes)

    let groupId = getBitGroupId([1, startIdSm, rangeSm, headerSm, karmaSm, 1, 1, 1]);
    setGroupValue(data, groupId, karma, bitmapStats)
}


const group = (data, encType='rlp', bitmaps= false) => {

    let index = {};
    let groupedData = {};
    for (let fName in data) {
        let fData  = data[fName];

        const {newItems, repeatingItems} = filterNewAndRepeatingItems(fData, index);
        const groupedNew = groupByKarma(newItems);
        const groupedRepeating = groupByKarma(repeatingItems);

        if(encType === 'rlp') {
            groupedData[fName] = {
                '00000000': groupedNew.singles,
                '00000010': groupedNew.groups,
                '00000100': groupedRepeating.singles,
                '00000110': groupedRepeating.groups
            }
        } else if (encType === 'native') {
            groupedData[fName] = groupDataNative(groupedNew, groupedRepeating)
        } else {
            groupedData[fName] = groupDataBitmaps(groupedNew, groupedRepeating)
        }

    }

    return {
        data: groupedData,
        addrIndex: index
    }

}

const groupData = (argv) => {
    const dataset = argv.dataset;
    const encType = argv.encType;

    const jsonData = readData(dataset, 'json');

    console.log(`[${dataset}] Grouping data, enc type: [${encType}]...`);

    let groupedData = group(jsonData, encType);

    writeData(groupedData.data, dataset, 'grouped', encType);


    if(!fs.existsSync(dataDirs.addrIndex)) {
        fs.mkdirSync(dataDirs.addrIndex)
    }

    fs.writeFileSync(`${dataDirs.addrIndex}/${dataset}_${encType}_index.json`, JSON.stringify(groupedData.addrIndex))

    console.log(`[${dataset}] Data grouped! Enc type: [${encType}]...`);

};


module.exports = {
    groupData
}
