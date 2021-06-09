const fs = require("fs");
const csv = require('csv-parser')
const { getFileNames, writeData } = require('./utils')
const { dataDirs } = require('./consts')

const convertData = async (argv) => {
    const dataset = argv.dataset;

    console.log(`[${dataset}] Converting data...`);

    const dirReadPath = `${dataDirs.raw}/${dataset}`

    let convertedData = await convert(dirReadPath);

    writeData(convertedData, dataset, 'json', '')

    console.log(`[${dataset}] Data converted!`);
};


const convert = async (dirPathRead) => {
    let files = getFileNames(dirPathRead);
    const convertedData = {}
    for (let file of files) {

        let data = await getCsvData(`${dirPathRead}/${file}`)
        let fName = file.split('.')[0]

        convertedData[fName] = data;
    }
    return convertedData;
}

const getCsvData = (file) => {
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

module.exports = {
    convertData
}