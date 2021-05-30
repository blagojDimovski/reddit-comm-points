const fs = require("fs");
const csv = require('csv-parser')
const { getFileNames } = require('./utils')

const main = async () => {
    console.log("Converting data...");

    const dirPathBricksRead = "reddit-data-raw/bricks";
    const dirPathBricksWrite = "reddit-data-json/bricks";
    const indexPathBricks = "reddit-data-json/index/bricks.json";
    const dirPathMoonsRead = "reddit-data-raw/moons";
    const dirPathMoonsWrite = "reddit-data-json/moons";
    const indexPathMoons = "reddit-data-json/index/moons.json";

    console.log("Converting bricks data...")
    await convert(dirPathBricksRead, dirPathBricksWrite, indexPathBricks);

    console.log("Converting moons data...")
    await convert(dirPathMoonsRead, dirPathMoonsWrite, indexPathMoons);

    console.log("Data converted!")
};


const convert = async (dirPathRead, dirPathWrite, indexPath) => {
    let files = getFileNames(dirPathRead);
    const index = {};
    for (let file of files) {

        let data = await getCsvData(`${dirPathRead}/${file}`, index)

        let fileName = file.replace('.csv', '.json')
        fs.writeFileSync(`${dirPathWrite}/${fileName}`, JSON.stringify(data), 'utf-8')
    }

    fs.writeFileSync(indexPath, JSON.stringify(index), 'utf-8')
}

const getCsvData = (file, index) => {
    let data = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(file)
            .on('error', error => {
                reject(error);
            })
            .pipe(csv())
            .on('data', (row) => {
                if(!row['blockchain_address'] || !row['karma']) return;

                let address = row.blockchain_address;
                let karma = row.karma;
                if(!(address in index)) {
                    index[address] = Object.keys(index).length
                }

                data.push({
                    address,
                    karma
                })
            })
            .on('end', () => {
                resolve(data);
            });
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
