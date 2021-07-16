const {readFromFile, writeToFile} = require('./utils')
const {dataDirs} = require('./consts')
const fs = require('fs');


const makeComparisonTable = (encType, compressed, savings, naive) => {
    const tableRows = [];

    const naiveTitle = encType === 'rlp' ? "Base case byte size (RLP)" : "Base case byte size"

    tableRows.push(`| Distribution id | ${naiveTitle} | Compressed byte size | Saving | Saving % |`)
    tableRows.push(`| -------- | -------- | -------- | -------- | -------- |`)


    for (let distKey in naive.dists) {

        let naiveBytes = naive.dists[distKey].byteSizes.total;
        let compressedBytes = compressed.dists[distKey].byteSizes.total;
        let savingsBytes = savings['compressed_naive'].dists[distKey].byteSizes.saving;
        let savingsPercent = savings['compressed_naive'].dists[distKey].byteSizes.savingPercent.toFixed(2);
        let distId = distKey.split('_')[1];

        tableRows.push(`| ${distId} | ${naiveBytes} | ${compressedBytes} | ${savingsBytes} | ${savingsPercent} |`)

    }

    let naiveTotal = naive.global.byteSizes.total;
    let compressedTotal = compressed.global.byteSizes.total;
    let savingsTotal = savings['compressed_naive'].global.byteSizes.saving;
    let savingsPercentTotal = savings['compressed_naive'].global.byteSizes.savingPercent.toFixed(2);

    tableRows.push(`| **Total** | **${naiveTotal}** | **${compressedTotal}** | **${savingsTotal}** | **${savingsPercentTotal}** |`)

    return tableRows.join('\n');

};

const makeNaiveStatsTable = (naiveRlp, naiveNative) => {
    const tableRows = [];


    tableRows.push(`| Distribution id | Byte size  | Byte size (RLP) | Gas cost | Gas cost (RLP) |`)
    tableRows.push(`| -------- | -------- | -------- | -------- | -------- |`)


    for (let distKey in naiveRlp.dists) {

        let rlpBytes = naiveRlp.dists[distKey].byteSizes.total;
        let rlpGasCost = naiveRlp.dists[distKey].gasCosts.total;
        let nativeBytes = naiveNative.dists[distKey].byteSizes.total;
        let nativeGasCost = naiveNative.dists[distKey].gasCosts.total;
        let distId = distKey.split('_')[1];

        tableRows.push(`| ${distId} | ${nativeBytes} | ${rlpBytes} | ${nativeGasCost} | ${rlpGasCost} |`)

    }

    let rlpBytesGlobal = naiveRlp.global.byteSizes.total;
    let rlpGasCostGlobal = naiveRlp.global.gasCosts.total;
    let nativeBytesGlobal = naiveNative.global.byteSizes.total;
    let nativeGasCostGlobal = naiveNative.global.gasCosts.total;

    tableRows.push(`| **Total** | **${nativeBytesGlobal}** | **${rlpBytesGlobal}** | **${nativeGasCostGlobal}** | **${rlpGasCostGlobal}** |`)

    return tableRows.join('\n');
}

const makeTable = (argv) => {

    const dataset = argv.dataset;
    const encType = argv.encType;
    const type = argv.type;



    const compressed = readFromFile(`${dataDirs.sizeStats}/${encType}/${dataset}/compressedGasCosts.json`)
    const naive = readFromFile(`${dataDirs.sizeStats}/${encType}/${dataset}/naiveGasCosts.json`)
    const savings = readFromFile(`${dataDirs.sizeStats}/${encType}/${dataset}/savings.json`)


    const subdir = `${dataDirs.table}/${encType}/${dataset}`

    if(!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir, {recursive: true});
    }

    if(type === 'comparison') {
        console.log(`[${dataset}][${encType}] Creating comparison table...`);

        const compTable = makeComparisonTable(encType, compressed, savings, naive)
        writeToFile(`${subdir}/comparison_table.md`, compTable, false);
        console.log(`[${dataset}][${encType}] Comparison table created!`);

    } else if (type === 'naive') {

        console.log(`[${dataset}] Creating naive stats table...`);


        let naiveRlp = readFromFile(`${dataDirs.sizeStats}/rlp/${dataset}/naiveGasCosts.json`);
        let naiveNative = readFromFile(`${dataDirs.sizeStats}/native/${dataset}/naiveGasCosts.json`);

        const naiveTable = makeNaiveStatsTable(naiveRlp, naiveNative);
        writeToFile(`${subdir}/naive_stats_table.md`, naiveTable, false);

        console.log(`[${dataset}] Naive stats table created!`);


    }

};

module.exports = {
    makeTable
}