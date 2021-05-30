/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {getFileNames} = require('./utils')


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
    return parseInt(num) <= 127;
}

const chunkData = (classifiedData, bytesPerBatch) => {

    const addrBytes = 20;
    const smallNumBytes = 1;
    const numBytes = 3;

    const batches = {
        newSingles: [{}],
        newGrouped: [{}],
        repeatingSingles: [{}],
        repeatingGrouped: [{}]
    }

    // chunk new singles
    let totalBytes = 0;
    for(let addr of Object.keys(classifiedData.newSingles)) {
        let recordBytes = addrBytes;
        let karma = classifiedData.newSingles[addr]

        recordBytes += (isSmallNum(karma) ? smallNumBytes : numBytes)

        if(totalBytes + recordBytes > bytesPerBatch) {
            // batch size exceeded, create new batch
            batches.newSingles.push({})
            totalBytes = 0;
        }

        let latestBatch = batches.newSingles[batches.newSingles.length - 1]
        latestBatch[addr] = karma
        totalBytes += recordBytes;
    }

    // chunk repeating singles
    totalBytes = 0;
    for(let id of Object.keys(classifiedData.repeatingSingles)) {
        let recordBytes = 0;
        let karma = classifiedData.repeatingSingles[id]

        recordBytes += (isSmallNum(karma) ? smallNumBytes : numBytes)
        recordBytes += (isSmallNum(id) ? smallNumBytes : numBytes)


        if(totalBytes + recordBytes > bytesPerBatch) {
            // batch size exceeded, create new batch
            batches.repeatingSingles.push({})
            totalBytes = 0;
        }

        let latestBatch = batches.repeatingSingles[batches.repeatingSingles.length - 1]
        latestBatch[id] = karma

        totalBytes += recordBytes;
    }

    // chunk new groups
    totalBytes = 0;
    for (let karma of Object.keys(classifiedData.newGrouped)) {
        let groupBytes = 0;
        let addresses = classifiedData.newGrouped[karma];
        groupBytes += (isSmallNum(karma) ? smallNumBytes : numBytes)
        groupBytes += (isSmallNum(addresses.length) ? smallNumBytes : numBytes)
        groupBytes += addresses.length * addrBytes;

        if(totalBytes + groupBytes > bytesPerBatch) {
            // batch size exceeded, create new batch
            batches.newGrouped.push({})
            totalBytes = 0;
        }

        let latestBatch = batches.newGrouped[batches.newGrouped.length - 1]
        latestBatch[karma] = addresses
        totalBytes += groupBytes;
    }

    // chunk repeating groups
    totalBytes = 0;
    for (let karma of Object.keys(classifiedData.repeatingGrouped)) {
        let groupBytes = 0;
        let ids = classifiedData.repeatingGrouped[karma];
        groupBytes += (isSmallNum(karma) ? smallNumBytes : numBytes)
        groupBytes += (isSmallNum(ids.length) ? smallNumBytes : numBytes)
        groupBytes += ids.reduce((acc, currValue) => {
            return acc + (isSmallNum(currValue) ? smallNumBytes : numBytes)
        });

        if(totalBytes + groupBytes > bytesPerBatch) {
            // batch size exceeded, create new batch
            batches.repeatingGrouped.push({})
            totalBytes = 0;
        }

        let latestBatch = batches.repeatingGrouped[batches.repeatingGrouped.length - 1]
        latestBatch[karma] = ids;
        totalBytes += groupBytes;
    }

    return batches;

};


const parse = async (dirPathRead, dirPathWrite, indexPath) => {

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

        // max 1000 {addr:karma} pairs
        const chunkedData = chunkData(classifiedData, 23000);

        fs.writeFileSync(`${dirPathWrite}/${file}`, JSON.stringify(chunkedData));
    }

    fs.writeFileSync(indexPath, JSON.stringify(index), 'utf-8')

}


const main = async () => {
    console.log("Parsing data...");

    const dirPathBricksRead = "reddit-data-json/bricks";
    const indexPathBricks = "reddit-data-parsed/index/bricks.json";
    const dirPathBricksWrite = "reddit-data-parsed/bricks";

    const dirPathMoonsRead = "reddit-data-json/moons";
    const indexPathMoons = "reddit-data-parsed/index/moons.json";
    const dirPathMoonsWrite = "reddit-data-parsed/moons";

    console.log("Parsing bricks data...")
    await parse(dirPathBricksRead, dirPathBricksWrite, indexPathBricks);

    console.log("Parsing moons data...")
    await parse(dirPathMoonsRead, dirPathMoonsWrite, indexPathMoons);

    console.log("Data parsed!")

};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
