/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {  ethers } = require("hardhat");
const rlp = require('rlp')
const {getFileNames} = require('./utils')

const {concat, arrayify } = ethers.utils;

const toByteBN = (karmaStr) => {
    let karmaBn = ethers.BigNumber.from(karmaStr);
    return arrayify(karmaBn)
};

const encodeBT1 = (data) => {

    let encodedData = [];

    for (let item of data) {
        if (!item.blockchain_address || !item.karma) continue;
        let karmaByteBn = toByteBN(item.karma);
        let karmaEncoded = rlp.encode(karmaByteBn);
        encodedData = concat([encodedData, item.blockchain_address, karmaEncoded])
    }
    return encodedData;

}

const encodeBT2 = (data) => {

    let amountGroups = groupByAmount(data);

    let encodedData = [];
    for (let amount of Object.keys(amountGroups)) {
        let addressBytes = concat(amountGroups[amount])
        encodedData = concat([encodedData, rlp.encode(toByteBN(amount)), rlp.encode(toByteBN(amountGroups[amount].length)), addressBytes])
    }
    return encodedData;

}

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

const classify = async (dirPathRead, dirPathWrite, indexPath) => {

    const files = getFileNames(dirPathRead)
    let index = {};
    for (let file of files) {
        let data = fs.readFileSync(`${dirPathRead}/${file}`)
        data = JSON.parse(data.toString('utf-8'));


        const {newItems, repeatingItems} = filterNewAndRepeatingItems(data, index);
        const groupedNew = groupByKarma(newItems);
        const groupedRepeating = groupByKarma(repeatingItems);

        const classifiedData = {
            newSingles: groupedNew.singles,
            newGrouped: groupedNew.groups,
            repeatingSingles: groupedRepeating.singles,
            repeatingGrouped: groupedRepeating.groups
        }

        fs.writeFileSync(`${dirPathWrite}/${file}`, JSON.stringify(classifiedData));
    }

    fs.writeFileSync(indexPath, JSON.stringify(index), 'utf-8')

}


const main = async () => {
    console.log("Classifying data...");

    const dirPathBricksRead = "reddit-data-json/bricks";
    const indexPathBricks = "reddit-data-classified/index/bricks.json";
    const dirPathBricksWrite = "reddit-data-classified/bricks";

    const dirPathMoonsRead = "reddit-data-json/moons";
    const indexPathMoons = "reddit-data-classified/index/moons.json";
    const dirPathMoonsWrite = "reddit-data-classified/moons";

    console.log("Classifying bricks data...")
    await classify(dirPathBricksRead, dirPathBricksWrite, indexPathBricks);

    console.log("Classifying moons data...")
    await classify(dirPathMoonsRead, dirPathMoonsWrite, indexPathMoons);

    console.log("Data classified!")

};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
