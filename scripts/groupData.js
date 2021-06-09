/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {readData, writeData} = require('./utils')
const {dataDirs} = require('./consts')

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

const splitGroupedDataBySize = (dataNew, dataRepeating) => {
    // small = number that can be represented with 1 byte
    // med = number that can be represented with more than 1 byte

    const splitData = {
        newSingles: {
            amountSmall: {},
            amountMed: {}
        },
        newGrouped: {
            amountSmall: {
                numAddrSmall: {},
                numAddrMed: {},
            },
            amountMed: {
                numAddrSmall: {},
                numAddrMed: {}
            }
        },
        repeatingSingles: {
            amountSmall: {
                addrSmall: {},
                addrMed: {},
            },
            amountMed: {
                addrSmall: {},
                addrMed: {},
            }
        },
        repeatingGrouped: {
            amountSmall: {
                numAddrSmall: {
                    addrSmall: {},
                    addrMed: {}
                },
                numAddrMed: {
                    addrSmall: {},
                    addrMed: {}
                }
            },
            amountMed: {
                numAddrSmall: {
                    addrSmall: {},
                    addrMed: {}
                },
                numAddrMed: {
                    addrSmall: {},
                    addrMed: {}
                }
            }
        }
    }

    for(let addr in dataNew.singles) {
        let karma = dataNew.singles[addr];
        if(isSmallNum(karma)) {
            splitData.newSingles.amountSmall[addr] = karma;
        } else {
            splitData.newSingles.amountMed[addr] = karma;
        }
    }

    for (let karma in dataNew.groups) {

        let addrs = dataNew.groups[karma];
        let addrsLen = addrs.length;
        let karmaSm = isSmallNum(karma);
        let addrsLenSm = isSmallNum(addrsLen);
        if (karmaSm && addrsLenSm) {
            splitData.newGrouped.amountSmall.numAddrSmall[karma] = addrs;
        } else if (karmaSm && !addrsLenSm) {
            splitData.newGrouped.amountSmall.numAddrMed[karma] = addrs;
        } else if (!karmaSm && addrsLenSm) {
            splitData.newGrouped.amountMed.numAddrSmall[karma] = addrs;
        } else {
            splitData.newGrouped.amountMed.numAddrMed[karma] = addrs;
        }

    }

    for (let addr in dataRepeating.singles) {
        let karma = dataRepeating.singles[addr];
        let addrSm = isSmallNum(addr);
        let karmaSm = isSmallNum(karma);

        if(karmaSm && addrSm) {
            splitData.repeatingSingles.amountSmall.addrSmall[addr] = karma;
        } else if (karmaSm && !addrSm) {
            splitData.repeatingSingles.amountSmall.addrMed[addr] = karma
        } else if (!karmaSm && addrSm) {
            splitData.repeatingSingles.amountMed.addrSmall[addr] = karma
        } else {
            splitData.repeatingSingles.amountMed.addrMed[addr] = karma
        }


    }

    for (let karma in dataRepeating.groups) {
        let addrs = dataRepeating.groups[karma];
        let addrsLen = addrs.length;
        let karmaSm = isSmallNum(karma);
        let addrsLenSm = isSmallNum(addrsLen);
        let addrSm = true;
        for (let addr of addrs) {
            if(!isSmallNum(addr)) {
                addrSm = false;
                break
            }
        }

        if (karmaSm && addrsLenSm && addrSm) {
            splitData.repeatingGrouped.amountSmall.numAddrSmall.addrSmall[karma] = addrs;
        } else if (karmaSm && addrsLenSm && !addrSm) {
            splitData.repeatingGrouped.amountSmall.numAddrSmall.addrMed[karma] = addrs;
        } else if (karmaSm && !addrsLenSm && addrSm) {
            splitData.repeatingGrouped.amountSmall.numAddrMed.addrSmall[karma] = addrs;
        } else if (karmaSm && !addrsLenSm && !addrSm) {
            splitData.repeatingGrouped.amountSmall.numAddrMed.addrMed[karma] = addrs;
        } else if (!karmaSm && addrsLenSm && addrSm) {
            splitData.repeatingGrouped.amountMed.numAddrSmall.addrSmall[karma] = addrs;
        } else if (!karmaSm && addrsLenSm && !addrSm) {
            splitData.repeatingGrouped.amountMed.numAddrSmall.addrMed[karma] = addrs;
        } else if (!karmaSm && !addrsLenSm && addrSm){
            splitData.repeatingGrouped.amountMed.numAddrMed.addrSmall[karma] = addrs;
        } else {
            splitData.repeatingGrouped.amountMed.numAddrMed.addrMed[karma] = addrs;
        }


    }

    return splitData;

};

const group = (data, encType='rlp') => {

    let index = {};
    let groupedData = {};
    for (let fName in data) {
        let fData  = data[fName];

        const {newItems, repeatingItems} = filterNewAndRepeatingItems(fData, index);
        const groupedNew = groupByKarma(newItems);
        const groupedRepeating = groupByKarma(repeatingItems);

        if(encType === 'rlp') {
            groupedData[fName] = {
                newSingles: groupedNew.singles,
                newGrouped: groupedNew.groups,
                repeatingSingles: groupedRepeating.singles,
                repeatingGrouped: groupedRepeating.groups
            }
        } else {
            groupedData[fName] = splitGroupedDataBySize(groupedNew, groupedRepeating)
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
